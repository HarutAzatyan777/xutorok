import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import type { LocalizedText } from '../src/types';

export const TARGET_PROJECT_ID = 'ai-twin-conflicts';
export const TARGET_TENANT_ID = 'xutorok';
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${TARGET_PROJECT_ID}/databases/(default)/documents`;

export interface CategoryDefinition {
  id: string;
  slug: string;
  name: LocalizedText;
  sortOrderGrouped: number;
  sortOrderAppended: number;
}

export interface ProductDefinition {
  id: string;
  categorySlug: string;
  name: LocalizedText;
  price: number;
  currency: 'AMD';
  sortOrder: number;
  sourceId: number;
  sourceCategoryHy: string;
}

/**
 * 2 Requested Categories
 */
export const REQUESTED_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'cat-30-pizza',
    slug: 'pizza',
    name: {
      hy: 'Պիցցա',
      ru: 'Пицца',
      en: 'Pizza',
    },
    sortOrderGrouped: 62, // Positioned alongside Hot Dishes & Barbecue
    sortOrderAppended: 300, // Appended after Beer
  },
  {
    id: 'cat-31-khachapuri',
    slug: 'khachapuri',
    name: {
      hy: 'Խաչապուրի',
      ru: 'Хачапури',
      en: 'Khachapuri',
    },
    sortOrderGrouped: 64, // Positioned alongside Pizza
    sortOrderAppended: 310, // Appended after Pizza
  },
];

/**
 * 9 Requested Products
 * Prices strictly in AMD matching task specification.
 */
export const REQUESTED_PRODUCTS: ProductDefinition[] = [
  // Category: Pizza (7 products)
  {
    id: 'xutorok-item-298',
    categorySlug: 'pizza',
    name: {
      hy: '4 տեսակ պանիր',
      ru: 'Кватро Формаджи',
      en: 'Quattro Formaggi',
    },
    price: 4500,
    currency: 'AMD',
    sortOrder: 2980,
    sourceId: 298,
    sourceCategoryHy: 'Պիցցա',
  },
  {
    id: 'xutorok-item-299',
    categorySlug: 'pizza',
    name: {
      hy: 'Կարբոնարա',
      ru: 'Карбонара',
      en: 'Carbonara',
    },
    price: 4800,
    currency: 'AMD',
    sortOrder: 2990,
    sourceId: 299,
    sourceCategoryHy: 'Պիցցա',
  },
  {
    id: 'xutorok-item-300',
    categorySlug: 'pizza',
    name: {
      hy: 'Պրոշուտտո',
      ru: 'Прошутто',
      en: 'Prosciutto',
    },
    price: 5500,
    currency: 'AMD',
    sortOrder: 3000,
    sourceId: 300,
    sourceCategoryHy: 'Պիցցա',
  },
  {
    id: 'xutorok-item-301',
    categorySlug: 'pizza',
    name: {
      hy: 'Կեսար',
      ru: 'Цезарь',
      en: 'Caesar',
    },
    price: 5000,
    currency: 'AMD',
    sortOrder: 3010,
    sourceId: 301,
    sourceCategoryHy: 'Պիցցա',
  },
  {
    id: 'xutorok-item-302',
    categorySlug: 'pizza',
    name: {
      hy: 'Պեպպերոնի',
      ru: 'Пепперони',
      en: 'Pepperoni',
    },
    price: 3400,
    currency: 'AMD',
    sortOrder: 3020,
    sourceId: 302,
    sourceCategoryHy: 'Պիցցա',
  },
  {
    id: 'xutorok-item-303',
    categorySlug: 'pizza',
    name: {
      hy: 'Բանջարեղենային',
      ru: 'Овощной',
      en: 'Vegetable',
    },
    price: 2900,
    currency: 'AMD',
    sortOrder: 3030,
    sourceId: 303,
    sourceCategoryHy: 'Պիցցա',
  },
  {
    id: 'xutorok-item-304',
    categorySlug: 'pizza',
    name: {
      hy: 'Մարգարիտա',
      ru: 'Маргарита',
      en: 'Margherita',
    },
    price: 3000,
    currency: 'AMD',
    sortOrder: 3040,
    sourceId: 304,
    sourceCategoryHy: 'Պիցցա',
  },

  // Category: Khachapuri (2 products)
  {
    id: 'xutorok-item-305',
    categorySlug: 'khachapuri',
    name: {
      hy: 'Իմերեթական',
      ru: 'Имеретинский',
      en: 'Imeretian',
    },
    price: 3000,
    currency: 'AMD',
    sortOrder: 3050,
    sourceId: 305,
    sourceCategoryHy: 'Խաչապուրի',
  },
  {
    id: 'xutorok-item-306',
    categorySlug: 'khachapuri',
    name: {
      hy: 'Աջարական',
      ru: 'Аджарский',
      en: 'Adjarian',
    },
    price: 1500,
    currency: 'AMD',
    sortOrder: 3060,
    sourceId: 306,
    sourceCategoryHy: 'Խաչապուրի',
  },
];

export interface ImportOptions {
  mode: 'dry-run' | 'execute';
  sortOrderMode: 'grouped' | 'appended';
  tenantId?: string;
  projectRoot?: string;
}

export interface PlanCategoryItem {
  id: string;
  name: LocalizedText;
  slug: string;
  sortOrder: number;
  status: 'create' | 'skip_exists';
  existingId?: string;
}

export interface PlanProductItem {
  id: string;
  categoryId: string;
  categorySlug: string;
  name: LocalizedText;
  price: number;
  currency: string;
  sortOrder: number;
  sourceId: number;
  status: 'create' | 'skip_exists';
  existingId?: string;
  skipReason?: string;
}

export interface PlanResult {
  tenantId: string;
  projectId: string;
  mode: 'dry-run' | 'execute';
  sortOrderMode: 'grouped' | 'appended';
  existingCategoriesCount: number;
  existingProductsCount: number;
  categories: PlanCategoryItem[];
  products: PlanProductItem[];
  summary: {
    categoriesToCreate: number;
    categoriesToSkip: number;
    productsToCreate: number;
    productsToSkip: number;
  };
}

export interface FirestoreRawDoc {
  name: string;
  fields?: Record<string, Record<string, unknown>>;
}

export function extractStringField(
  fields: Record<string, Record<string, unknown>> | undefined,
  key: string
): string | null {
  if (!fields || !fields[key]) return null;
  const val = fields[key];
  if ('stringValue' in val && typeof val.stringValue === 'string') {
    return val.stringValue;
  }
  return null;
}

export function extractLocalizedMap(
  fields: Record<string, Record<string, unknown>> | undefined,
  key: string
): { hy: string; ru: string; en: string } {
  const result = { hy: '', ru: '', en: '' };
  if (!fields || !fields[key]) return result;
  const val = fields[key];
  if ('mapValue' in val && val.mapValue && typeof val.mapValue === 'object') {
    const subFields = (val.mapValue as { fields?: Record<string, Record<string, unknown>> }).fields;
    if (subFields) {
      result.hy = extractStringField(subFields, 'hy') ?? '';
      result.ru = extractStringField(subFields, 'ru') ?? '';
      result.en = extractStringField(subFields, 'en') ?? '';
    }
  }
  return result;
}

/**
 * Resolves an authenticated Firebase/Google OAuth token.
 * 1. Checks service-account.json in project root and mints JWT.
 * 2. Checks ~/.config/configstore/firebase-tools.json (CLI).
 * 3. Checks Windows USERPROFILE configstore.
 */
export async function getAdminAccessToken(projectRoot = process.cwd()): Promise<{ token: string; source: string }> {
  // 1. service-account.json
  const saPath = path.resolve(projectRoot, 'service-account.json');
  if (fs.existsSync(saPath)) {
    try {
      const sa = JSON.parse(fs.readFileSync(saPath, 'utf-8'));
      if (sa.client_email && sa.private_key) {
        const now = Math.floor(Date.now() / 1000);
        const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
        const claim = Buffer.from(
          JSON.stringify({
            iss: sa.client_email,
            scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore',
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600,
            iat: now,
          })
        ).toString('base64url');
        const signer = crypto.createSign('RSA-SHA256');
        signer.update(`${header}.${claim}`);
        const signature = signer.sign(sa.private_key, 'base64url');
        const jwt = `${header}.${claim}.${signature}`;

        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
        });
        if (res.ok) {
          const data = (await res.json()) as { access_token: string };
          return { token: data.access_token, source: 'service-account.json' };
        }
      }
    } catch {
      // Fall through to next auth method
    }
  }

  // 2. ~/.config/configstore/firebase-tools.json
  const candidateConfigPaths = [
    path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json'),
    path.join(process.env.USERPROFILE || '', '.config', 'configstore', 'firebase-tools.json'),
  ];

  for (const cfgPath of candidateConfigPaths) {
    if (fs.existsSync(cfgPath)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
        const tokens = cfg?.tokens;
        if (tokens?.access_token) {
          return { token: tokens.access_token, source: cfgPath };
        }
      } catch {
        // Fall through
      }
    }
  }

  throw new Error(
    'Unable to obtain authenticated administrative access token. Ensure service-account.json exists or login with `firebase login`.'
  );
}

export async function listFirestoreCollection(
  collectionPath: string,
  token: string
): Promise<Map<string, FirestoreRawDoc>> {
  const docsMap = new Map<string, FirestoreRawDoc>();
  let pageToken = '';

  while (true) {
    const url = `${FIRESTORE_BASE_URL}/${collectionPath}?pageSize=300${
      pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
    }`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404) {
      break;
    }
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to list collection "${collectionPath}" (${res.status}): ${errText}`);
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

