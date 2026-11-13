import { describe, expect, it } from 'vitest';
import {
  REQUESTED_CATEGORIES,
  REQUESTED_PRODUCTS,
  TARGET_TENANT_ID,
  buildPlan,
  toFirestoreCategoryBody,
  toFirestoreProductBody,
  type FirestoreRawDoc,
} from '../../../../../scripts/import-pizza-khachapuri';

describe('Pizza & Khachapuri Menu Import Safety & Schema Validation', () => {
  it('defines exactly the 2 requested categories with full trilingual metadata', () => {
    expect(REQUESTED_CATEGORIES).toHaveLength(2);

    const [pizza, khachapuri] = REQUESTED_CATEGORIES;

    expect(pizza.id).toBe('cat-30-pizza');
    expect(pizza.slug).toBe('pizza');
    expect(pizza.name).toEqual({
      hy: 'Պիցցա',
      ru: 'Пицца',
      en: 'Pizza',
    });
    expect(pizza.sortOrderGrouped).toBe(62);
    expect(pizza.sortOrderAppended).toBe(300);

    expect(khachapuri.id).toBe('cat-31-khachapuri');
    expect(khachapuri.slug).toBe('khachapuri');
    expect(khachapuri.name).toEqual({
      hy: 'Խաչապուրի',
      ru: 'Хачапури',
      en: 'Khachapuri',
    });
    expect(khachapuri.sortOrderGrouped).toBe(64);
    expect(khachapuri.sortOrderAppended).toBe(310);
  });

  it('defines exactly the 9 requested products with accurate AMD prices and translations', () => {
    expect(REQUESTED_PRODUCTS).toHaveLength(9);

    const pizzaProducts = REQUESTED_PRODUCTS.filter((p) => p.categorySlug === 'pizza');
    const khachapuriProducts = REQUESTED_PRODUCTS.filter((p) => p.categorySlug === 'khachapuri');

    expect(pizzaProducts).toHaveLength(7);
    expect(khachapuriProducts).toHaveLength(2);

    // Verify all 7 pizza products match user specification
    const expectedPizzas = [
      { id: 'xutorok-item-298', hy: '4 տեսակ պանիր', ru: 'Кватро Формаджи', en: 'Quattro Formaggi', price: 4500 },
      { id: 'xutorok-item-299', hy: 'Կարբոնարա', ru: 'Карбонара', en: 'Carbonara', price: 4800 },
      { id: 'xutorok-item-300', hy: 'Պրոշուտտո', ru: 'Прошутто', en: 'Prosciutto', price: 5500 },
      { id: 'xutorok-item-301', hy: 'Կեսար', ru: 'Цезарь', en: 'Caesar', price: 5000 },
      { id: 'xutorok-item-302', hy: 'Պեպպերոնի', ru: 'Пепперони', en: 'Pepperoni', price: 3400 },
      { id: 'xutorok-item-303', hy: 'Բանջարեղենային', ru: 'Овощной', en: 'Vegetable', price: 2900 },
      { id: 'xutorok-item-304', hy: 'Մարգարիտա', ru: 'Маргарита', en: 'Margherita', price: 3000 },
    ];

    expectedPizzas.forEach((expected, i) => {
      const actual = pizzaProducts[i];
      expect(actual.id).toBe(expected.id);
      expect(actual.name.hy).toBe(expected.hy);
      expect(actual.name.ru).toBe(expected.ru);
      expect(actual.name.en).toBe(expected.en);
      expect(actual.price).toBe(expected.price);
      expect(actual.currency).toBe('AMD');
      expect(actual.sourceCategoryHy).toBe('Պիցցա');
    });

    // Verify all 2 khachapuri products match user specification
    const expectedKhachapuris = [
      { id: 'xutorok-item-305', hy: 'Իմերեթական', ru: 'Имеретинский', en: 'Imeretian', price: 3000 },
      { id: 'xutorok-item-306', hy: 'Աջարական', ru: 'Аджарский', en: 'Adjarian', price: 1500 },
    ];

    expectedKhachapuris.forEach((expected, i) => {
      const actual = khachapuriProducts[i];
      expect(actual.id).toBe(expected.id);
      expect(actual.name.hy).toBe(expected.hy);
      expect(actual.name.ru).toBe(expected.ru);
      expect(actual.name.en).toBe(expected.en);
      expect(actual.price).toBe(expected.price);
      expect(actual.currency).toBe('AMD');
      expect(actual.sourceCategoryHy).toBe('Խաչապուրի');
    });
  });

  it('enforces tenant isolation and rejects execution against unauthorized restaurants', () => {
    const emptyCats = new Map<string, FirestoreRawDoc>();
    const emptyProds = new Map<string, FirestoreRawDoc>();

    expect(() =>
      buildPlan(emptyCats, emptyProds, {
        mode: 'dry-run',
        sortOrderMode: 'grouped',
        tenantId: 'imperia-sushi',
      })
    ).toThrow(/Tenant safety check failed/);
  });

  it('correctly plans creation of all items when none exist in Firestore', () => {
    const existingCats = new Map<string, FirestoreRawDoc>();
    const existingProds = new Map<string, FirestoreRawDoc>();

    // Simulate existing salad named Caesar in another category
    existingProds.set('xutorok-item-040', {
      name: 'projects/ai-twin-conflicts/databases/(default)/documents/restaurants/xutorok/products/xutorok-item-040',
      fields: {
        id: { stringValue: 'xutorok-item-040' },
        categoryId: { stringValue: 'cat-03-salads' },
        name: {
          mapValue: {
            fields: {
              hy: { stringValue: 'Կեսար' },
              ru: { stringValue: 'Цезарь' },
              en: { stringValue: 'Caesar' },
            },
          },
        },
      },
    });

    const plan = buildPlan(existingCats, existingProds, {
      mode: 'dry-run',
      sortOrderMode: 'grouped',
      tenantId: TARGET_TENANT_ID,
    });

    expect(plan.summary.categoriesToCreate).toBe(2);
    expect(plan.summary.categoriesToSkip).toBe(0);
    expect(plan.summary.productsToCreate).toBe(9);
    expect(plan.summary.productsToSkip).toBe(0);

    // Caesar Pizza should NOT be skipped because Caesar in salads has a different category
    const caesarPizza = plan.products.find((p) => p.id === 'xutorok-item-301');
    expect(caesarPizza?.status).toBe('create');
  });

  it('safely skips already existing categories and products (idempotency)', () => {
    const existingCats = new Map<string, FirestoreRawDoc>();
    const existingProds = new Map<string, FirestoreRawDoc>();

    existingCats.set('cat-30-pizza', {
      name: 'projects/ai-twin-conflicts/databases/(default)/documents/restaurants/xutorok/categories/cat-30-pizza',
      fields: {
        id: { stringValue: 'cat-30-pizza' },
        slug: { stringValue: 'pizza' },
      },
    });

    existingProds.set('xutorok-item-298', {
      name: 'projects/ai-twin-conflicts/databases/(default)/documents/restaurants/xutorok/products/xutorok-item-298',
      fields: {
        id: { stringValue: 'xutorok-item-298' },
        categoryId: { stringValue: 'cat-30-pizza' },
        name: {
          mapValue: {
            fields: {
              hy: { stringValue: '4 տեսակ պանիր' },
              ru: { stringValue: 'Кватро Формаджи' },
              en: { stringValue: 'Quattro Formaggi' },
            },
          },
        },
      },
    });

    const plan = buildPlan(existingCats, existingProds, {
      mode: 'dry-run',
      sortOrderMode: 'grouped',
      tenantId: TARGET_TENANT_ID,
    });

    expect(plan.summary.categoriesToCreate).toBe(1);
    expect(plan.summary.categoriesToSkip).toBe(1);
    expect(plan.summary.productsToCreate).toBe(8);
    expect(plan.summary.productsToSkip).toBe(1);

    const catPizza = plan.categories.find((c) => c.slug === 'pizza');
    expect(catPizza?.status).toBe('skip_exists');

    const prodQuattro = plan.products.find((p) => p.id === 'xutorok-item-298');
    expect(prodQuattro?.status).toBe('skip_exists');
  });

  it('generates valid Firestore REST bodies conforming to security rules and schema', () => {
    const sampleCat = {
      id: 'cat-30-pizza',
      slug: 'pizza',
      name: { hy: 'Պիցցա', ru: 'Пицца', en: 'Pizza' },
      sortOrder: 62,
      status: 'create' as const,
    };

    const catBody = toFirestoreCategoryBody(sampleCat, TARGET_TENANT_ID);
    const catFields = (catBody as { fields: Record<string, Record<string, unknown>> }).fields;

    expect(catFields.restaurantId.stringValue).toBe(TARGET_TENANT_ID);
    expect(catFields.id.stringValue).toBe('cat-30-pizza');
    expect(catFields.isVisible.booleanValue).toBe(true);
    expect(catFields.sortOrder.integerValue).toBe('62');

    const sampleProd = {
      id: 'xutorok-item-300',
      categoryId: 'cat-30-pizza',
      categorySlug: 'pizza',
      name: { hy: 'Պրոշուտտո', ru: 'Прошутто', en: 'Prosciutto' },
      price: 5500,
      currency: 'AMD',
      sortOrder: 3000,
      sourceId: 300,
      status: 'create' as const,
    };

    const prodBody = toFirestoreProductBody(sampleProd, TARGET_TENANT_ID);
    const prodFields = (prodBody as { fields: Record<string, Record<string, unknown>> }).fields;

    expect(prodFields.restaurantId.stringValue).toBe(TARGET_TENANT_ID);
    expect(prodFields.id.stringValue).toBe('xutorok-item-300');
    expect(prodFields.categoryId.stringValue).toBe('cat-30-pizza');
    expect(prodFields.price.integerValue).toBe('5500');
    expect(prodFields.currency.stringValue).toBe('AMD');
    expect(prodFields.isAvailable.booleanValue).toBe(true);
    expect(prodFields.isVisible.booleanValue).toBe(true);
    expect(prodFields.isFeatured.booleanValue).toBe(false);
    expect(prodFields.imageUrl).toBeUndefined();
    expect(prodFields.imagePath).toBeUndefined();
  });
});
