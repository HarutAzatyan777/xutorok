import { z } from 'zod';
import { slugify } from '../../../lib/utils/format';
import type {
  LocalizedText,
  MenuCategory,
  MenuProduct,
  ProductVariant,
} from '../../../types';

export const rawMenuItemSchema = z.object({
  id: z.number().int().positive(),
  category_hy: z.string().trim().min(1),
  name_hy: z.string().trim().min(1),
  name_ru: z.string().trim().min(1),
  name_en: z.string().trim().min(1),
  price_amd: z.number().nonnegative(),
  second_price_amd: z.number().nonnegative().nullable().optional(),
  original_price: z.string().optional(),
  source_page: z.number().int().optional(),
});

export type RawMenuItem = z.infer<typeof rawMenuItemSchema>;

interface CategoryMeta {
  slug: string;
  name: LocalizedText;
}

/**
 * Verified trilingual dictionary for all 29 Xutorok menu categories.
 */
export const XUTOROK_CATEGORY_DICTIONARY: Record<string, CategoryMeta> = {
  'Ձվածեղներ': {
    slug: 'omelets',
    name: { hy: 'Ձվածեղներ', ru: 'Омлеты и яичница', en: 'Omelets & Eggs' },
  },
  'Նախուտեստներ': {
    slug: 'appetizers',
    name: { hy: 'Նախուտեստներ', ru: 'Закуски', en: 'Appetizers' },
  },
  'Աղցաններ': {
    slug: 'salads',
    name: { hy: 'Աղցաններ', ru: 'Салаты', en: 'Salads' },
  },
  'Ապուրներ': {
    slug: 'soups',
    name: { hy: 'Ապուրներ', ru: 'Супы', en: 'Soups' },
  },
  'Տաք ուտեստներ': {
    slug: 'hot-dishes',
    name: { hy: 'Տաք ուտեստներ', ru: 'Горячие блюда', en: 'Hot Dishes' },
  },
  'Խորոված': {
    slug: 'barbecue',
    name: { hy: 'Խորոված', ru: 'Шашлык и мангал', en: 'Barbecue & Grill' },
  },
  'Գարեջրի հետ': {
    slug: 'beer-snacks',
    name: { hy: 'Գարեջրի հետ', ru: 'К пиву', en: 'Beer Snacks' },
  },
  'Խավարտներ': {
    slug: 'side-dishes',
    name: { hy: 'Խավարտներ', ru: 'Гарниры', en: 'Side Dishes' },
  },
  'Աղանդեր': {
    slug: 'desserts',
    name: { hy: 'Աղանդեր', ru: 'Десерты', en: 'Desserts' },
  },
  'Լիմոնադ': {
    slug: 'lemonades',
    name: { hy: 'Լիմոնադ', ru: 'Лимонады', en: 'Lemonades' },
  },
  'Կոմպոտ': {
    slug: 'compote',
    name: { hy: 'Կոմպոտ', ru: 'Компоты и морсы', en: 'Compotes & Berry Drinks' },
  },
  'Զովացուցիչ ըմպելիքներ': {
    slug: 'soft-drinks',
    name: { hy: 'Զովացուցիչ ըմպելիքներ', ru: 'Прохладительные напитки', en: 'Soft Drinks' },
  },
  'Թարմ միքս': {
    slug: 'fresh-mix',
    name: { hy: 'Թարմ միքս', ru: 'Фреш-миксы', en: 'Fresh Mixes' },
  },
  'Կաթնային շեյքեր': {
    slug: 'milkshakes',
    name: { hy: 'Կաթնային շեյքեր', ru: 'Молочные коктейли', en: 'Milkshakes' },
  },
  'Թարմ քամած հյութեր': {
    slug: 'fresh-juices',
    name: { hy: 'Թարմ քամած հյութեր', ru: 'Свежевыжатые соки', en: 'Fresh Squeezed Juices' },
  },
  'Թեյ': {
    slug: 'tea',
    name: { hy: 'Թեյ', ru: 'Чай', en: 'Tea' },
  },
  'Սուրճ': {
    slug: 'coffee',
    name: { hy: 'Սուրճ', ru: 'Кофе', en: 'Coffee' },
  },
  'Կոկտեյլ': {
    slug: 'cocktails',
    name: { hy: 'Կոկտեյլ', ru: 'Коктейли', en: 'Cocktails' },
  },
  'Կոնյակ (50 մլ)': {
    slug: 'cognac',
    name: { hy: 'Կոնյակ (50 մլ)', ru: 'Коньяк (50 мл)', en: 'Cognac (50 ml)' },
  },
  'Օղի (0.5 լ / 50 մլ)': {
    slug: 'vodka',
    name: { hy: 'Օղի (0.5 լ / 50 մլ)', ru: 'Водка (0.5 л / 50 мл)', en: 'Vodka (0.5 L / 50 ml)' },
  },
  'Վիսկի (50 մլ)': {
    slug: 'whisky',
    name: { hy: 'Վիսկի (50 մլ)', ru: 'Виски (50 мл)', en: 'Whisky (50 ml)' },
  },
  'Ջին (50 մլ)': {
    slug: 'gin',
    name: { hy: 'Ջին (50 մլ)', ru: 'Джин (50 мл)', en: 'Gin (50 ml)' },
  },
  'Տեկիլա (50 մլ)': {
    slug: 'tequila',
    name: { hy: 'Տեկիլա (50 մլ)', ru: 'Текила (50 мл)', en: 'Tequila (50 ml)' },
  },
  'Ռոմ (50 մլ)': {
    slug: 'rum',
    name: { hy: 'Ռոմ (50 մլ)', ru: 'Ром (50 мл)', en: 'Rum (50 ml)' },
  },
  'Լիկյոր (50 մլ)': {
    slug: 'liqueur',
    name: { hy: 'Լիկյոր (50 մլ)', ru: 'Ликёр (50 мл)', en: 'Liqueur (50 ml)' },
  },
  'Մարտինի (50 մլ)': {
    slug: 'martini',
    name: { hy: 'Մարտինի (50 մլ)', ru: 'Мартини (50 мл)', en: 'Martini (50 ml)' },
  },
  'Գինի': {
    slug: 'wine',
    name: { hy: 'Գինի', ru: 'Вино', en: 'Wine' },
  },
  'Շամպայն': {
    slug: 'champagne',
    name: { hy: 'Շամպայն', ru: 'Шампанское', en: 'Champagne' },
  },
  'Գարեջուր': {
    slug: 'beer',
    name: { hy: 'Գարեջուր', ru: 'Пиво', en: 'Beer' },
  },
};