/**
 * Builds the dry-run plan comparing requested categories and products against existing Firestore state.
 */
export function buildPlan(
  existingCategories: Map<string, FirestoreRawDoc>,
  existingProducts: Map<string, FirestoreRawDoc>,
  options: ImportOptions
): PlanResult {
  const tenantId = options.tenantId ?? TARGET_TENANT_ID;
  if (tenantId !== TARGET_TENANT_ID) {
    throw new Error(`Tenant safety check failed: target tenant must be "${TARGET_TENANT_ID}" (received "${tenantId}").`);
  }

  // 1. Plan Categories
  const plannedCategories: PlanCategoryItem[] = [];
  const categoryIdBySlug = new Map<string, string>();

  // Index existing categories by slug and by id
  const existingCategoryBySlug = new Map<string, { id: string; doc: FirestoreRawDoc }>();
  for (const [id, doc] of existingCategories.entries()) {
    const slug = extractStringField(doc.fields, 'slug') || id.replace(/^cat-\d+-/, '');
    existingCategoryBySlug.set(slug, { id, doc });
  }

  for (const reqCat of REQUESTED_CATEGORIES) {
    const existingById = existingCategories.get(reqCat.id);
    const existingBySlug = existingCategoryBySlug.get(reqCat.slug);
    const sortOrder = options.sortOrderMode === 'grouped' ? reqCat.sortOrderGrouped : reqCat.sortOrderAppended;

    if (existingById || existingBySlug) {
      const resolvedId = existingById ? reqCat.id : existingBySlug!.id;
      categoryIdBySlug.set(reqCat.slug, resolvedId);
      plannedCategories.push({
        id: resolvedId,
        slug: reqCat.slug,
        name: reqCat.name,
        sortOrder,
        status: 'skip_exists',
        existingId: resolvedId,
      });
    } else {
      categoryIdBySlug.set(reqCat.slug, reqCat.id);
      plannedCategories.push({
        id: reqCat.id,
        slug: reqCat.slug,
        name: reqCat.name,
        sortOrder,
        status: 'create',
      });
    }
  }

  // 2. Plan Products
  const plannedProducts: PlanProductItem[] = [];

  // Index existing products by categoryId + lowercase name tuple, and by doc id
  const existingProductByCategoryAndName = new Map<string, string>();
  for (const [id, doc] of existingProducts.entries()) {
    const catId = extractStringField(doc.fields, 'categoryId') || '';
    const nameMap = extractLocalizedMap(doc.fields, 'name');
    const key = `${catId}::${nameMap.hy.toLowerCase()}::${nameMap.ru.toLowerCase()}::${nameMap.en.toLowerCase()}`;
    existingProductByCategoryAndName.set(key, id);
  }

  for (const reqProd of REQUESTED_PRODUCTS) {
    const catId = categoryIdBySlug.get(reqProd.categorySlug) ?? `cat-${reqProd.categorySlug}`;
    const byId = existingProducts.get(reqProd.id);
    const categoryNameKey = `${catId}::${reqProd.name.hy.toLowerCase()}::${reqProd.name.ru.toLowerCase()}::${reqProd.name.en.toLowerCase()}`;
    const byCategoryAndName = existingProductByCategoryAndName.get(categoryNameKey);

    if (byId) {
      plannedProducts.push({
        id: reqProd.id,
        categoryId: catId,
        categorySlug: reqProd.categorySlug,
        name: reqProd.name,
        price: reqProd.price,
        currency: reqProd.currency,
        sortOrder: reqProd.sortOrder,
        sourceId: reqProd.sourceId,
        status: 'skip_exists',
        existingId: reqProd.id,
        skipReason: `Document with ID "${reqProd.id}" already exists in Firestore`,
      });
    } else if (byCategoryAndName) {
      plannedProducts.push({
        id: reqProd.id,
        categoryId: catId,
        categorySlug: reqProd.categorySlug,
        name: reqProd.name,
        price: reqProd.price,
        currency: reqProd.currency,
        sortOrder: reqProd.sortOrder,
        sourceId: reqProd.sourceId,
        status: 'skip_exists',
        existingId: byCategoryAndName,
        skipReason: `Product with identical trilingual name already exists in category "${catId}" as "${byCategoryAndName}"`,
      });
    } else {
      plannedProducts.push({
        id: reqProd.id,
        categoryId: catId,
        categorySlug: reqProd.categorySlug,
        name: reqProd.name,
        price: reqProd.price,
        currency: reqProd.currency,
        sortOrder: reqProd.sortOrder,
        sourceId: reqProd.sourceId,
        status: 'create',
      });
    }
  }

  const categoriesToCreate = plannedCategories.filter((c) => c.status === 'create').length;
  const categoriesToSkip = plannedCategories.filter((c) => c.status === 'skip_exists').length;
  const productsToCreate = plannedProducts.filter((p) => p.status === 'create').length;
  const productsToSkip = plannedProducts.filter((p) => p.status === 'skip_exists').length;

  return {
    tenantId,
    projectId: TARGET_PROJECT_ID,
    mode: options.mode,
    sortOrderMode: options.sortOrderMode,
    existingCategoriesCount: existingCategories.size,
    existingProductsCount: existingProducts.size,
    categories: plannedCategories,
    products: plannedProducts,
    summary: {
      categoriesToCreate,
      categoriesToSkip,
      productsToCreate,
      productsToSkip,
    },
  };
}

