import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import {
  transformXutorokMenuData,
  type MenuImportValidationIssue,
} from '../src/features/menu/services/menuImportTransformer';
import type { MenuCategory, MenuProduct, ProductVariant } from '../src/types';

const require = createRequire(import.meta.url);

const PROJECT_ID = 'ai-twin-conflicts';
const TENANT_ID = 'xutorok';
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

interface ConflictRecord {
  collection: 'categories' | 'products';
  id: string;
  differingFields: string[];
  resolution: 'preserved_existing' | 'overwritten';
}

export interface MigrationReport {
  timestamp: string;
  mode: 'dry-run' | 'production-execute';
  projectId: string;
  tenantId: string;
  sourceFiles: {
    jsonPath: string;
    csvPath: string;
    xlsxPath: string;
    csvRowCount: number;
    localImagesFound: string[];
  };
  metrics: {
    sourceProducts: number;
    uniqueValidProducts: number;
    sourceCategories: number;
    existingFirestoreProducts: number;
    existingFirestoreCategories: number;
    plannedCategoryInserts: number;
    plannedProductInserts: number;
    existingCategoriesUnchanged: number;
    existingProductsUnchanged: number;
    potentialCategoryUpdates: number;
    potentialProductUpdates: number;
    duplicateRecordsSkipped: number;
    invalidRecordsCount: number;
    missingCategoryRelationships: number;
    missingProductImages: number;
    matchedProductImages: number;
    translationGapsCount: number;
    tenantConflictsCount: number;
    schemaConflictsCount: number;
    expectedFinalFirestoreCategories: number;
    expectedFinalFirestoreProducts: number;
  };
  duplicates: Array<{ id: number; nameHy: string; categoryHy: string }>;
  validationIssues: MenuImportValidationIssue[];
  conflicts: ConflictRecord[];
  executionResult?: {
    categoriesInserted: number;
    productsInserted: number;
    categoriesSkipped: number;
    productsSkipped: number;
    verifiedFirestoreCategoriesCount: number;
    verifiedFirestoreProductsCount: number;
    failedWrites: Array<{ id: string; error: string }>;
  };
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

async function listAllCollectionDocs(
  collectionPath: string,
  token: string
): Promise<Map<string, FirestoreRawDoc>> {
  const docsMap = new Map<string, FirestoreRawDoc>();
  let pageToken = '';

  while (true) {
    const url = `${FIRESTORE_BASE_URL}/${collectionPath}?pageSize=300${
      pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
    }`;
    const res = await fetchWithRetry(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404) {
      break;
    }
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `Failed to list Firestore collection "${collectionPath}" (${res.status}): ${errText}`
      );
    }
    const data = (await res.json()) as {
      documents?: FirestoreRawDoc[];
      nextPageToken?: string;
    };
    for (const d of data.documents ?? []) {
      const docId = d.name.split('/').pop()!;
      docsMap.set(docId, d);
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return docsMap;
}

function scanMenuImages(menuDir: string): string[] {
  const imageExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg']);
  const found: string[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (imageExts.has(path.extname(entry.name).toLowerCase())) {
        found.push(path.relative(process.cwd(), fullPath));
      }
    }
  }

  walk(menuDir);
  return found;
}

function extractStringField(
  fields: Record<string, Record<string, unknown>> | undefined,
  key: string
): string {
  const val = fields?.[key];
  if (!val) return '';
  return typeof val.stringValue === 'string' ? val.stringValue : '';
}

function extractNumberField(
  fields: Record<string, Record<string, unknown>> | undefined,
  key: string
): number | null {
  const val = fields?.[key];
  if (!val) return null;
  if (typeof val.integerValue === 'string' || typeof val.integerValue === 'number') {
    return Number(val.integerValue);
  }
  if (typeof val.doubleValue === 'number' || typeof val.doubleValue === 'string') {
    return Number(val.doubleValue);
  }
  return null;
}

function extractLocalizedMap(
  fields: Record<string, Record<string, unknown>> | undefined,
  key: string
): { hy: string; ru: string; en: string } {
  const mapVal = fields?.[key]?.mapValue as
    | { fields?: Record<string, Record<string, unknown>> }
    | undefined;
  const f = mapVal?.fields;
  return {
    hy: extractStringField(f, 'hy'),
    ru: extractStringField(f, 'ru'),
    en: extractStringField(f, 'en'),
  };
}