function buildVariantsForDualPriceItem(
  categoryHy: string,
  primaryPrice: number,
  secondPrice: number | null | undefined
): ProductVariant[] | undefined {
  if (secondPrice === null || secondPrice === undefined) {
    return undefined;
  }

  if (categoryHy.includes('0.5 լ / 50 մլ')) {
    return [
      {
        id: 'bottle-05l',
        label: { hy: '0.5 լ (Շիշ)', ru: '0.5 л (Бутылка)', en: '0.5 L (Bottle)' },
        price: primaryPrice,
        sortOrder: 1,
      },
      {
        id: 'shot-50ml',
        label: { hy: '50 մլ (Բաժակ)', ru: '50 мл (Порция)', en: '50 ml (Shot)' },
        price: secondPrice,
        sortOrder: 2,
      },
    ];
  }

  if (
    categoryHy === 'Լիմոնադ' ||
    categoryHy === 'Կոմպոտ' ||
    categoryHy === 'Զովացուցիչ ըմպելիքներ'
  ) {
    return [
      {
        id: 'glass',
        label: { hy: 'Բաժակ', ru: 'Бокал', en: 'Glass' },
        price: primaryPrice,
        sortOrder: 1,
      },
      {
        id: 'pitcher',
        label: { hy: 'Կուժ (1 լ)', ru: 'Кувшин (1 л)', en: 'Pitcher (1 L)' },
        price: secondPrice,
        sortOrder: 2,
      },
    ];
  }

  // Default for food platters/assortments (e.g. Meat assortment 8000 / 4000, Fish assortment 9000 / 4500)
  return [
    {
      id: 'full-portion',
      label: { hy: 'Մեծ բաժին', ru: 'Большая порция', en: 'Full portion' },
      price: primaryPrice,
      sortOrder: 1,
    },
    {
      id: 'half-portion',
      label: { hy: 'Փոքր բաժին', ru: 'Малая порция', en: 'Half portion' },
      price: secondPrice,
      sortOrder: 2,
    },
  ];
}

