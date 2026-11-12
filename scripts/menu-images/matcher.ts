import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import { transformXutorokMenuData } from '../../src/features/menu/services/menuImportTransformer';
import type { MenuCategory, MenuProduct } from '../../src/types';
import {
  canonicalizeArmenianCulinaryTerms,
  escapeCsvCell,
  normalizeArmenianText,
  stringSimilarity,
  stripPortionCountSuffix,
  stripTrailingDuplicateSuffix,
  tokenizeText,
  tokenOverlapSimilarity,
} from './normalize';
import type {
  CandidateProductMatch,
  ConflictType,
  ImageInventoryItem,
  ImageInventoryReport,
  ImageMatchResult,
  MatchConfidence,
  ReviewDecisionRecord,
  ReviewDecisionsFile,
} from './types';

const require = createRequire(import.meta.url);

const PROJECT_ID = 'ai-twin-conflicts';
const TENANT_ID = 'xutorok';
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

interface FirestoreRawDoc {
  name: string;
  fields?: Record<string, Record<string, unknown>>;
}

async function getAdminAccessToken(): Promise<string | null> {
  try {
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
  } catch {
    // Fallback to local verified menu export if token retrieval fails
  }
  return null;
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

function extractBooleanField(
  fields: Record<string, Record<string, unknown>> | undefined,
  key: string,
  defaultVal = true
): boolean {
  const val = fields?.[key];
  if (!val || typeof val.booleanValue !== 'boolean') return defaultVal;
  return val.booleanValue;
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

async function fetchLiveFirestoreCatalog(projectRoot: string): Promise<{
  source: 'live-firestore' | 'local-verified-json';
  categories: MenuCategory[];
  products: MenuProduct[];
}> {
  const jsonPath = path.join(projectRoot, 'menu', 'Xutorok_menu_HY_RU_EN.json');
  const rawItems = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as unknown[];
  const localCatalog = transformXutorokMenuData(rawItems, TENANT_ID);

  const token = await getAdminAccessToken();
  if (!token) {
    return {
      source: 'local-verified-json',
      categories: localCatalog.categories,
      products: localCatalog.products,
    };
  }

  try {
    const fetchCollection = async (colPath: string): Promise<FirestoreRawDoc[]> => {
      const docs: FirestoreRawDoc[] = [];
      let pageToken = '';
      while (true) {
        const url = `${FIRESTORE_BASE_URL}/${colPath}?pageSize=300${
          pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
        }`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as {
          documents?: FirestoreRawDoc[];
          nextPageToken?: string;
        };
        docs.push(...(data.documents ?? []));
        if (!data.nextPageToken) break;
        pageToken = data.nextPageToken;
      }
      return docs;
    };

    const [rawCats, rawProds] = await Promise.all([
      fetchCollection(`restaurants/${TENANT_ID}/categories`),
      fetchCollection(`restaurants/${TENANT_ID}/products`),
    ]);

    if (rawProds.length === 0) {
      return {
        source: 'local-verified-json',
        categories: localCatalog.categories,
        products: localCatalog.products,
      };
    }

    const categories: MenuCategory[] = rawCats
      .map((d) => {
        const id = d.name.split('/').pop()!;
        const f = d.fields;
        return {
          id,
          restaurantId: extractStringField(f, 'restaurantId') || TENANT_ID,
          name: extractLocalizedMap(f, 'name'),
          slug: extractStringField(f, 'slug') || id,
          sortOrder: extractNumberField(f, 'sortOrder') ?? 0,
          isVisible: extractBooleanField(f, 'isVisible', true),
          imageUrl: extractStringField(f, 'imageUrl') || undefined,
          imagePath: extractStringField(f, 'imagePath') || undefined,
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const products: MenuProduct[] = rawProds
      .map((d) => {
        const id = d.name.split('/').pop()!;
        const f = d.fields;
        return {
          id,
          restaurantId: extractStringField(f, 'restaurantId') || TENANT_ID,
          categoryId: extractStringField(f, 'categoryId'),
          name: extractLocalizedMap(f, 'name'),
          price: extractNumberField(f, 'price') ?? 0,
          secondPrice: extractNumberField(f, 'secondPrice'),
          originalPriceText: extractStringField(f, 'originalPriceText') || undefined,
          currency: 'AMD' as const,
          imageUrl: extractStringField(f, 'imageUrl') || undefined,
          imagePath: extractStringField(f, 'imagePath') || undefined,
          isAvailable: extractBooleanField(f, 'isAvailable', true),
          isVisible: extractBooleanField(f, 'isVisible', true),
          isFeatured: extractBooleanField(f, 'isFeatured', false),
          sortOrder: extractNumberField(f, 'sortOrder') ?? 0,
          sourceId: extractNumberField(f, 'sourceId') ?? undefined,
          sourcePage: extractNumberField(f, 'sourcePage') ?? undefined,
          sourceCategoryHy: extractStringField(f, 'sourceCategoryHy') || undefined,
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return {
      source: 'live-firestore',
      categories,
      products,
    };
  } catch {
    return {
      source: 'local-verified-json',
      categories: localCatalog.categories,
      products: localCatalog.products,
    };
  }
}

// Generic dish head-words that should NOT trigger a partial match on their own
// when the distinguishing ingredient words do not match.
const GENERIC_DISH_HEAD_WORDS = new Set([
  'վարենիկներ',
  'վարեննիկներ',
  'պելմենի',
  'բլիթներ',
  'դոլմա',
  'խորոված',
  'սթեյք',
  'կրեմ',
  'ապուր',
  'կրեմ-ապուր',
  'մածնաբրդոշ',
  'կարտոֆիլ',
  'տեսականի',
  'սեթ',
  'շոգեխաշած',
  'գառան',
  'տավարի',
  'խոզի',
  'հավի',
  'ձվածեղ',
]);

function expandCompositeFilenameQueries(normalizedFilename: string): string[] {
  // E.g. "պելմենի յուղաձկով, թունայով, սաղմոնով" ->
  // ["պելմենի յուղաձկով", "պելմենի թունայով", "պելմենի սաղմոնով"]
  if (!normalizedFilename.includes(',')) return [];
  const parts = normalizedFilename
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return [];

  const firstTokens = parts[0].split(/\s+/);
  if (firstTokens.length < 2) return [];
  const headWord = firstTokens[0];
  const expanded: string[] = [parts[0]];
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith(headWord + ' ')) {
      expanded.push(part);
    } else {
      expanded.push(`${headWord} ${part}`);
    }
  }
  return expanded;
}

function findCrossCategorySimilarProducts(
  img: ImageInventoryItem,
  allProducts: MenuProduct[],
  categoryMap: Map<string, MenuCategory>
): Array<{
  productId: string;
  nameHy: string;
  categoryNameHy: string;
  reason: string;
}> {
  const blocked: Array<{
    productId: string;
    nameHy: string;
    categoryNameHy: string;
    reason: string;
  }> = [];

  for (const prod of allProducts) {
    if (prod.categoryId === img.mappedCategoryId) continue;
    const prodNorm = normalizeArmenianText(prod.name.hy);
    if (prodNorm === img.normalizedFilename) {
      const catName = categoryMap.get(prod.categoryId)?.name.hy ?? prod.categoryId;
      blocked.push({
        productId: prod.id,
        nameHy: prod.name.hy,
        categoryNameHy: catName,
        reason: `Exact name "${prod.name.hy}" exists in unrelated category "${catName}" (${prod.categoryId}), blocked by folder category constraint "${img.sourceCategory}".`,
      });
    }
  }

  return blocked;
}

function matchSingleFoodImage(
  img: ImageInventoryItem,
  categoryProducts: MenuProduct[],
  allProducts: MenuProduct[],
  categoryMap: Map<string, MenuCategory>
): ImageMatchResult {
  const blockedCrossCategoryMatches = findCrossCategorySimilarProducts(
    img,
    allProducts,
    categoryMap
  );

  // If folder has no corresponding category in the 297-product catalog (e.g. "Պիցցա")
  if (!img.mappedCategoryId || categoryProducts.length === 0) {
    return {
      imageId: img.id,
      originalFilename: img.originalFilename,
      relativePath: img.relativePath,
      absoluteSourcePath: img.absoluteSourcePath,
      sourceCategory: img.sourceCategory,
      mappedCategoryId: img.mappedCategoryId,
      mappedCategoryNameHy: img.mappedCategoryNameHy,
      isFoodCategory: img.isFoodCategory,
      width: img.width,
      height: img.height,
      fileSizeBytes: img.fileSizeBytes,
      fileSizeFormatted: img.fileSizeFormatted,
      sha256: img.sha256,
      shortHash: img.shortHash,
      normalizedFilename: img.normalizedFilename,
      confidence: 'UNMATCHED',
      suggestedProductId: null,
      suggestedProduct: null,
      candidates: [],
      reason: `Source folder "${img.sourceCategory}" has no corresponding category or products in the existing 297-item Xutorok catalog.${
        blockedCrossCategoryMatches.length > 0
          ? ` Blocked ${blockedCrossCategoryMatches.length} cross-category homonym(s).`
          : ''
      }`,
      conflictType: 'missing_category_in_catalog',
      conflictWarning: `Category "${img.sourceCategory}" is not present in the existing 297-product Firestore menu; creating new products is prohibited.`,
      conflictingImageIds: [],
      blockedCrossCategoryMatches,
    };
  }

  const { baseName: dupStrippedName, duplicateIndex } = stripTrailingDuplicateSuffix(
    img.normalizedFilename
  );
  const { canonical: imgCanonical, appliedRules: imgCanonicalRules } =
    canonicalizeArmenianCulinaryTerms(dupStrippedName);
  const compositeQueries = expandCompositeFilenameQueries(img.normalizedFilename);

  const candidates: CandidateProductMatch[] = [];

  for (const prod of categoryProducts) {
    const catNameHy =
      categoryMap.get(prod.categoryId)?.name.hy ??
      prod.sourceCategoryHy ??
      img.mappedCategoryNameHy ??
      '';
    const prodNorm = normalizeArmenianText(prod.name.hy);
    const { baseName: prodWithoutPortion, hadPortionSuffix } =
      stripPortionCountSuffix(prodNorm);
    const { canonical: prodCanonical, appliedRules: prodCanonicalRules } =
      canonicalizeArmenianCulinaryTerms(prodWithoutPortion);

    // 1. Direct normalized exact match (without duplicate suffix)
    if (duplicateIndex === null && img.normalizedFilename === prodNorm) {
      const exactRaw = img.filenameWithoutExt.trim() === prod.name.hy.trim();
      candidates.push({
        productId: prod.id,
        sourceId: prod.sourceId,
        categoryId: prod.categoryId,
        categoryNameHy: catNameHy,
        name: prod.name,
        price: prod.price,
        secondPrice: prod.secondPrice,
        existingImageUrl: prod.imageUrl,
        existingImagePath: prod.imagePath,
        score: 1.0,
        matchType: exactRaw ? 'exact_raw_hy' : 'exact_normalized_hy',
        reason: exactRaw
          ? `Exact Armenian name match ("${prod.name.hy}") in category "${catNameHy}".`
          : `Exact normalized Armenian name match ("${img.filenameWithoutExt}" → "${prod.name.hy}") in category "${catNameHy}".`,
      });
      continue;
    }

    // 2. Duplicate suffix variant of an exact product name (e.g. "Ձկան տեսականի-2")
    if (duplicateIndex !== null && dupStrippedName === prodNorm) {
      candidates.push({
        productId: prod.id,
        sourceId: prod.sourceId,
        categoryId: prod.categoryId,
        categoryNameHy: catNameHy,
        name: prod.name,
        price: prod.price,
        secondPrice: prod.secondPrice,
        existingImageUrl: prod.imageUrl,
        existingImagePath: prod.imagePath,
        score: 0.92,
        matchType: 'duplicate_variant_suffix',
        reason: `Alternate photo variant (-${duplicateIndex}) matching "${prod.name.hy}" in category "${catNameHy}".`,
      });
      continue;
    }

    // 3. Canonical spelling / inflection / portion-count stripped match
    if (duplicateIndex === null && imgCanonical === prodCanonical) {
      const reasons: string[] = [];
      if (hadPortionSuffix) {
        reasons.push(`portion count suffix omitted in filename ("${prod.name.hy}")`);
      }
      if (imgCanonicalRules.length > 0 || prodCanonicalRules.length > 0) {
        reasons.push(...imgCanonicalRules, ...prodCanonicalRules);
      }
      candidates.push({
        productId: prod.id,
        sourceId: prod.sourceId,
        categoryId: prod.categoryId,
        categoryNameHy: catNameHy,
        name: prod.price ? prod.name : prod.name,
        price: prod.price,
        secondPrice: prod.secondPrice,
        existingImageUrl: prod.imageUrl,
        existingImagePath: prod.imagePath,
        score: 0.95,
        matchType: 'high_canonical_hy',
        reason: `Strong category-consistent match to "${prod.name.hy}" (${reasons.join('; ')}).`,
      });
      continue;
    }

    // 4. Multi-product composite filename match (e.g. "Պելմենի յուղաձկով, թունայով, սաղմոնով")
    if (compositeQueries.length > 1 && compositeQueries.includes(prodNorm)) {
      candidates.push({
        productId: prod.id,
        sourceId: prod.sourceId,
        categoryId: prod.categoryId,
        categoryNameHy: catNameHy,
        name: prod.name,
        price: prod.price,
        secondPrice: prod.secondPrice,
        existingImageUrl: prod.imageUrl,
        existingImagePath: prod.imagePath,
        score: 0.88,
        matchType: 'composite_multi_product',
        reason: `Composite filename "${img.filenameWithoutExt}" lists multiple varieties including "${prod.name.hy}".`,
      });
      continue;
    }

    // 5. Token / Partial / Word-order similarity within the same category
    const imgTokens = tokenizeText(imgCanonical);
    const prodTokens = tokenizeText(prodCanonical);
    const overlap = tokenOverlapSimilarity(imgTokens, prodTokens);
    const charSim = stringSimilarity(imgCanonical, prodCanonical);

    // Filter out shared tokens that are ONLY generic dish words (like "վարենիկներ")
    const meaningfulShared = overlap.sharedTokens.filter(
      (t) => !GENERIC_DISH_HEAD_WORDS.has(t)
    );

    // Case 5a: All tokens of one name are contained in the other AND at least 2 tokens overlap
    // (e.g. "Հավի քաբաբ" vs "Քաբաբ հավի և տավարի", or "Ուկրաինական մսի տեսականի" vs "Մսի տեսականի")
    if (overlap.containment === 1 && overlap.sharedTokens.length >= 2) {
      candidates.push({
        productId: prod.id,
        sourceId: prod.sourceId,
        categoryId: prod.categoryId,
        categoryNameHy: catNameHy,
        name: prod.name,
        price: prod.price,
        secondPrice: prod.secondPrice,
        existingImageUrl: prod.imageUrl,
        existingImagePath: prod.imagePath,
        score: Number((0.75 + overlap.jaccard * 0.15).toFixed(3)),
        matchType: 'partial_token_containment',
        reason: `Partial/word-order token containment match (${overlap.sharedTokens.join(', ')}) with "${prod.name.hy}".`,
      });
      continue;
    }

    // Case 5b: Meaningful distinctive token shared (e.g. "ուկրաինական" in "Ուկրաինական մսի տեսականի" vs "Ուկրաինական սեթ մեծ/փոքր")
    const hasLongDistinctiveToken = meaningfulShared.some((t) => t.length >= 5);
    if (
      meaningfulShared.length >= 1 &&
      (overlap.jaccard >= 0.25 || charSim >= 0.65 || (hasLongDistinctiveToken && overlap.jaccard >= 0.18))
    ) {
      candidates.push({
        productId: prod.id,
        sourceId: prod.sourceId,
        categoryId: prod.categoryId,
        categoryNameHy: catNameHy,
        name: prod.name,
        price: prod.price,
        secondPrice: prod.secondPrice,
        existingImageUrl: prod.imageUrl,
        existingImagePath: prod.imagePath,
        score: Number((0.55 + overlap.jaccard * 0.25 + charSim * 0.1).toFixed(3)),
        matchType: 'partial_meaningful_token',
        reason: `Shares distinctive keyword(s) [${meaningfulShared.join(', ')}] with "${prod.name.hy}" in category "${catNameHy}".`,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score || a.productId.localeCompare(b.productId));

  if (candidates.length === 0) {
    return {
      imageId: img.id,
      originalFilename: img.originalFilename,
      relativePath: img.relativePath,
      absoluteSourcePath: img.absoluteSourcePath,
      sourceCategory: img.sourceCategory,
      mappedCategoryId: img.mappedCategoryId,
      mappedCategoryNameHy: img.mappedCategoryNameHy,
      isFoodCategory: img.isFoodCategory,
      width: img.width,
      height: img.height,
      fileSizeBytes: img.fileSizeBytes,
      fileSizeFormatted: img.fileSizeFormatted,
      sha256: img.sha256,
      shortHash: img.shortHash,
      normalizedFilename: img.normalizedFilename,
      confidence: 'UNMATCHED',
      suggestedProductId: null,
      suggestedProduct: null,
      candidates: [],
      reason: `No reliable product match found in category "${img.mappedCategoryNameHy}" for "${img.filenameWithoutExt}".`,
      conflictType: 'none',
      conflictWarning: null,
      conflictingImageIds: [],
      blockedCrossCategoryMatches,
    };
  }

  const top = candidates[0];

  // Check if one image matched multiple products via composite filename
  const compositeMatches = candidates.filter(
    (c) => c.matchType === 'composite_multi_product'
  );
  if (compositeMatches.length > 1) {
    const namesList = compositeMatches
      .map((c) => `${c.name.hy} (${c.productId})`)
      .join(', ');
    return {
      imageId: img.id,
      originalFilename: img.originalFilename,
      relativePath: img.relativePath,
      absoluteSourcePath: img.absoluteSourcePath,
      sourceCategory: img.sourceCategory,
      mappedCategoryId: img.mappedCategoryId,
      mappedCategoryNameHy: img.mappedCategoryNameHy,
      isFoodCategory: img.isFoodCategory,
      width: img.width,
      height: img.height,
      fileSizeBytes: img.fileSizeBytes,
      fileSizeFormatted: img.fileSizeFormatted,
      sha256: img.sha256,
      shortHash: img.shortHash,
      normalizedFilename: img.normalizedFilename,
      confidence: 'REVIEW',
      suggestedProductId: top.productId,
      suggestedProduct: top,
      candidates,
      reason: top.reason,
      conflictType: 'one_image_to_multiple_products',
      conflictWarning: `One composite image matches ${compositeMatches.length} separate menu products: ${namesList}. Requires manual review decision.`,
      conflictingImageIds: [],
      blockedCrossCategoryMatches,
    };
  }

  // Classify initial confidence before cross-image conflict check
  let confidence: MatchConfidence;
  let conflictType: ConflictType = 'none';
  let conflictWarning: string | null = null;

  if (top.matchType === 'exact_raw_hy' || top.matchType === 'exact_normalized_hy') {
    confidence = 'EXACT';
  } else if (top.matchType === 'high_canonical_hy') {
    confidence = 'HIGH';
  } else {
    confidence = 'REVIEW';
    if (candidates.length > 1) {
      conflictType = 'ambiguous_candidates';
      conflictWarning = `Ambiguous match between ${candidates
        .map((c) => `"${c.name.hy}" (${c.productId})`)
        .join(' and ')}.`;
    }
  }

  return {
    imageId: img.id,
    originalFilename: img.originalFilename,
    relativePath: img.relativePath,
    absoluteSourcePath: img.absoluteSourcePath,
    sourceCategory: img.sourceCategory,
    mappedCategoryId: img.mappedCategoryId,
    mappedCategoryNameHy: img.mappedCategoryNameHy,
    isFoodCategory: img.isFoodCategory,
    width: img.width,
    height: img.height,
    fileSizeBytes: img.fileSizeBytes,
    fileSizeFormatted: img.fileSizeFormatted,
    sha256: img.sha256,
    shortHash: img.shortHash,
    normalizedFilename: img.normalizedFilename,
    confidence,
    suggestedProductId: top.productId,
    suggestedProduct: top,
    candidates,
    reason: top.reason,
    conflictType,
    conflictWarning,
    conflictingImageIds: [],
    blockedCrossCategoryMatches,
  };
}

export interface ProductMatchingReport {
  generatedAt: string;
  projectId: string;
  tenantId: string;
  catalogSource: 'live-firestore' | 'local-verified-json';
  metrics: {
    totalCatalogProducts: number;
    totalCatalogCategories: number;
    totalSourceImages: number;
    foodCategoryImages: number;
    restaurantReservedImages: number;
    exactMatches: number;
    highConfidenceMatches: number;
    unambiguousMatchesTotal: number;
    reviewAmbiguousMatches: number;
    unmatchedImages: number;
    conflictGroupsCount: number;
    blockedCrossCategoryHomonymsCount: number;
    productsWithUnambiguousMatch: number;
    productsWithoutMatch: number;
  };
  conflictsSummary: Array<{
    conflictType: ConflictType;
    productIds: string[];
    imageIds: string[];
    imagePaths: string[];
    description: string;
  }>;
  results: ImageMatchResult[];
}

export async function runProductMatcher(
  projectRoot = process.cwd()
): Promise<ProductMatchingReport> {
  const inventoryPath = path.join(
    projectRoot,
    'reports',
    'xutorok-images',
    'inventory.json'
  );
  if (!fs.existsSync(inventoryPath)) {
    throw new Error(
      `Inventory file not found at "${inventoryPath}". Run inventory.ts first.`
    );
  }

  const inventory = JSON.parse(
    fs.readFileSync(inventoryPath, 'utf-8')
  ) as ImageInventoryReport;

  const catalog = await fetchLiveFirestoreCatalog(projectRoot);
  const categoryMap = new Map<string, MenuCategory>(
    catalog.categories.map((c) => [c.id, c])
  );
  const productsByCategory = new Map<string, MenuProduct[]>();
  for (const prod of catalog.products) {
    const list = productsByCategory.get(prod.categoryId) ?? [];
    list.push(prod);
    productsByCategory.set(prod.categoryId, list);
  }

  const results: ImageMatchResult[] = [];

  for (const img of inventory.images) {
    if (!img.isFoodCategory) {
      results.push({
        imageId: img.id,
        originalFilename: img.originalFilename,
        relativePath: img.relativePath,
        absoluteSourcePath: img.absoluteSourcePath,
        sourceCategory: img.sourceCategory,
        mappedCategoryId: null,
        mappedCategoryNameHy: null,
        isFoodCategory: false,
        width: img.width,
        height: img.height,
        fileSizeBytes: img.fileSizeBytes,
        fileSizeFormatted: img.fileSizeFormatted,
        sha256: img.sha256,
        shortHash: img.shortHash,
        normalizedFilename: img.normalizedFilename,
        confidence: 'RESERVED',
        suggestedProductId: null,
        suggestedProduct: null,
        candidates: [],
        reason:
          'Reserved in "Restaurant" folder for branding, gallery, or informational pages; not automatically attached to menu products.',
        conflictType: 'none',
        conflictWarning: null,
        conflictingImageIds: [],
        blockedCrossCategoryMatches: [],
      });
      continue;
    }

    const catProds = img.mappedCategoryId
      ? productsByCategory.get(img.mappedCategoryId) ?? []
      : [];
    const matchRes = matchSingleFoodImage(
      img,
      catProds,
      catalog.products,
      categoryMap
    );
    results.push(matchRes);
  }

  // Second pass: detect when multiple images suggest the same product
  const bySuggestedProduct = new Map<string, ImageMatchResult[]>();
  for (const r of results) {
    if (!r.suggestedProductId) continue;
    const list = bySuggestedProduct.get(r.suggestedProductId) ?? [];
    list.push(r);
    bySuggestedProduct.set(r.suggestedProductId, list);
  }

  const conflictsSummary: ProductMatchingReport['conflictsSummary'] = [];

  for (const [productId, group] of bySuggestedProduct.entries()) {
    if (group.length > 1) {
      const prodName = group[0].suggestedProduct?.name.hy ?? productId;
      const imageIds = group.map((g) => g.imageId);
      const imagePaths = group.map((g) => g.relativePath);
      const warning = `${group.length} images (${group
        .map((g) => g.originalFilename)
        .join(', ')}) match the same product "${prodName}" (${productId}). Retain all candidates for review.`;

      for (const item of group) {
        item.confidence = 'REVIEW';
        item.conflictType = 'multiple_images_to_one_product';
        item.conflictWarning = warning;
        item.conflictingImageIds = imageIds.filter((id) => id !== item.imageId);
      }

      conflictsSummary.push({
        conflictType: 'multiple_images_to_one_product',
        productIds: [productId],
        imageIds,
        imagePaths,
        description: warning,
      });
    }
  }

  for (const r of results) {
    if (
      r.conflictType === 'one_image_to_multiple_products' ||
      r.conflictType === 'ambiguous_candidates'
    ) {
      conflictsSummary.push({
        conflictType: r.conflictType,
        productIds: r.candidates.map((c) => c.productId),
        imageIds: [r.imageId],
        imagePaths: [r.relativePath],
        description: r.conflictWarning ?? r.reason,
      });
    }
  }

  const foodResults = results.filter((r) => r.isFoodCategory);
  const exactMatches = foodResults.filter((r) => r.confidence === 'EXACT').length;
  const highConfidenceMatches = foodResults.filter((r) => r.confidence === 'HIGH').length;
  const reviewAmbiguousMatches = foodResults.filter(
    (r) => r.confidence === 'REVIEW'
  ).length;
  const unmatchedImages = foodResults.filter(
    (r) => r.confidence === 'UNMATCHED'
  ).length;
  const restaurantReservedImages = results.filter(
    (r) => r.confidence === 'RESERVED'
  ).length;

  const unambiguousProductIds = new Set(
    foodResults
      .filter((r) => r.confidence === 'EXACT' || r.confidence === 'HIGH')
      .map((r) => r.suggestedProductId!)
  );

  const blockedCrossCategoryHomonymsCount = foodResults.reduce(
    (acc, r) => acc + r.blockedCrossCategoryMatches.length,
    0
  );

  const report: ProductMatchingReport = {
    generatedAt: new Date().toISOString(),
    projectId: PROJECT_ID,
    tenantId: TENANT_ID,
    catalogSource: catalog.source,
    metrics: {
      totalCatalogProducts: catalog.products.length,
      totalCatalogCategories: catalog.categories.length,
      totalSourceImages: results.length,
      foodCategoryImages: foodResults.length,
      restaurantReservedImages,
      exactMatches,
      highConfidenceMatches,
      unambiguousMatchesTotal: exactMatches + highConfidenceMatches,
      reviewAmbiguousMatches,
      unmatchedImages,
      conflictGroupsCount: conflictsSummary.length,
      blockedCrossCategoryHomonymsCount,
      productsWithUnambiguousMatch: unambiguousProductIds.size,
      productsWithoutMatch: catalog.products.length - unambiguousProductIds.size,
    },
    conflictsSummary,
    results,
  };

  const outDir = path.join(projectRoot, 'reports', 'xutorok-images');
  fs.mkdirSync(outDir, { recursive: true });

  const jsonPath = path.join(outDir, 'matching-report.json');
  const csvPath = path.join(outDir, 'matching-report.csv');
  const mdPath = path.join(outDir, 'matching-report.md');
  const decisionsPath = path.join(outDir, 'review-decisions.json');

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');

  // Write CSV report
  const csvHeader = [
    'imageId',
    'relativePath',
    'originalFilename',
    'sourceCategory',
    'confidence',
    'suggestedProductId',
    'suggestedProductNameHy',
    'suggestedProductNameRu',
    'suggestedProductNameEn',
    'suggestedProductPriceAmd',
    'conflictType',
    'conflictWarning',
    'reason',
  ];
  const csvRows = [csvHeader.join(',')];
  for (const r of results) {
    csvRows.push(
      [
        r.imageId,
        r.relativePath,
        r.originalFilename,
        r.sourceCategory,
        r.confidence,
        r.suggestedProductId ?? '',
        r.suggestedProduct?.name.hy ?? '',
        r.suggestedProduct?.name.ru ?? '',
        r.suggestedProduct?.name.en ?? '',
        r.suggestedProduct?.price ?? '',
        r.conflictType,
        r.conflictWarning ?? '',
        r.reason,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }
  fs.writeFileSync(csvPath, '\uFEFF' + csvRows.join('\n') + '\n', 'utf-8');

  // Initialize or preserve review-decisions.json
  // Bulk-approve ONLY unambiguous matches (EXACT + HIGH). Never auto-approve REVIEW or UNMATCHED.
  let existingDecisions: Record<string, ReviewDecisionRecord> = {};
  if (fs.existsSync(decisionsPath)) {
    try {
      const parsed = JSON.parse(
        fs.readFileSync(decisionsPath, 'utf-8')
      ) as ReviewDecisionsFile;
      existingDecisions = parsed.decisions ?? {};
    } catch {
      existingDecisions = {};
    }
  }

  const decisions: Record<string, ReviewDecisionRecord> = {};
  const nowIso = new Date().toISOString();

  for (const r of results) {
    const prev = existingDecisions[r.imageId];
    if (prev && !prev.autoApprovedUnambiguous) {
      // Preserve manual user review decisions
      decisions[r.imageId] = prev;
      continue;
    }

    if (r.confidence === 'EXACT' || r.confidence === 'HIGH') {
      decisions[r.imageId] = {
        imageId: r.imageId,
        relativePath: r.relativePath,
        originalFilename: r.originalFilename,
        sourceCategory: r.sourceCategory,
        confidence: r.confidence,
        status: 'approved',
        selectedProductId: r.suggestedProductId,
        autoApprovedUnambiguous: true,
        notes: r.reason,
        updatedAt: nowIso,
      };
    } else if (r.confidence === 'REVIEW') {
      decisions[r.imageId] = {
        imageId: r.imageId,
        relativePath: r.relativePath,
        originalFilename: r.originalFilename,
        sourceCategory: r.sourceCategory,
        confidence: r.confidence,
        status: 'pending_review',
        selectedProductId: r.suggestedProductId,
        autoApprovedUnambiguous: false,
        notes: r.conflictWarning ?? r.reason,
        updatedAt: nowIso,
      };
    } else if (r.confidence === 'UNMATCHED') {
      decisions[r.imageId] = {
        imageId: r.imageId,
        relativePath: r.relativePath,
        originalFilename: r.originalFilename,
        sourceCategory: r.sourceCategory,
        confidence: r.confidence,
        status: 'unmatched',
        selectedProductId: null,
        autoApprovedUnambiguous: false,
        notes: r.reason,
        updatedAt: nowIso,
      };
    } else {
      decisions[r.imageId] = {
        imageId: r.imageId,
        relativePath: r.relativePath,
        originalFilename: r.originalFilename,
        sourceCategory: r.sourceCategory,
        confidence: 'RESERVED',
        status: 'reserved_branding',
        selectedProductId: null,
        autoApprovedUnambiguous: false,
        notes: r.reason,
        updatedAt: nowIso,
      };
    }
  }

  const decisionsFile: ReviewDecisionsFile = {
    version: 1,
    tenantId: TENANT_ID,
    projectId: PROJECT_ID,
    generatedAt: nowIso,
    updatedAt: nowIso,
    decisions,
  };
  fs.writeFileSync(decisionsPath, JSON.stringify(decisionsFile, null, 2), 'utf-8');

  // Generate Markdown summary
  const mdLines: string[] = [
    '# Xutorok Menu Photo Matching Report',
    '',
    `- **Generated At:** \`${report.generatedAt}\``,
    `- **Catalog Source:** \`${report.catalogSource}\` (${report.metrics.totalCatalogProducts} products across ${report.metrics.totalCatalogCategories} categories)`,
    `- **Total Source JPGs:** **${report.metrics.totalSourceImages}** (${report.metrics.foodCategoryImages} food images + ${report.metrics.restaurantReservedImages} reserved \`Restaurant\` branding images)`,
    '',
    '## 1. Matching Classification Summary',
    '',
    '| Classification | Count | Auto-Approval Policy |',
    '| :--- | ---: | :--- |',
    `| **EXACT** (Unique exact match in category) | **${report.metrics.exactMatches}** | Bulk-approved (unambiguous 1:1) |`,
    `| **HIGH** (Strong category-consistent match) | **${report.metrics.highConfidenceMatches}** | Bulk-approved (unambiguous 1:1) |`,
    `| **REVIEW** (Plausible but ambiguous / conflict) | **${report.metrics.reviewAmbiguousMatches}** | **Held for human review (NOT auto-approved)** |`,
    `| **UNMATCHED** (No corresponding product in catalog) | **${report.metrics.unmatchedImages}** | **Not matched (NOT auto-approved)** |`,
    `| **RESERVED** (\`Restaurant\` branding/gallery folder) | **${report.metrics.restaurantReservedImages}** | **Reserved (excluded from product attachment)** |`,
    `| **TOTAL** | **${report.metrics.totalSourceImages}** | **${report.metrics.unambiguousMatchesTotal} Approved Ready** |`,
    '',
    '## 2. High-Confidence (Non-Exact) Unambiguous Matches (9)',
    '',
    '| Image ID | Relative Path | Matched Product ID | Product Name (HY / RU / EN) | Match Reason |',
    '| :--- | :--- | :--- | :--- | :--- |',
    ...foodResults
      .filter((r) => r.confidence === 'HIGH')
      .map(
        (r) =>
          `| \`${r.imageId}\` | \`${r.relativePath}\` | \`${r.suggestedProductId}\` | ${r.suggestedProduct?.name.hy} / ${r.suggestedProduct?.name.ru} / ${r.suggestedProduct?.name.en} | ${r.reason} |`
      ),
    '',
    '## 3. Ambiguous / Conflict Items Requiring Review (6)',
    '',
    '| Image ID | Relative Path | Conflict Type | Candidate Product(s) | Warning / Explanation |',
    '| :--- | :--- | :--- | :--- | :--- |',
    ...foodResults
      .filter((r) => r.confidence === 'REVIEW')
      .map(
        (r) =>
          `| \`${r.imageId}\` | \`${r.relativePath}\` | \`${r.conflictType}\` | ${r.candidates
            .map((c) => `\`${c.productId}\` (${c.name.hy})`)
            .join(', ')} | ${r.conflictWarning ?? r.reason} |`
      ),
    '',
    '## 4. Unmatched Food Images (9)',
    '',
    '| Image ID | Relative Path | Source Folder | Explanation |',
    '| :--- | :--- | :--- | :--- |',
    ...foodResults
      .filter((r) => r.confidence === 'UNMATCHED')
      .map(
        (r) =>
          `| \`${r.imageId}\` | \`${r.relativePath}\` | \`${r.sourceCategory}\` | ${r.reason} |`
      ),
    '',
  ];

  fs.writeFileSync(mdPath, mdLines.join('\n'), 'utf-8');

  return report;
}

if (
  import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}` ||
  process.argv[1]?.endsWith('matcher.ts')
) {
  runProductMatcher()
    .then((report) => {
      console.log('==============================================================');
      console.log(' XUTOROK SMART PRODUCT MATCHING COMPLETE');
      console.log('==============================================================');
      console.log(`Catalog Source                  : ${report.catalogSource}`);
      console.log(`Catalog Products / Categories   : ${report.metrics.totalCatalogProducts} / ${report.metrics.totalCatalogCategories}`);
      console.log(`Total Source Images             : ${report.metrics.totalSourceImages}`);
      console.log(`Food Category Images            : ${report.metrics.foodCategoryImages}`);
      console.log(`Restaurant Reserved Images      : ${report.metrics.restaurantReservedImages}`);
      console.log('--------------------------------------------------------------');
      console.log(`EXACT Matches                   : ${report.metrics.exactMatches}`);
      console.log(`HIGH Confidence Matches         : ${report.metrics.highConfidenceMatches}`);
      console.log(`Unambiguous Total (Approved)    : ${report.metrics.unambiguousMatchesTotal}`);
      console.log(`REVIEW (Ambiguous / Conflicts)  : ${report.metrics.reviewAmbiguousMatches}`);
      console.log(`UNMATCHED Images                : ${report.metrics.unmatchedImages}`);
      console.log(`Blocked Cross-Category Homonyms : ${report.metrics.blockedCrossCategoryHomonymsCount}`);
      console.log('--------------------------------------------------------------');
      console.log('Saved: reports/xutorok-images/matching-report.json');
      console.log('Saved: reports/xutorok-images/matching-report.csv');
      console.log('Saved: reports/xutorok-images/matching-report.md');
      console.log('Saved: reports/xutorok-images/review-decisions.json');
      console.log('==============================================================');
    })
    .catch((err) => {
      console.error('[Matcher Error]', err);
      process.exit(1);
    });
}