export function toFirestoreCategoryBody(cat: PlanCategoryItem, tenantId: string): Record<string, unknown> {
  return {
    fields: {
      id: { stringValue: cat.id },
      restaurantId: { stringValue: tenantId },
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
      isVisible: { booleanValue: true },
      createdAt: { timestampValue: new Date().toISOString() },
      updatedAt: { timestampValue: new Date().toISOString() },
    },
  };
}

export function toFirestoreProductBody(prod: PlanProductItem, tenantId: string): Record<string, unknown> {
  return {
    fields: {
      id: { stringValue: prod.id },
      restaurantId: { stringValue: tenantId },
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
      secondPrice: { nullValue: null },
      originalPriceText: { stringValue: String(prod.price) },
      currency: { stringValue: prod.currency },
      variants: {
        arrayValue: {
          values: [],
        },
      },
      isAvailable: { booleanValue: true },
      isVisible: { booleanValue: true },
      isFeatured: { booleanValue: false },
      sortOrder: { integerValue: String(prod.sortOrder) },
      sourceId: { integerValue: String(prod.sourceId) },
      sourceCategoryHy: { stringValue: prod.categorySlug === 'pizza' ? 'Պիցցա' : 'Խաչապուրի' },
      createdAt: { timestampValue: new Date().toISOString() },
      updatedAt: { timestampValue: new Date().toISOString() },
    },
  };
}