export interface MenuImportValidationIssue {
  index: number;
  rawId?: unknown;
  reason: string;
}

export interface MenuImportTransformResult {
  restaurantId: string;
  categories: MenuCategory[];
  products: MenuProduct[];
  duplicatesSkipped: Array<{ id: number; nameHy: string; categoryHy: string }>;
  validationIssues: MenuImportValidationIssue[];
}

// Highlighted signature dishes in Xutorok menu
const FEATURED_PRODUCT_IDS = new Set([10, 41, 47, 56, 76, 141, 148]);

/**
 * Deterministically transforms and validates raw Xutorok menu JSON records
 * into tenant-scoped MenuCategory and MenuProduct models for `restaurantId = "xutorok"`.
 * Preserves all original fields (id -> sourceId, second_price_amd -> secondPrice + variants,
 * original_price -> originalPriceText, source_page -> sourcePage, category_hy -> sourceCategoryHy).
 */
export function transformXutorokMenuData(
  rawItems: unknown[],
  restaurantId = 'xutorok'
): MenuImportTransformResult {
  if (restaurantId !== 'xutorok') {
    throw new Error(
      `Safety check failed: Xutorok menu data can only be imported into restaurantId="xutorok" (received "${restaurantId}").`
    );
  }

  const categoriesMap = new Map<string, MenuCategory>();
  const products: MenuProduct[] = [];
  const duplicatesSkipped: Array<{ id: number; nameHy: string; categoryHy: string }> = [];
  const validationIssues: MenuImportValidationIssue[] = [];
  const seenKeys = new Set<string>();

  rawItems.forEach((raw, idx) => {
    const parsed = rawMenuItemSchema.safeParse(raw);
    if (!parsed.success) {
      validationIssues.push({
        index: idx,
        rawId: (raw as Record<string, unknown> | null)?.id,
        reason: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      });
      return;
    }

    const item = parsed.data;
    const categoryHy = item.category_hy.trim();

    let category = categoriesMap.get(categoryHy);
    if (!category) {
      const catIndex = categoriesMap.size + 1;
      const dictEntry = XUTOROK_CATEGORY_DICTIONARY[categoryHy];
      const slug = dictEntry?.slug ?? slugify(categoryHy);
      const paddedIndex = String(catIndex).padStart(2, '0');
      const categoryId = `cat-${paddedIndex}-${slug}`;

      category = {
        id: categoryId,
        restaurantId,
        name: dictEntry?.name ?? {
          hy: categoryHy,
          ru: categoryHy,
          en: categoryHy,
        },
        slug,
        sortOrder: catIndex * 10,
        isVisible: true,
      };
      categoriesMap.set(categoryHy, category);
    }

    const dedupeKey = `${category.id}::${item.name_hy.toLowerCase()}::${item.name_ru.toLowerCase()}::${item.name_en.toLowerCase()}`;
    if (seenKeys.has(dedupeKey)) {
      duplicatesSkipped.push({
        id: item.id,
        nameHy: item.name_hy,
        categoryHy,
      });
      return;
    }
    seenKeys.add(dedupeKey);

    const productId = `xutorok-item-${String(item.id).padStart(3, '0')}`;
    const variants = buildVariantsForDualPriceItem(
      categoryHy,
      item.price_amd,
      item.second_price_amd
    );

    const product: MenuProduct = {
      id: productId,
      restaurantId,
      categoryId: category.id,
      name: {
        hy: item.name_hy.trim(),
        ru: item.name_ru.trim(),
        en: item.name_en.trim(),
      },
      price: item.price_amd,
      secondPrice: item.second_price_amd ?? null,
      originalPriceText: item.original_price ?? String(item.price_amd),
      currency: 'AMD',
      ...(variants ? { variants } : {}),
      isAvailable: true,
      isVisible: true,
      isFeatured: FEATURED_PRODUCT_IDS.has(item.id),
      sortOrder: item.id * 10,
      sourceId: item.id,
      sourcePage: item.source_page,
      sourceCategoryHy: categoryHy,
    };

    products.push(product);
  });

  return {
    restaurantId,
    categories: Array.from(categoriesMap.values()),
    products,
    duplicatesSkipped,
    validationIssues,
  };
}
