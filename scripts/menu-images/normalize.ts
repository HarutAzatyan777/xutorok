import * as path from 'node:path';

export const SOURCE_IMAGES_ROOT =
  'E:\\xutarok\\photo send Diana\\menu\\2026-11-11 Xutorok menu';

export const WSL_SOURCE_IMAGES_ROOT =
  '/mnt/e/xutarok/photo send Diana/menu/2026-11-11 Xutorok menu';

export interface SourceFolderMapping {
  folderName: string;
  categoryId: string | null;
  categoryNameHy: string | null;
  isFoodCategory: boolean;
  expectedJpgCount: number;
}

export const SOURCE_FOLDER_MAPPINGS: Record<string, SourceFolderMapping> = {
  Restaurant: {
    folderName: 'Restaurant',
    categoryId: null,
    categoryNameHy: null,
    isFoodCategory: false,
    expectedJpgCount: 8,
  },
  'ԱՂԱՆԴԵՐ': {
    folderName: 'ԱՂԱՆԴԵՐ',
    categoryId: 'cat-09-desserts',
    categoryNameHy: 'Աղանդեր',
    isFoodCategory: true,
    expectedJpgCount: 8,
  },
  'ԱՂՑԱՆՆԵՐ': {
    folderName: 'ԱՂՑԱՆՆԵՐ',
    categoryId: 'cat-03-salads',
    categoryNameHy: 'Աղցաններ',
    isFoodCategory: true,
    expectedJpgCount: 15,
  },
  'ԱՊՈՒՐՆԵՐ': {
    folderName: 'ԱՊՈՒՐՆԵՐ',
    categoryId: 'cat-04-soups',
    categoryNameHy: 'Ապուրներ',
    isFoodCategory: true,
    expectedJpgCount: 9,
  },
  'ԽԱՎԱՐՏՆԵՐ': {
    folderName: 'ԽԱՎԱՐՏՆԵՐ',
    categoryId: 'cat-08-side-dishes',
    categoryNameHy: 'Խավարտներ',
    isFoodCategory: true,
    expectedJpgCount: 7,
  },
  'ԽՈՐՈՎԱԾ': {
    folderName: 'ԽՈՐՈՎԱԾ',
    categoryId: 'cat-06-barbecue',
    categoryNameHy: 'Խորոված',
    isFoodCategory: true,
    expectedJpgCount: 18,
  },
  'ՆԱԽՈՒՏԵՍՏՆԵՐ': {
    folderName: 'ՆԱԽՈՒՏԵՍՏՆԵՐ',
    categoryId: 'cat-02-appetizers',
    categoryNameHy: 'Նախուտեստներ',
    isFoodCategory: true,
    expectedJpgCount: 21,
  },
  'Պիցցա': {
    folderName: 'Պիցցա',
    categoryId: null,
    categoryNameHy: 'Պիցցա',
    isFoodCategory: true,
    expectedJpgCount: 8,
  },
  'ՏԱՔ ՈՒՏԵՍՏՆԵՐ': {
    folderName: 'ՏԱՔ ՈՒՏԵՍՏՆԵՐ',
    categoryId: 'cat-05-hot-dishes',
    categoryNameHy: 'Տաք ուտեստներ',
    isFoodCategory: true,
    expectedJpgCount: 42,
  },
};

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i >= 2 ? 2 : 1)} ${sizes[i]}`;
}

export function stripExtension(filename: string): string {
  const ext = path.extname(filename);
  return ext ? filename.slice(0, -ext.length) : filename;
}

/**
 * Normalizes Armenian and multilingual text while preserving all meaningful words and ingredients.
 * - Unicode NFC normalization
 * - Lowercase (handles Armenian uppercase Ա-Ֆ -> ա-ֆ and ligature և)
 * - Unifies en-dash (–), em-dash (—), Armenian hyphen (֊) to standard hyphen (-)
 * - Removes quote marks (« » " ' ՛ ՜ ՝)
 * - Collapses repeated whitespace
 */
export function normalizeArmenianText(input: string): string {
  return input
    .normalize('NFC')
    .replace(/\u0587/g, 'և')
    .replace(/և/g, 'և')
    .toLowerCase()
    .replace(/[\u2010-\u2015\u058A\u2212_]+/g, '-')
    .replace(/[«»"“”„'’`՛՜՝։:;!?]+/g, '')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips trailing numeric duplicate suffixes from filenames such as "-2" in "Ձկան տեսականի-2"
 * while keeping actual product names intact.
 */
