import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import { formatBytes } from './normalize';
import type {
  OptimizationReport,
  OptimizedImageRecord,
  ReviewDecisionsFile,
} from './types';

const require = createRequire(import.meta.url);

const PROJECT_ID = 'ai-twin-conflicts';
const TENANT_ID = 'xutorok';
const STORAGE_BUCKET = 'ai-twin-conflicts.firebasestorage.app';
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const FIREBASE_STORAGE_V0_BASE = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o`;

export interface BackupManifestEntry {
  productId: string;
  productNameHy: string;
  imageId: string;
  sourceRelativePath: string;
  optimizedLocalPath: string;
  optimizedBytes: number;
  optimizedSha256: string;
  previousImageUrl: string | null;
  previousImagePath: string | null;
  newImagePath: string;
  newImageUrl: string | null;
  status: 'planned' | 'uploaded_and_updated' | 'skipped_already_current' | 'failed';
  updatedAt: string;
  error?: string;
}

export interface BackupManifest {
  batchId: string;
  createdAt: string;
  completedAt?: string;
  mode: 'dry-run' | 'execute';
  projectId: string;
  tenantId: string;
  storageBucket: string;
  preflightChecks: {
    firestoreAccessible: boolean;
    firestoreProductCount: number;
    storageBucketAccessible: boolean;
    storageExistingTenantObjectsCount: number;
    tenantIsolationVerified: boolean;
  };
  summary: {
    totalApprovedItems: number;
    plannedUpdates: number;
    existingImagesPreservedOrSkipped: number;
    uploadedCount: number;
    firestoreUpdatedCount: number;
    failedCount: number;
    totalOptimizedBytes: number;
    totalOptimizedFormatted: string;
    durationMs: number;
  };
  items: BackupManifestEntry[];
}

async function getAdminAccessToken(): Promise<string> {
  const appData = process.env.APPDATA || '';
  const fbAuthPath = path.join(
    appData,
    'npm/node_modules/firebase-tools/lib/auth.js'
  );
  if (fs.existsSync(fbAuthPath)) {
    const fbAuth = require(fbAuthPath);
    const account = fbAuth.getGlobalDefaultAccount();
    if (account?.tokens?.refresh_token) {
      const tokenObj = await fbAuth.getAccessToken(
        account.tokens.refresh_token,
        account.tokens.scopes
      );
      if (tokenObj?.access_token) {
        return tokenObj.access_token as string;
      }
    }
  }

  const cfgPath = path.join(
    process.env.USERPROFILE || '',
    '.config/configstore/firebase-tools.json'
  );
  if (fs.existsSync(cfgPath)) {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    if (cfg?.tokens?.access_token) {
      return cfg.tokens.access_token as string;
    }
  }

  throw new Error(
    'Unable to obtain authenticated Firebase CLI administrative access token.'
  );
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 4
): Promise<Response> {
  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        if (attempt < maxRetries) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt), 8000);
          await new Promise((r) => setTimeout(r, delayMs));
          attempt++;
          continue;
        }
      }
      return res;
    } catch (err) {
      if (attempt < maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 8000);
        await new Promise((r) => setTimeout(r, delayMs));
        attempt++;
        continue;
      }
      throw err;
    }
  }
}

interface FirestoreRawDoc {
  name: string;
  fields?: Record<string, Record<string, unknown>>;
}

function extractStringField(
  fields: Record<string, Record<string, unknown>> | undefined,
  key: string
): string | null {
  const val = fields?.[key];
  if (!val) return null;
  return typeof val.stringValue === 'string' ? val.stringValue : null;
}

async function listAllXutorokProducts(
  token: string
): Promise<Map<string, FirestoreRawDoc>> {
  const map = new Map<string, FirestoreRawDoc>();
  let pageToken = '';
  while (true) {
    const url = `${FIRESTORE_BASE_URL}/restaurants/${TENANT_ID}/products?pageSize=300${
      pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
    }`;
    const res = await fetchWithRetry(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `Failed to list Firestore products (${res.status}): ${errText}`
      );
    }
    const data = (await res.json()) as {
      documents?: FirestoreRawDoc[];
      nextPageToken?: string;
    };
    for (const d of data.documents ?? []) {
      const docId = d.name.split('/').pop()!;
      map.set(docId, d);
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return map;
}

async function checkStorageBucketAndListTenantObjects(token: string): Promise<{
  accessible: boolean;
  existingObjects: Map<string, { size: number; downloadTokens?: string }>;
}> {
  const existingObjects = new Map<
    string,
    { size: number; downloadTokens?: string }
  >();
  let pageToken = '';
  while (true) {
    const url = `${FIREBASE_STORAGE_V0_BASE}?prefix=${encodeURIComponent(
      `restaurants/${TENANT_ID}/products/`
    )}&maxResults=500${
      pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
    }`;
    const res = await fetchWithRetry(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `Storage bucket preflight check failed (${res.status}): ${errText}`
      );
    }
    const data = (await res.json()) as {
      items?: Array<{ name: string; size?: string }>;
      nextPageToken?: string;
    };
    for (const item of data.items ?? []) {
      existingObjects.set(item.name, { size: Number(item.size ?? 0) });
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return { accessible: true, existingObjects };
}

async function uploadWebpToStorage(
  optItem: OptimizedImageRecord,
  token: string,
  existingObjects: Map<string, { size: number; downloadTokens?: string }>,
  projectRoot = process.cwd()
): Promise<{ imagePath: string; imageUrl: string; skippedUpload: boolean }> {
  const objectPath = optItem.proposedStoragePath;
  if (!objectPath.startsWith(`restaurants/${TENANT_ID}/products/`)) {
    throw new Error(
      `Tenant isolation violation: refused to upload to "${objectPath}".`
    );
  }

  const encodedName = encodeURIComponent(objectPath);

  // Check if identical object already exists in Storage (idempotent duplicate detection)
  if (existingObjects.has(objectPath)) {
    const metaRes = await fetchWithRetry(
      `${FIREBASE_STORAGE_V0_BASE}/${encodedName}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (metaRes.ok) {
      const meta = (await metaRes.json()) as {
        size?: string;
        downloadTokens?: string;
        metadata?: Record<string, string>;
      };
      if (
        Number(meta.size) === optItem.optimizedBytes &&
        meta.downloadTokens
      ) {
        const firstToken = meta.downloadTokens.split(',')[0];
        const imageUrl = `${FIREBASE_STORAGE_V0_BASE}/${encodedName}?alt=media&token=${firstToken}`;
        return { imagePath: objectPath, imageUrl, skippedUpload: true };
      }
    }
  }

  const localOptimizedPath = fs.existsSync(optItem.optimizedAbsolutePath)
    ? optItem.optimizedAbsolutePath
    : path.join(
        projectRoot,
        'reports',
        'xutorok-images',
        'optimized',
        optItem.optimizedFilename || path.basename(optItem.optimizedAbsolutePath.replace(/\\/g, '/'))
      );
  const fileBuffer = fs.readFileSync(localOptimizedPath);
  const downloadToken = crypto.randomUUID();

  // Upload via Google Cloud Storage / Firebase Storage v0 multipart or media upload with metadata
  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o?uploadType=media&name=${encodedName}`;
  const upRes = await fetchWithRetry(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'image/webp',
      'X-Goog-Meta-firebaseStorageDownloadTokens': downloadToken,
      'X-Goog-Meta-restaurantId': TENANT_ID,
      'X-Goog-Meta-productId': optItem.productId,
      'X-Goog-Meta-sha256': optItem.optimizedSha256,
    },
    body: fileBuffer,
  });

  if (!upRes.ok) {
    const errText = await upRes.text();
    throw new Error(
      `Storage upload failed for "${objectPath}" (${upRes.status}): ${errText}`
    );
  }

  const upData = (await upRes.json()) as { downloadTokens?: string };
  const effectiveToken =
    upData.downloadTokens?.split(',')[0] ?? downloadToken;
  const imageUrl = `${FIREBASE_STORAGE_V0_BASE}/${encodedName}?alt=media&token=${effectiveToken}`;

  return { imagePath: objectPath, imageUrl, skippedUpload: false };
}

async function updateFirestoreProductImageFields(
  productId: string,
  imagePath: string,
  imageUrl: string,
  token: string
): Promise<void> {
  const docPath = `restaurants/${TENANT_ID}/products/${productId}`;
  const patchUrl =
    `${FIRESTORE_BASE_URL}/${docPath}` +
    `?updateMask.fieldPaths=imagePath` +
    `&updateMask.fieldPaths=imageUrl` +
    `&updateMask.fieldPaths=updatedAt` +
    `&currentDocument.exists=true`;

  const nowIso = new Date().toISOString();
  const res = await fetchWithRetry(patchUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        imagePath: { stringValue: imagePath },
        imageUrl: { stringValue: imageUrl },
        updatedAt: { timestampValue: nowIso },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `Firestore targeted PATCH failed for "${docPath}" (${res.status}): ${errText}`
    );
  }
}

export async function runFirebaseImageImport(options?: {
  execute?: boolean;
  allowReplaceExisting?: boolean;
  projectRoot?: string;
}): Promise<BackupManifest> {
  const startTime = Date.now();
  const isExecute = Boolean(options?.execute);
  const allowReplace = Boolean(options?.allowReplaceExisting);
  const projectRoot = options?.projectRoot ?? process.cwd();

  const reportsDir = path.join(projectRoot, 'reports', 'xutorok-images');
  const decisionsPath = path.join(reportsDir, 'review-decisions.json');
  const optimizationPath = path.join(reportsDir, 'optimization-report.json');

  if (!fs.existsSync(decisionsPath) || !fs.existsSync(optimizationPath)) {
    throw new Error(
      'Required review-decisions.json or optimization-report.json not found. Run matcher.ts and optimize.ts first.'
    );
  }

  const decisionsFile = JSON.parse(
    fs.readFileSync(decisionsPath, 'utf-8')
  ) as ReviewDecisionsFile;
  const optimizationReport = JSON.parse(
    fs.readFileSync(optimizationPath, 'utf-8')
  ) as OptimizationReport;

  const token = await getAdminAccessToken();
  const [firestoreProducts, storagePreflight] = await Promise.all([
    listAllXutorokProducts(token),
    checkStorageBucketAndListTenantObjects(token),
  ]);

  // Verify strict tenant isolation on all fetched Firestore products
  for (const [docId, rawDoc] of firestoreProducts.entries()) {
    const docTenant = extractStringField(rawDoc.fields, 'restaurantId');
    if (docTenant !== TENANT_ID) {
      throw new Error(
        `Tenant isolation check failed on product "${docId}": expected restaurantId="${TENANT_ID}", found "${docTenant}".`
      );
    }
  }

  const batchId = `xutorok-img-batch-${new Date()
    .toISOString()
    .replace(/[:.]/g, '-')}`;
  const manifestItems: BackupManifestEntry[] = [];

  for (const optItem of optimizationReport.items) {
    const decision = decisionsFile.decisions[optItem.imageId];
    if (
      !decision ||
      decision.status !== 'approved' ||
      decision.selectedProductId !== optItem.productId
    ) {
      continue;
    }

    const existingDoc = firestoreProducts.get(optItem.productId);
    if (!existingDoc) {
      throw new Error(
        `Target product "${optItem.productId}" does not exist in restaurants/${TENANT_ID}/products.`
      );
    }

    const previousImageUrl = extractStringField(existingDoc.fields, 'imageUrl');
    const previousImagePath = extractStringField(
      existingDoc.fields,
      'imagePath'
    );

    if (
      previousImagePath === optItem.proposedStoragePath &&
      previousImageUrl
    ) {
      manifestItems.push({
        productId: optItem.productId,
        productNameHy: optItem.productNameHy,
        imageId: optItem.imageId,
        sourceRelativePath: optItem.sourceRelativePath,
        optimizedLocalPath: optItem.optimizedRelativePath,
        optimizedBytes: optItem.optimizedBytes,
        optimizedSha256: optItem.optimizedSha256,
        previousImageUrl,
        previousImagePath,
        newImagePath: optItem.proposedStoragePath,
        newImageUrl: previousImageUrl,
        status: 'skipped_already_current',
        updatedAt: new Date().toISOString(),
      });
      continue;
    }

    if (previousImageUrl && !allowReplace) {
      manifestItems.push({
        productId: optItem.productId,
        productNameHy: optItem.productNameHy,
        imageId: optItem.imageId,
        sourceRelativePath: optItem.sourceRelativePath,
        optimizedLocalPath: optItem.optimizedRelativePath,
        optimizedBytes: optItem.optimizedBytes,
        optimizedSha256: optItem.optimizedSha256,
        previousImageUrl,
        previousImagePath,
        newImagePath: optItem.proposedStoragePath,
        newImageUrl: null,
        status: 'skipped_already_current',
        updatedAt: new Date().toISOString(),
      });
      continue;
    }

    manifestItems.push({
      productId: optItem.productId,
      productNameHy: optItem.productNameHy,
      imageId: optItem.imageId,
      sourceRelativePath: optItem.sourceRelativePath,
      optimizedLocalPath: optItem.optimizedRelativePath,
      optimizedBytes: optItem.optimizedBytes,
      optimizedSha256: optItem.optimizedSha256,
      previousImageUrl,
      previousImagePath,
      newImagePath: optItem.proposedStoragePath,
      newImageUrl: null,
      status: 'planned',
      updatedAt: new Date().toISOString(),
    });
  }

  const totalOptimizedBytes = manifestItems
    .filter((i) => i.status === 'planned')
    .reduce((acc, i) => acc + i.optimizedBytes, 0);

  const manifest: BackupManifest = {
    batchId,
    createdAt: new Date().toISOString(),
    mode: isExecute ? 'execute' : 'dry-run',
    projectId: PROJECT_ID,
    tenantId: TENANT_ID,
    storageBucket: STORAGE_BUCKET,
    preflightChecks: {
      firestoreAccessible: true,
      firestoreProductCount: firestoreProducts.size,
      storageBucketAccessible: storagePreflight.accessible,
      storageExistingTenantObjectsCount: storagePreflight.existingObjects.size,
      tenantIsolationVerified: true,
    },
    summary: {
      totalApprovedItems: manifestItems.length,
      plannedUpdates: manifestItems.filter((i) => i.status === 'planned')
        .length,
      existingImagesPreservedOrSkipped: manifestItems.filter(
        (i) => i.status === 'skipped_already_current'
      ).length,
      uploadedCount: 0,
      firestoreUpdatedCount: 0,
      failedCount: 0,
      totalOptimizedBytes,
      totalOptimizedFormatted: formatBytes(totalOptimizedBytes),
      durationMs: 0,
    },
    items: manifestItems,
  };

  // Always write pre-import backup manifest before any production write
  const backupPath = path.join(reportsDir, 'backup-manifest.json');
  const batchBackupPath = path.join(
    reportsDir,
    `backup-manifest-${batchId}.json`
  );
  fs.writeFileSync(backupPath, JSON.stringify(manifest, null, 2), 'utf-8');

  if (isExecute) {
    fs.writeFileSync(
      batchBackupPath,
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );

    const optByProduct = new Map(
      optimizationReport.items.map((o) => [o.productId, o])
    );
    const plannedItems = manifest.items.filter((i) => i.status === 'planned');
    const concurrency = 4;

    for (let i = 0; i < plannedItems.length; i += concurrency) {
      const chunk = plannedItems.slice(i, i + concurrency);
      await Promise.all(
        chunk.map(async (entry) => {
          const optItem = optByProduct.get(entry.productId)!;
          try {
            const uploaded = await uploadWebpToStorage(
              optItem,
              token,
              storagePreflight.existingObjects,
              projectRoot
            );
            await updateFirestoreProductImageFields(
              entry.productId,
              uploaded.imagePath,
              uploaded.imageUrl,
              token
            );
            entry.newImageUrl = uploaded.imageUrl;
            entry.status = 'uploaded_and_updated';
            entry.updatedAt = new Date().toISOString();
            manifest.summary.uploadedCount++;
            manifest.summary.firestoreUpdatedCount++;
          } catch (err) {
            entry.status = 'failed';
            entry.error = err instanceof Error ? err.message : String(err);
            entry.updatedAt = new Date().toISOString();
            manifest.summary.failedCount++;
          }
        })
      );

      // Persist progress after each batch for safe resume support
      fs.writeFileSync(backupPath, JSON.stringify(manifest, null, 2), 'utf-8');
      fs.writeFileSync(
        batchBackupPath,
        JSON.stringify(manifest, null, 2),
        'utf-8'
      );
      console.log(
        `  ✓ Processed ${Math.min(
          i + concurrency,
          plannedItems.length
        )}/${plannedItems.length} approved images...`
      );
    }
  }

  manifest.completedAt = new Date().toISOString();
  manifest.summary.durationMs = Date.now() - startTime;
  fs.writeFileSync(backupPath, JSON.stringify(manifest, null, 2), 'utf-8');
  if (isExecute) {
    fs.writeFileSync(
      batchBackupPath,
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );
  }

  return manifest;
}

if (
  import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}` ||
  process.argv[1]?.endsWith('import-firebase.ts')
) {
  const args = new Set(process.argv.slice(2));
  const isExecute = args.has('--execute');
  const allowReplace = args.has('--allow-replace');

  runFirebaseImageImport({
    execute: isExecute,
    allowReplaceExisting: allowReplace,
  })
    .then((manifest) => {
      console.log('==============================================================');
      console.log(
        ` XUTOROK FIREBASE IMAGE IMPORT — ${
          isExecute ? 'PRODUCTION EXECUTION COMPLETE' : 'DRY-RUN PREFLIGHT & BACKUP MANIFEST'
        }`
      );
      console.log('==============================================================');
      console.log(`Batch ID                         : ${manifest.batchId}`);
      console.log(`Project / Tenant                 : ${manifest.projectId} / ${manifest.tenantId}`);
      console.log(`Storage Bucket                   : ${manifest.storageBucket}`);
      console.log(`Firestore Accessible             : ${manifest.preflightChecks.firestoreAccessible} (${manifest.preflightChecks.firestoreProductCount} products)`);
      console.log(`Storage Bucket Accessible        : ${manifest.preflightChecks.storageBucketAccessible} (${manifest.preflightChecks.storageExistingTenantObjectsCount} existing objects)`);
      console.log(`Tenant Isolation Verified        : ${manifest.preflightChecks.tenantIsolationVerified}`);
      console.log('--------------------------------------------------------------');
      console.log(`Total Approved Items             : ${manifest.summary.totalApprovedItems}`);
      console.log(`Planned Product Updates          : ${manifest.summary.plannedUpdates}`);
      console.log(`Total Optimized Upload Size      : ${manifest.summary.totalOptimizedFormatted} (${manifest.summary.totalOptimizedBytes} bytes)`);
      if (isExecute) {
        console.log(`Uploaded to Storage              : ${manifest.summary.uploadedCount}`);
        console.log(`Firestore Documents Updated      : ${manifest.summary.firestoreUpdatedCount}`);
        console.log(`Failed Operations                : ${manifest.summary.failedCount}`);
      }
      console.log(`Duration                         : ${manifest.summary.durationMs} ms`);
      console.log('--------------------------------------------------------------');
      console.log('Saved Backup Manifest: reports/xutorok-images/backup-manifest.json');
      console.log('==============================================================');
    })
    .catch((err) => {
      console.error('[Firebase Import Error]', err);
      process.exit(1);
    });
}