/**
 * Writes planned categories and products to Firestore REST API.
 */
export async function executePlanWrites(
  plan: PlanResult,
  token: string
): Promise<{
  categoriesCreated: string[];
  productsCreated: string[];
  errors: Array<{ id: string; error: string }>;
}> {
  const categoriesCreated: string[] = [];
  const productsCreated: string[] = [];
  const errors: Array<{ id: string; error: string }> = [];

  // 1. Create categories
  for (const cat of plan.categories) {
    if (cat.status !== 'create') continue;
    const url = `${FIRESTORE_BASE_URL}/restaurants/${plan.tenantId}/categories/${cat.id}`;
    const body = toFirestoreCategoryBody(cat, plan.tenantId);
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text();
        errors.push({ id: cat.id, error: `HTTP ${res.status}: ${errText}` });
      } else {
        categoriesCreated.push(cat.id);
      }
    } catch (err) {
      errors.push({ id: cat.id, error: (err as Error).message });
    }
  }

  // 2. Create products
  for (const prod of plan.products) {
    if (prod.status !== 'create') continue;
    const url = `${FIRESTORE_BASE_URL}/restaurants/${plan.tenantId}/products/${prod.id}`;
    const body = toFirestoreProductBody(prod, plan.tenantId);
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text();
        errors.push({ id: prod.id, error: `HTTP ${res.status}: ${errText}` });
      } else {
        productsCreated.push(prod.id);
      }
    } catch (err) {
      errors.push({ id: prod.id, error: (err as Error).message });
    }
  }

  return { categoriesCreated, productsCreated, errors };
}