export function stripTrailingDuplicateSuffix(normalizedName: string): {
  baseName: string;
  duplicateIndex: number | null;
} {
  const match = normalizedName.match(/^(.*?)-(\d+)$/);
  if (match && match[1].trim().length > 2) {
    return {
      baseName: match[1].trim(),
      duplicateIndex: Number(match[2]),
    };
  }
  return {
    baseName: normalizedName,
    duplicateIndex: null,
  };
}

/**
 * Strips trailing parenthetical portion counts from product names such as "(7 հատ)" or "(5 հատ)"
 * so "Դոլմա խաղողի թփով" matches "Դոլմա խաղողի թփով (7 հատ)" as a HIGH confidence match.
 */
export function stripPortionCountSuffix(normalizedName: string): {
  baseName: string;
  hadPortionSuffix: boolean;
} {
  const stripped = normalizedName
    .replace(/\s*\(\d+\s*(հատ|шт\.?|pcs\.?)\)\s*$/i, '')
    .trim();
  return {
    baseName: stripped,
    hadPortionSuffix: stripped !== normalizedName,
  };
}

/**
 * Applies deterministic Armenian orthographic & inflection canonicalizations
 * for known culinary terms without removing any ingredients or words:
 * - խուտորոկ -> խուտոռոկ (ր/ռ variant in restaurant name)
 * - վարեննիկներ -> վարենիկներ (double նն vs single ն)
 * - ճուտ տապակա -> ճտի տապակա (nominative vs genitive inflection)
 * - ժառկո -> տապակա (Russian loanword Жаркое -> Armenian Տապակա)
 */
export function canonicalizeArmenianCulinaryTerms(normalizedName: string): {
  canonical: string;
  appliedRules: string[];
} {
  let current = normalizedName;
  const appliedRules: string[] = [];

  if (current.includes('խուտորոկ')) {
    current = current.replace(/խուտորոկ/g, 'խուտոռոկ');
    appliedRules.push('orthographic: խուտորոկ → խուտոռոկ');
  }

  if (current.includes('վարեննիկներ')) {
    current = current.replace(/վարեննիկներ/g, 'վարենիկներ');
    appliedRules.push('orthographic: վարեննիկներ → վարենիկներ');
  }

  if (current === 'ճուտ տապակա') {
    current = 'ճտի տապակա';
    appliedRules.push('inflection: ճուտ տապակա → ճտի տապակա');
  }

  if (current.includes('ժառկո')) {
    current = current.replace(/ժառկո/g, 'տապակա');
    appliedRules.push('culinary synonym (RU Жаркое): ժառկո → տապակա');
  }

  return { canonical: current, appliedRules };
}

export function tokenizeText(text: string): string[] {
  return normalizeArmenianText(text)
    .replace(/[,()/+-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t !== 'և' && t !== 'ու');
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

export function stringSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshteinDistance(a, b);
  return Math.max(0, 1 - dist / maxLen);
}

export function tokenOverlapSimilarity(tokensA: string[], tokensB: string[]): {
  jaccard: number;
  containment: number;
  sharedTokens: string[];
} {
  if (tokensA.length === 0 || tokensB.length === 0) {
    return { jaccard: 0, containment: 0, sharedTokens: [] };
  }
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const shared: string[] = [];
  for (const t of setA) {
    if (setB.has(t)) shared.push(t);
  }
  const unionSize = new Set([...tokensA, ...tokensB]).size;
  const minSize = Math.min(setA.size, setB.size);
  return {
    jaccard: unionSize > 0 ? shared.length / unionSize : 0,
    containment: minSize > 0 ? shared.length / minSize : 0,
    sharedTokens: shared,
  };
}

export function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