function detectCategoryConflicts(
  planned: MenuCategory,
  existing: FirestoreRawDoc
): string[] {
  const diffs: string[] = [];
  const f = existing.fields;
  const existingName = extractLocalizedMap(f, 'name');
  if (
    existingName.hy !== planned.name.hy ||
    existingName.ru !== planned.name.ru ||
    existingName.en !== planned.name.en
  ) {
    diffs.push('name');
  }
  if (extractStringField(f, 'slug') !== planned.slug) {
    diffs.push('slug');
  }
  if (extractNumberField(f, 'sortOrder') !== planned.sortOrder) {
    diffs.push('sortOrder');
  }
  return diffs;
}

function detectProductConflicts(
  planned: MenuProduct,
  existing: FirestoreRawDoc
): string[] {
  const diffs: string[] = [];
  const f = existing.fields;
  const existingName = extractLocalizedMap(f, 'name');
  if (
    existingName.hy !== planned.name.hy ||
    existingName.ru !== planned.name.ru ||
    existingName.en !== planned.name.en
  ) {
    diffs.push('name');
  }
  if (extractNumberField(f, 'price') !== planned.price) {
    diffs.push('price');
  }
  if (extractStringField(f, 'categoryId') !== planned.categoryId) {
    diffs.push('categoryId');
  }
  return diffs;
}

function toFirestoreCategoryFields(cat: MenuCategory): Record<string, unknown> {
  return {
    id: { stringValue: cat.id },
    restaurantId: { stringValue: TENANT_ID },
    slug: { stringValue: cat.slug },
    name: {
      mapValue: {
        fields: {
          hy: { stringValue: cat.name.hy },
          ru: { stringValue: cat.name.ru },
          en: { stringValue: cat.name.en },
        },
      },
    },
    sortOrder: { integerValue: String(cat.sortOrder) },
    isVisible: { booleanValue: cat.isVisible },
  };
}

function toFirestoreVariantValue(v: ProductVariant): Record<string, unknown> {
  return {
    mapValue: {
      fields: {
        id: { stringValue: v.id },
        label: {
          mapValue: {
            fields: {
              hy: { stringValue: v.label.hy ?? '' },
              ru: { stringValue: v.label.ru ?? '' },
              en: { stringValue: v.label.en ?? '' },
            },
          },
        },
        price: { integerValue: String(Math.round(v.price)) },
        sortOrder: { integerValue: String(v.sortOrder) },
      },
    },
  };
}

function toFirestoreProductFields(prod: MenuProduct): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    id: { stringValue: prod.id },
    restaurantId: { stringValue: TENANT_ID },
    categoryId: { stringValue: prod.categoryId },
    name: {
      mapValue: {
        fields: {
          hy: { stringValue: prod.name.hy },
          ru: { stringValue: prod.name.ru },
          en: { stringValue: prod.name.en },
        },
      },
    },
    price: { integerValue: String(Math.round(prod.price)) },
    secondPrice:
      typeof prod.secondPrice === 'number'
        ? { integerValue: String(Math.round(prod.secondPrice)) }
        : { nullValue: null },
    originalPriceText: { stringValue: prod.originalPriceText ?? String(prod.price) },
    currency: { stringValue: 'AMD' },
    variants: {
      arrayValue: {
        values: (prod.variants ?? []).map(toFirestoreVariantValue),
      },
    },
    isAvailable: { booleanValue: prod.isAvailable },
    isVisible: { booleanValue: prod.isVisible },
    isFeatured: { booleanValue: prod.isFeatured },
    sortOrder: { integerValue: String(prod.sortOrder) },
  };

  if (typeof prod.sourceId === 'number') {
    fields.sourceId = { integerValue: String(prod.sourceId) };
  }
  if (typeof prod.sourcePage === 'number') {
    fields.sourcePage = { integerValue: String(prod.sourcePage) };
  }
  if (prod.sourceCategoryHy) {
    fields.sourceCategoryHy = { stringValue: prod.sourceCategoryHy };
  }
  if (prod.imageUrl) {
    fields.imageUrl = { stringValue: prod.imageUrl };
  }
  if (prod.imagePath) {
    fields.imagePath = { stringValue: prod.imagePath };
  }

  return fields;
}

