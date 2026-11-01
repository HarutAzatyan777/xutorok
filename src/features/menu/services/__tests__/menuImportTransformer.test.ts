import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { transformXutorokMenuData } from '../menuImportTransformer';
import { formatAMD, getLocalizedText, slugify } from '../../../../lib/utils/format';
import { tenantPaths } from '../../../../lib/firebase/paths';

const rawXutorokMenuData = JSON.parse(
  fs.readFileSync(
    path.resolve(process.cwd(), 'menu/Xutorok_menu_HY_RU_EN.json'),
    'utf-8'
  )
) as unknown[];

describe('Xutorok Menu Import & Multi-Tenant Data Transformations', () => {
  it('validates and transforms all 297 real Xutorok menu items and 29 categories preserving source metadata', () => {
    const result = transformXutorokMenuData(rawXutorokMenuData, 'xutorok');

    expect(result.restaurantId).toBe('xutorok');
    expect(result.validationIssues).toHaveLength(0);
    expect(result.duplicatesSkipped).toHaveLength(0);
    expect(result.categories).toHaveLength(29);
    expect(result.products).toHaveLength(297);

    // Every category has non-empty hy, ru, en names and restaurantId === 'xutorok'
    for (const cat of result.categories) {
      expect(cat.restaurantId).toBe('xutorok');
      expect(cat.name.hy.length).toBeGreaterThan(0);
      expect(cat.name.ru.length).toBeGreaterThan(0);
      expect(cat.name.en.length).toBeGreaterThan(0);
      expect(cat.isVisible).toBe(true);
    }

    // Dual-price items have structured variants and preserved secondPrice / originalPriceText
    const withVariants = result.products.filter(
      (p) => p.variants && p.variants.length > 0
    );
    expect(withVariants).toHaveLength(39);

    const meatAssortment = result.products.find((p) => p.id === 'xutorok-item-009');
    expect(meatAssortment).toBeDefined();
    expect(meatAssortment?.price).toBe(8000);
    expect(meatAssortment?.secondPrice).toBe(4000);
    expect(meatAssortment?.originalPriceText).toBe('8000 / 4000');
    expect(meatAssortment?.sourceId).toBe(9);
    expect(meatAssortment?.sourcePage).toBe(3);
    expect(meatAssortment?.sourceCategoryHy).toBe('Նախուտեստներ');
    expect(meatAssortment?.variants).toHaveLength(2);
    expect(meatAssortment?.variants?.[0].price).toBe(8000);
    expect(meatAssortment?.variants?.[1].price).toBe(4000);
  });

  it('detects and skips duplicate items within the same category', () => {
    const sample = [
      {
        id: 1,
        category_hy: 'Ձվածեղներ',
        name_hy: 'Ձվածեղ լոլիկով',
        name_ru: 'Омлет с помидорами',
        name_en: 'Omelet with tomatoes',
        price_amd: 1400,
        second_price_amd: null,
      },
      {
        id: 2,
        category_hy: 'Ձվածեղներ',
        name_hy: 'Ձվածեղ լոլիկով',
        name_ru: 'Омлет с помидорами',
        name_en: 'Omelet with tomatoes',
        price_amd: 1400,
        second_price_amd: null,
      },
    ];

    const result = transformXutorokMenuData(sample, 'xutorok');
    expect(result.products).toHaveLength(1);
    expect(result.duplicatesSkipped).toHaveLength(1);
    expect(result.duplicatesSkipped[0].id).toBe(2);
  });

  it('enforces tenant isolation by rejecting Xutorok import into another restaurantId', () => {
    expect(() => transformXutorokMenuData([], 'other-restaurant')).toThrow(
      /Xutorok menu data can only be imported into restaurantId="xutorok"/
    );
  });

  it('generates tenant-scoped Firestore and Storage paths accurately', () => {
    expect(tenantPaths.categoriesCollection('xutorok')).toBe(
      'restaurants/xutorok/categories'
    );
    expect(tenantPaths.productDoc('item-1', 'bistro-yerevan')).toBe(
      'restaurants/bistro-yerevan/products/item-1'
    );
    expect(tenantPaths.memberDoc('uid-123', 'xutorok')).toBe(
      'restaurants/xutorok/members/uid-123'
    );
    expect(tenantPaths.storageFilePath('products', 'dish.webp', 'xutorok')).toBe(
      'restaurants/xutorok/products/dish.webp'
    );
  });

  it('formats AMD currency and resolves localized strings with fallback', () => {
    expect(formatAMD(3500)).toContain('֏');
    expect(
      getLocalizedText({ hy: 'Բորշչ', ru: '', en: 'Borsch' }, 'ru')
    ).toBe('Բորշչ');
    expect(slugify('Կոնյակ (50 մլ)')).toBe('կոնյակ-50-մլ');
  });
});