export function formatPlanMarkdown(plan: PlanResult): string {
  const lines: string[] = [
    `# Xutorok Firebase Menu — Pizza & Khachapuri Import Plan (${plan.mode.toUpperCase()})`,
    '',
    `- **Target Firebase Project:** \`${plan.projectId}\``,
    `- **Target Restaurant Tenant:** \`${plan.tenantId}\` (\`restaurants/${plan.tenantId}\`)`,
    `- **Execution Mode:** \`${plan.mode}\``,
    `- **Category Sort Order Strategy:** \`${plan.sortOrderMode}\` (${
      plan.sortOrderMode === 'grouped'
        ? 'Pizza sortOrder=62, Khachapuri sortOrder=64 — alongside hot dishes & barbecue'
        : 'Pizza sortOrder=300, Khachapuri sortOrder=310 — appended after beer'
    })`,
    `- **Existing Firestore Categories:** **${plan.existingCategoriesCount}**`,
    `- **Existing Firestore Products:** **${plan.existingProductsCount}**`,
    '',
    '## 1. Categories Plan',
    '',
    '| ID | Slug | Armenian | Russian | English | sortOrder | Status |',
    '|---|---|---|---|---|---|---|',
  ];

  for (const c of plan.categories) {
    lines.push(
      `| \`${c.id}\` | \`${c.slug}\` | ${c.name.hy} | ${c.name.ru} | ${c.name.en} | ${c.sortOrder} | **${c.status}** |`
    );
  }

  lines.push(
    '',
    '## 2. Products Plan',
    '',
    '| ID | Category | Armenian | Russian | English | Price (AMD) | sortOrder | Status |',
    '|---|---|---|---|---|---|---|---|'
  );

  for (const p of plan.products) {
    lines.push(
      `| \`${p.id}\` | \`${p.categoryId}\` | ${p.name.hy} | ${p.name.ru} | ${p.name.en} | ${p.price} AMD | ${p.sortOrder} | **${p.status}** |`
    );
  }

  lines.push(
    '',
    '## 3. Plan Summary',
    '',
    `- **Categories to Create:** ${plan.summary.categoriesToCreate}`,
    `- **Categories to Skip (Already Exist):** ${plan.summary.categoriesToSkip}`,
    `- **Products to Create:** ${plan.summary.productsToCreate}`,
    `- **Products to Skip (Already Exist):** ${plan.summary.productsToSkip}`,
    ''
  );

  return lines.join('\n');
}

