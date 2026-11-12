import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import type { BackupManifest } from './import-firebase';

const require = createRequire(import.meta.url);

const PROJECT_ID = 'ai-twin-conflicts';
const TENANT_ID = 'xutorok';
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

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

export async function runFirebaseImageRollback(options?: {
  execute?: boolean;
  manifestPath?: string;
  projectRoot?: string;
}): Promise<{
  mode: 'dry-run' | 'execute';
  batchId: string;
  restoredCount: number;
  failedCount: number;
}> {
  const isExecute = Boolean(options?.execute);
  const projectRoot = options?.projectRoot ?? process.cwd();
  const manifestPath =
    options?.manifestPath ??
    path.join(projectRoot, 'reports', 'xutorok-images', 'backup-manifest.json');

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Backup manifest not found at "${manifestPath}".`);
  }

  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, 'utf-8')
  ) as BackupManifest;

  if (manifest.tenantId !== TENANT_ID || manifest.projectId !== PROJECT_ID) {
    throw new Error(
      `Tenant safety violation: manifest belongs to ${manifest.projectId}/${manifest.tenantId}.`
    );
  }

  const token = await getAdminAccessToken();
  let restoredCount = 0;
  let failedCount = 0;

  for (const entry of manifest.items) {
    if (!entry.productId.startsWith('xutorok-')) {
      throw new Error(
        `Safety guard: unexpected productId "${entry.productId}" outside xutorok namespace.`
      );
    }

    if (!isExecute) {
      restoredCount++;
      continue;
    }

    const docPath = `restaurants/${TENANT_ID}/products/${entry.productId}`;
    const patchUrl =
      `${FIRESTORE_BASE_URL}/${docPath}` +
      `?updateMask.fieldPaths=imagePath` +
      `&updateMask.fieldPaths=imageUrl` +
      `&updateMask.fieldPaths=updatedAt` +
      `&currentDocument.exists=true`;

    const nowIso = new Date().toISOString();
    const fields: Record<string, unknown> = {
      imagePath: entry.previousImagePath
        ? { stringValue: entry.previousImagePath }
        : { nullValue: null },
      imageUrl: entry.previousImageUrl
        ? { stringValue: entry.previousImageUrl }
        : { nullValue: null },
      updatedAt: { timestampValue: nowIso },
    };

    const res = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });

    if (res.ok) {
      restoredCount++;
    } else {
      failedCount++;
      const errText = await res.text();
      console.error(
        `  ✗ Failed to restore ${entry.productId} (${res.status}): ${errText}`
      );
    }
  }

  return {
    mode: isExecute ? 'execute' : 'dry-run',
    batchId: manifest.batchId,
    restoredCount,
    failedCount,
  };
}

if (
  import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}` ||
  process.argv[1]?.endsWith('rollback-firebase.ts')
) {
  const args = process.argv.slice(2);
  const isExecute = args.includes('--execute');
  const manifestArg = args
    .find((a) => a.startsWith('--manifest='))
    ?.split('=')[1];

  runFirebaseImageRollback({
    execute: isExecute,
    manifestPath: manifestArg,
  })
    .then((res) => {
      console.log('==============================================================');
      console.log(
        ` XUTOROK IMAGE ROLLBACK — ${
          res.mode === 'execute' ? 'EXECUTED' : 'DRY-RUN SIMULATION'
        }`
      );
      console.log('==============================================================');
      console.log(`Target Batch ID          : ${res.batchId}`);
      console.log(`Products Restored        : ${res.restoredCount}`);
      console.log(`Failed Restorations      : ${res.failedCount}`);
      console.log('--------------------------------------------------------------');
      console.log(
        'Note: Existing and uploaded Firebase Storage objects are preserved (not deleted)'
      );
      console.log(
        'to prevent breaking any external references. After verifying rollback in the'
      );
      console.log(
        'public menu, unreferenced Storage objects under restaurants/xutorok/products/'
      );
      console.log('can be audited and removed manually if desired.');
      console.log('==============================================================');
    })
    .catch((err) => {
      console.error('[Rollback Error]', err);
      process.exit(1);
    });
}