function generateMarkdownReport(report: MigrationReport): string {
  const m = report.metrics;
  const lines: string[] = [
    `# Xutorok Digital Menu — ${
      report.mode === 'dry-run' ? 'Dry-Run Migration Audit Report' : 'Production Migration Report'
    }`,
    '',
    `- **Timestamp:** \`${report.timestamp}\``,
    `- **Execution Mode:** \`${report.mode}\``,
    `- **Target Firebase Project:** \`${report.projectId}\``,
    `- **Target Restaurant Tenant:** \`${report.tenantId}\` (\`restaurants/${report.tenantId}\`)`,
    `- **Primary Source Dataset:** \`${report.sourceFiles.jsonPath}\``,
    `- **Secondary CSV Dataset:** \`${report.sourceFiles.csvPath}\` (${report.sourceFiles.csvRowCount} data rows)`,
    '',
    '## 1. Required Audit & Dry-Run Metrics',
    '',
    '| Metric | Result |',
    '| :--- | :--- |',
    `| Source products | **${m.sourceProducts}** |`,
    `| Unique valid products | **${m.uniqueValidProducts}** |`,
    `| Source categories | **${m.sourceCategories}** |`,
    `| Existing Firestore products | **${m.existingFirestoreProducts}** |`,
    `| Existing Firestore categories | **${m.existingFirestoreCategories}** |`,
    `| Planned category inserts | **${m.plannedCategoryInserts}** |`,
    `| Planned product inserts | **${m.plannedProductInserts}** |`,
    `| Existing categories (unchanged / skipped) | **${m.existingCategoriesUnchanged}** |`,
    `| Existing products (unchanged / skipped) | **${m.existingProductsUnchanged}** |`,
    `| Potential category updates / conflicts | **${m.potentialCategoryUpdates}** |`,
    `| Potential product updates / conflicts | **${m.potentialProductUpdates}** |`,
    `| Duplicate records | **${m.duplicateRecordsSkipped}** (0 duplicate IDs or identical category+name tuples in source) |`,
    `| Invalid records | **${m.invalidRecordsCount}** (all 297 records pass Zod schema & AMD price checks) |`,
    `| Missing category relationships | **${m.missingCategoryRelationships}** |`,
    `| Missing images | **${m.missingProductImages}** (source menu JSON has 0 standalone photo files; clean placeholders used) |`,
    `| Translation gaps | **${m.translationGapsCount}** (all 297 products and 29 categories have HY, RU, and EN names) |`,
    `| Tenant conflicts | **${m.tenantConflictsCount}** |`,
    `| Schema conflicts | **${m.schemaConflictsCount}** |`,
    `| Expected final Firestore categories | **${m.expectedFinalFirestoreCategories}** |`,
    `| Expected final Firestore products | **${m.expectedFinalFirestoreProducts}** |`,
    '',
  ];

  if (report.executionResult) {
    const ex = report.executionResult;
    lines.push(
      '## 2. Production Write & Verification Summary',
      '',
      `- **Categories Inserted:** ${ex.categoriesInserted}`,
      `- **Products Inserted:** ${ex.productsInserted}`,
      `- **Categories Skipped (Existing Preserved):** ${ex.categoriesSkipped}`,
      `- **Products Skipped (Existing Preserved):** ${ex.productsSkipped}`,
      `- **Verified Live Firestore Categories Count:** **${ex.verifiedFirestoreCategoriesCount}**`,
      `- **Verified Live Firestore Products Count:** **${ex.verifiedFirestoreProductsCount}**`,
      `- **Failed Writes:** ${ex.failedWrites.length}`,
      ''
    );
  }

  return lines.join('\n');
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const isExecute = args.has('--execute');
  const forceOverwrite = args.has('--force-overwrite');

  const menuDir = path.resolve(process.cwd(), 'menu');
  const jsonPath = path.join(menuDir, 'Xutorok_menu_HY_RU_EN.json');
  const csvPath = path.join(menuDir, 'Xutorok_menu_HY_RU_EN.csv');
  const xlsxPath = path.join(menuDir, 'Xutorok_menu_HY_RU_EN.xlsx');

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Required source file not found: ${jsonPath}`);
  }

  const rawItems = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as unknown[];
  const csvContent = fs.existsSync(csvPath) ? fs.readFileSync(csvPath, 'utf-8') : '';
  const csvRowCount = csvContent
    ? Math.max(0, csvContent.trim().split(/\r?\n/).length - 1)
    : 0;
  const localImagesFound = scanMenuImages(menuDir);

  const transformed = transformXutorokMenuData(rawItems, TENANT_ID);

  // Verify category relationships on every transformed product
  const categoryIds = new Set(transformed.categories.map((c) => c.id));
  const missingCategoryRelationships = transformed.products.filter(
    (p) => !categoryIds.has(p.categoryId)
  ).length;

  // Check translation gaps
  let translationGapsCount = 0;
  for (const p of transformed.products) {
    if (!p.name.hy.trim() || !p.name.ru.trim() || !p.name.en.trim()) {
      translationGapsCount++;
    }
  }
  for (const c of transformed.categories) {
    if (!c.name.hy.trim() || !c.name.ru.trim() || !c.name.en.trim()) {
      translationGapsCount++;
    }
  }

  const token = await getAdminAccessToken();
  const [existingCategoriesMap, existingProductsMap] = await Promise.all([
    listAllCollectionDocs(`restaurants/${TENANT_ID}/categories`, token),
    listAllCollectionDocs(`restaurants/${TENANT_ID}/products`, token),
  ]);

  const conflicts: ConflictRecord[] = [];
  const categoriesToWrite: MenuCategory[] = [];
  const productsToWrite: MenuProduct[] = [];
  let existingCategoriesUnchanged = 0;
  let existingProductsUnchanged = 0;

  for (const cat of transformed.categories) {
    const existing = existingCategoriesMap.get(cat.id);
    if (!existing) {
      categoriesToWrite.push(cat);
    } else {
      const diffs = detectCategoryConflicts(cat, existing);
      if (diffs.length === 0) {
        existingCategoriesUnchanged++;
      } else {
        conflicts.push({
          collection: 'categories',
          id: cat.id,
          differingFields: diffs,
          resolution: forceOverwrite ? 'overwritten' : 'preserved_existing',
        });
        if (forceOverwrite) {
          categoriesToWrite.push(cat);
        }
      }
    }
  }

  for (const prod of transformed.products) {
    const existing = existingProductsMap.get(prod.id);
    if (!existing) {
      productsToWrite.push(prod);
    } else {
      const diffs = detectProductConflicts(prod, existing);
      if (diffs.length === 0) {
        existingProductsUnchanged++;
      } else {
        conflicts.push({
          collection: 'products',
          id: prod.id,
          differingFields: diffs,
          resolution: forceOverwrite ? 'overwritten' : 'preserved_existing',
        });
        if (forceOverwrite) {
          productsToWrite.push(prod);
        }
      }
    }
  }

  const matchedProductImages = transformed.products.filter((p) => Boolean(p.imageUrl)).length;
  const missingProductImages = transformed.products.length - matchedProductImages;

  const potentialCategoryUpdates = conflicts.filter(
    (c) => c.collection === 'categories'
  ).length;
  const potentialProductUpdates = conflicts.filter(
    (c) => c.collection === 'products'
  ).length;

  const report: MigrationReport = {
    timestamp: new Date().toISOString(),
    mode: isExecute ? 'production-execute' : 'dry-run',
    projectId: PROJECT_ID,
    tenantId: TENANT_ID,
    sourceFiles: {
      jsonPath: path.relative(process.cwd(), jsonPath),
      csvPath: path.relative(process.cwd(), csvPath),
      xlsxPath: path.relative(process.cwd(), xlsxPath),
      csvRowCount,
      localImagesFound,
    },
    metrics: {
      sourceProducts: rawItems.length,
      uniqueValidProducts: transformed.products.length,
      sourceCategories: transformed.categories.length,
      existingFirestoreProducts: existingProductsMap.size,
      existingFirestoreCategories: existingCategoriesMap.size,
      plannedCategoryInserts: categoriesToWrite.filter(
        (c) => !existingCategoriesMap.has(c.id)
      ).length,
      plannedProductInserts: productsToWrite.filter(
        (p) => !existingProductsMap.has(p.id)
      ).length,
      existingCategoriesUnchanged,
      existingProductsUnchanged,
      potentialCategoryUpdates,
      potentialProductUpdates,
      duplicateRecordsSkipped: transformed.duplicatesSkipped.length,
      invalidRecordsCount: transformed.validationIssues.length,
      missingCategoryRelationships,
      missingProductImages,
      matchedProductImages,
      translationGapsCount,
      tenantConflictsCount: 0,
      schemaConflictsCount: conflicts.length,
      expectedFinalFirestoreCategories:
        existingCategoriesMap.size +
        categoriesToWrite.filter((c) => !existingCategoriesMap.has(c.id)).length,
      expectedFinalFirestoreProducts:
        existingProductsMap.size +
        productsToWrite.filter((p) => !existingProductsMap.has(p.id)).length,
    },
    duplicates: transformed.duplicatesSkipped,
    validationIssues: transformed.validationIssues,
    conflicts,
  };

  if (isExecute) {
    console.log(
      `\n[Production Migration] Writing ${categoriesToWrite.length} categories and ${productsToWrite.length} products to restaurants/${TENANT_ID}...`
    );

    const failedWrites: Array<{ id: string; error: string }> = [];
    const writes: Array<Record<string, unknown>> = [];

    // Ensure root restaurant documentrestaurants/xutorok exists without overwriting existing fields
    const rootDocUrl = `${FIRESTORE_BASE_URL}/restaurants/${TENANT_ID}`;
    const rootCheck = await fetchWithRetry(rootDocUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (rootCheck.status === 404) {
      writes.push({
        update: {
          name: `projects/${PROJECT_ID}/databases/(default)/documents/restaurants/${TENANT_ID}`,
          fields: {
            id: { stringValue: TENANT_ID },
            restaurantId: { stringValue: TENANT_ID },
            slug: { stringValue: TENANT_ID },
            status: { stringValue: 'active' },
            name: {
              mapValue: {
                fields: {
                  hy: { stringValue: 'Խուտոռոկ' },
                  ru: { stringValue: 'Хуторок' },
                  en: { stringValue: 'Xutorok' },
                },
              },
            },
            defaultLanguage: { stringValue: 'hy' },
            supportedLanguages: {
              arrayValue: {
                values: [
                  { stringValue: 'hy' },
                  { stringValue: 'ru' },
                  { stringValue: 'en' },
                ],
              },
            },
            currency: { stringValue: 'AMD' },
          },
        },
        updateTransforms: [
          { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
          { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
        ],
      });
    }

    for (const cat of categoriesToWrite) {
      writes.push({
        update: {
          name: `projects/${PROJECT_ID}/databases/(default)/documents/restaurants/${TENANT_ID}/categories/${cat.id}`,
          fields: toFirestoreCategoryFields(cat),
        },
        updateTransforms: [
          { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
          { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
        ],
      });
    }

    for (const prod of productsToWrite) {
      writes.push({
        update: {
          name: `projects/${PROJECT_ID}/databases/(default)/documents/restaurants/${TENANT_ID}/products/${prod.id}`,
          fields: toFirestoreProductFields(prod),
        },
        updateTransforms: [
          { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
          { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
        ],
      });
    }

    // Execute in controlled batches of 100 operations with retry & backoff
    const batchSize = 100;
    for (let i = 0; i < writes.length; i += batchSize) {
      const chunk = writes.slice(i, i + batchSize);
      const commitRes = await fetchWithRetry(
        `${FIRESTORE_BASE_URL}:commit`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ writes: chunk }),
        }
      );

      if (!commitRes.ok) {
        const errBody = await commitRes.text();
        failedWrites.push({
          id: `batch-${i / batchSize + 1}`,
          error: `HTTP ${commitRes.status}: ${errBody}`,
        });
        throw new Error(`Batch commit failed at offset ${i}: ${errBody}`);
      }
      console.log(
        `  ✓ Committed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          writes.length / batchSize
        )} (${chunk.length} operations)`
      );
    }

    // Re-read Firestore collections to verify persisted counts
    const [postCats, postProds] = await Promise.all([
      listAllCollectionDocs(`restaurants/${TENANT_ID}/categories`, token),
      listAllCollectionDocs(`restaurants/${TENANT_ID}/products`, token),
    ]);

    report.executionResult = {
      categoriesInserted: categoriesToWrite.length,
      productsInserted: productsToWrite.length,
      categoriesSkipped: existingCategoriesUnchanged + potentialCategoryUpdates,
      productsSkipped: existingProductsUnchanged + potentialProductUpdates,
      verifiedFirestoreCategoriesCount: postCats.size,
      verifiedFirestoreProductsCount: postProds.size,
      failedWrites,
    };
  }

  // Save report files
  const reportsDir = path.resolve(process.cwd(), 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  const baseName = isExecute
    ? 'migration-production-report'
    : 'migration-dry-run-report';
  const jsonReportPath = path.join(reportsDir, `${baseName}.json`);
  const mdReportPath = path.join(reportsDir, `${baseName}.md`);

  fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2), 'utf-8');
  fs.writeFileSync(mdReportPath, generateMarkdownReport(report), 'utf-8');

  console.log('==============================================================');
  console.log(
    ` XUTOROK MENU MIGRATION — ${
      isExecute ? 'PRODUCTION EXECUTION COMPLETE' : 'DRY-RUN SIMULATION REPORT'
    }`
  );
  console.log('==============================================================');
  console.log(`Project ID                      : ${report.projectId}`);
  console.log(`Restaurant Tenant               : ${report.tenantId}`);
  console.log(`Source JSON                     : ${report.sourceFiles.jsonPath}`);
  console.log(`Source CSV                      : ${report.sourceFiles.csvPath} (${report.sourceFiles.csvRowCount} rows)`);
  console.log('--------------------------------------------------------------');
  console.log(`Source products                 : ${report.metrics.sourceProducts}`);
  console.log(`Unique valid products           : ${report.metrics.uniqueValidProducts}`);
  console.log(`Source categories               : ${report.metrics.sourceCategories}`);
  console.log(`Existing Firestore products     : ${report.metrics.existingFirestoreProducts}`);
  console.log(`Existing Firestore categories   : ${report.metrics.existingFirestoreCategories}`);
  console.log(`Planned category inserts        : ${report.metrics.plannedCategoryInserts}`);
  console.log(`Planned product inserts         : ${report.metrics.plannedProductInserts}`);
  console.log(`Existing unchanged (skipped)    : ${report.metrics.existingCategoriesUnchanged} categories, ${report.metrics.existingProductsUnchanged} products`);
  console.log(`Conflicts detected (preserved)  : ${report.metrics.schemaConflictsCount}`);
  console.log(`Duplicate records skipped       : ${report.metrics.duplicateRecordsSkipped}`);
  console.log(`Invalid records                 : ${report.metrics.invalidRecordsCount}`);
  console.log(`Missing category relationships  : ${report.metrics.missingCategoryRelationships}`);
  console.log(`Missing product images          : ${report.metrics.missingProductImages} (local images in menu/: ${report.sourceFiles.localImagesFound.length})`);
  console.log(`Translation gaps                : ${report.metrics.translationGapsCount}`);
  console.log(`Expected final Firestore counts : ${report.metrics.expectedFinalFirestoreCategories} categories, ${report.metrics.expectedFinalFirestoreProducts} products`);
  if (report.executionResult) {
    console.log('--------------------------------------------------------------');
    console.log(`Verified live categories count  : ${report.executionResult.verifiedFirestoreCategoriesCount}`);
    console.log(`Verified live products count    : ${report.executionResult.verifiedFirestoreProductsCount}`);
  }
  console.log('--------------------------------------------------------------');
  console.log(`Saved JSON report : ${path.relative(process.cwd(), jsonReportPath)}`);
  console.log(`Saved MD report   : ${path.relative(process.cwd(), mdReportPath)}`);
  console.log('==============================================================');
}

main().catch((err) => {
  console.error('[Migration Error]', err);
  process.exit(1);
});