export async function runImport(options: ImportOptions) {
  console.log(`=======================================================`);
  console.log(` XUTOROK FIREBASE MENU: PIZZA & KHACHAPURI IMPORT`);
  console.log(` Mode: ${options.mode.toUpperCase()}`);
  console.log(` SortOrder Strategy: ${options.sortOrderMode}`);
  console.log(` Target Tenant: ${options.tenantId ?? TARGET_TENANT_ID}`);
  console.log(`=======================================================\n`);

  const { token, source } = await getAdminAccessToken(options.projectRoot);
  console.log(`✓ Administrative authentication resolved via: ${source}`);

  console.log(`Fetching existing categories and products from Firestore...`);
  const [existingCategories, existingProducts] = await Promise.all([
    listFirestoreCollection(`restaurants/${TARGET_TENANT_ID}/categories`, token),
    listFirestoreCollection(`restaurants/${TARGET_TENANT_ID}/products`, token),
  ]);

  console.log(`✓ Found ${existingCategories.size} existing categories and ${existingProducts.size} existing products.`);

  const plan = buildPlan(existingCategories, existingProducts, options);
  const markdown = formatPlanMarkdown(plan);
  console.log('\n' + markdown);

  // Write report to reports/
  const reportsDir = path.resolve(options.projectRoot ?? process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const reportJsonPath = path.join(reportsDir, 'pizza-khachapuri-import-plan.json');
  fs.writeFileSync(reportJsonPath, JSON.stringify(plan, null, 2), 'utf-8');
  console.log(`Plan written to: ${reportJsonPath}`);

  if (options.mode === 'dry-run') {
    console.log(`\n[DRY RUN ONLY] No writes were made to production Firestore.`);
    console.log(`To execute production writes, run with: --execute`);
    return plan;
  }

  console.log(`\n[EXECUTING PRODUCTION WRITES] Writing missing categories and products...`);
  const writeResult = await executePlanWrites(plan, token);
  console.log(`✓ Categories created: ${writeResult.categoriesCreated.length}`);
  console.log(`✓ Products created: ${writeResult.productsCreated.length}`);
  if (writeResult.errors.length > 0) {
    console.error(`✕ Errors encountered: ${writeResult.errors.length}`);
    for (const err of writeResult.errors) {
      console.error(`  - ${err.id}: ${err.error}`);
    }
  } else {
    console.log(`✓ All records written successfully without errors!`);
  }

  // Verification
  console.log(`\nVerifying live Firestore state...`);
  const [verifiedCategories, verifiedProducts] = await Promise.all([
    listFirestoreCollection(`restaurants/${TARGET_TENANT_ID}/categories`, token),
    listFirestoreCollection(`restaurants/${TARGET_TENANT_ID}/products`, token),
  ]);
  console.log(`✓ Verified live categories count: ${verifiedCategories.size}`);
  console.log(`✓ Verified live products count: ${verifiedProducts.size}`);

  return { plan, writeResult, verifiedCategoriesCount: verifiedCategories.size, verifiedProductsCount: verifiedProducts.size };
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith('import-pizza-khachapuri.ts')) {
  const args = new Set(process.argv.slice(2));
  const mode = args.has('--execute') ? 'execute' : 'dry-run';
  const sortOrderMode = args.has('--sort-order=appended') || args.has('--append-order') ? 'appended' : 'grouped';

  runImport({ mode, sortOrderMode })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Import failed:', err);
      process.exit(1);
    });
}
