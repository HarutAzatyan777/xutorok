import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicLayout } from '../../../../components/layout/PublicLayout';
import { ProductCard } from '../ProductCard';
import { ProductGrid } from '../ProductGrid';
import { ProductDetailDialog } from '../ProductDetailDialog';
import { hasValidProductImage, normalizeProductImageUrl } from '../../utils/productImage';
import { formatAMD } from '../../../../lib/utils/format';
import i18n, { setAppLanguage } from '../../../../i18n';
import type { MenuCategory, MenuProduct } from '../../../../types';

function makeProduct(overrides: Partial<MenuProduct> = {}): MenuProduct {
  return {
    id: 'prod-1',
    restaurantId: 'xutorok',
    categoryId: 'cat-1',
    name: {
      hy: 'Խոզի խորոված',
      ru: 'Шашлык из свинины',
      en: 'Pork Khorovats',
    },
    description: {
      hy: 'Մատուցվում է լավաշով և սոխով',
      ru: 'Подается с лавашом и луком',
      en: 'Served with lavash and onions',
    },
    price: 3800,
    currency: 'AMD',
    isAvailable: true,
    isVisible: true,
    isFeatured: false,
    sortOrder: 1,
    ...overrides,
  };
}

describe('Hybrid Product Cards & Grid Redesign (Tasks 1–9)', () => {
  beforeEach(() => {
    setAppLanguage('hy');
  });

  it('1. Renders visual image card (4:3 aspect ratio, row-span-2) when product has a valid image URL', () => {
    const product = makeProduct({
      imageUrl:
        'https://firebasestorage.googleapis.com/v0/b/ai-twin-conflicts.firebasestorage.app/o/dish.webp',
    });

    const html = renderToStaticMarkup(
      <ProductCard product={product} onSelect={() => {}} />
    );

    expect(html).toContain('data-card-variant="image"');
    expect(html).toContain('aspect-[4/3]');
    expect(html).toContain('min-[340px]:row-span-2');
    expect(html).toContain('<img');
    expect(html).toContain('object-cover');
    expect(html).toContain('Խոզի խորոված');
    expect(html).toContain(formatAMD(3800));
  });

  it('2. Renders compact text-only card (row-span-1, no placeholder, no icon) when product has no image', () => {
    const product = makeProduct({ imageUrl: undefined });

    const html = renderToStaticMarkup(
      <ProductCard product={product} onSelect={() => {}} />
    );

    expect(html).toContain('data-card-variant="compact"');
    expect(html).toContain('row-span-1');
    expect(html).not.toContain('min-[340px]:row-span-2');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('aspect-[4/3]');
    expect(html).not.toContain('aspect-[16/10]');
    expect(html).not.toContain(i18n.t('menu.noImage'));
    expect(html).toContain('Խոզի խորոված');
    expect(html).toContain(formatAMD(3800));
  });

  it('3. Rejects empty, whitespace-only, and malformed image URLs cleanly', () => {
    expect(hasValidProductImage(undefined)).toBe(false);
    expect(hasValidProductImage(null)).toBe(false);
    expect(hasValidProductImage('')).toBe(false);
    expect(hasValidProductImage('    ')).toBe(false);
    expect(hasValidProductImage('null')).toBe(false);
    expect(hasValidProductImage('undefined')).toBe(false);
    expect(hasValidProductImage('none')).toBe(false);
    expect(hasValidProductImage('not-a-valid-url')).toBe(false);
    expect(hasValidProductImage('http://')).toBe(false);
    expect(hasValidProductImage('javascript:alert(1)')).toBe(false);

    expect(
      normalizeProductImageUrl('  https://firebasestorage.googleapis.com/v0/b/x/o/img.jpg  ')
    ).toBe('https://firebasestorage.googleapis.com/v0/b/x/o/img.jpg');
    expect(normalizeProductImageUrl('/assets/dish.webp')).toBe('/assets/dish.webp');

    for (const badUrl of ['', '   ', 'null', 'not-a-url']) {
      const html = renderToStaticMarkup(
        <ProductCard product={makeProduct({ imageUrl: badUrl })} onSelect={() => {}} />
      );
      expect(html).toContain('data-card-variant="compact"');
      expect(html).not.toContain('<img');
    }
  });

  it('4. Switches broken image card to compact text-only presentation without affecting other products', () => {
    const brokenProduct = makeProduct({
      id: 'prod-broken',
      imageUrl: 'https://example.com/broken-image.jpg',
    });
    const healthyProduct = makeProduct({
      id: 'prod-healthy',
      imageUrl: 'https://example.com/healthy-image.jpg',
    });

    const compactHtml = renderToStaticMarkup(
      <ProductCard
        product={brokenProduct}
        forceCompact={true}
        onSelect={() => {}}
      />
    );
    const healthyHtml = renderToStaticMarkup(
      <ProductCard
        product={healthyProduct}
        forceCompact={false}
        onSelect={() => {}}
      />
    );

    expect(compactHtml).toContain('data-card-variant="compact"');
    expect(compactHtml).not.toContain('<img');
    expect(healthyHtml).toContain('data-card-variant="image"');
    expect(healthyHtml).toContain('<img');
  });

  it('5. Wraps long product names naturally without truncating dish names', () => {
    const longName =
      'Ֆիրմային տնական տապակած հորթի միս բանջարեղենով, սնկով և հատուկ սոուսով կավե ամանի մեջ';
    const product = makeProduct({
      imageUrl: undefined,
      name: { hy: longName, ru: longName, en: longName },
    });

    const html = renderToStaticMarkup(
      <ProductCard product={product} onSelect={() => {}} />
    );

    expect(html).toContain(longName);
    expect(html).toContain('break-words');
  });

  it('6. Renders products with multiple variant prices clearly in both card modes', () => {
    const productWithVariants = makeProduct({
      imageUrl: undefined,
      variants: [
        {
          id: 'v-small',
          label: { hy: '0.3 լ', ru: '0.3 л', en: '0.3 L' },
          price: 900,
          sortOrder: 1,
        },
        {
          id: 'v-large',
          label: { hy: '0.5 լ', ru: '0.5 л', en: '0.5 L' },
          price: 1400,
          sortOrder: 2,
        },
      ],
    });

    const html = renderToStaticMarkup(
      <ProductCard product={productWithVariants} onSelect={() => {}} />
    );

    expect(html).toContain('0.3 լ:');
    expect(html).toContain(formatAMD(900));
    expect(html).toContain('0.5 լ:');
    expect(html).toContain(formatAMD(1400));
  });

  it('7. Renders mixed image and text-only products cleanly in ProductGrid', () => {
    const mixedProducts: MenuProduct[] = [
      makeProduct({
        id: 'p-1',
        name: { hy: 'Ապրանք 1 (Նկարով)', ru: 'Товар 1', en: 'Item 1' },
        imageUrl: 'https://example.com/item-1.jpg',
      }),
      makeProduct({
        id: 'p-2',
        name: { hy: 'Ապրանք 2 (Առանց նկարի)', ru: 'Товар 2', en: 'Item 2' },
        imageUrl: undefined,
      }),
      makeProduct({
        id: 'p-3',
        name: { hy: 'Ապրանք 3 (Առանց նկարի)', ru: 'Товар 3', en: 'Item 3' },
        imageUrl: '',
      }),
    ];

    const html = renderToStaticMarkup(
      <ProductGrid products={mixedProducts} onSelectProduct={() => {}} />
    );

    expect(html).toContain('data-testid="hybrid-product-grid"');
    expect(html).toContain('grid-flow-row-dense');
    expect(html).toContain('data-testid="product-card-p-1" data-card-variant="image"');
    expect(html).toContain('data-testid="product-card-p-2" data-card-variant="compact"');
    expect(html).toContain('data-testid="product-card-p-3" data-card-variant="compact"');
  });

  it('8. Mobile layout uses 2 columns on standard mobile widths and 1 column on ultra-narrow screens', () => {
    const html = renderToStaticMarkup(
      <ProductGrid products={[makeProduct()]} onSelectProduct={() => {}} />
    );

    expect(html).toContain('grid-cols-1');
    expect(html).toContain('min-[340px]:grid-cols-2');
  });

  it('9. Tablet layout uses 3 columns at md breakpoint', () => {
    const html = renderToStaticMarkup(
      <ProductGrid products={[makeProduct()]} onSelectProduct={() => {}} />
    );

    expect(html).toContain('md:grid-cols-3');
  });

  it('10. Desktop layout uses 4 columns at xl breakpoint', () => {
    const html = renderToStaticMarkup(
      <ProductGrid products={[makeProduct()]} onSelectProduct={() => {}} />
    );

    expect(html).toContain('xl:grid-cols-4');
  });

  it('11. Switches product names and variant labels across HY, RU, and EN languages', () => {
    const product = makeProduct({ imageUrl: undefined });

    setAppLanguage('hy');
    expect(
      renderToStaticMarkup(<ProductCard product={product} onSelect={() => {}} />)
    ).toContain('Խոզի խորոված');

    setAppLanguage('ru');
    expect(
      renderToStaticMarkup(<ProductCard product={product} onSelect={() => {}} />)
    ).toContain('Шашлык из свинины');

    setAppLanguage('en');
    expect(
      renderToStaticMarkup(<ProductCard product={product} onSelect={() => {}} />)
    ).toContain('Pork Khorovats');
  });

  it('12. Preserves category filtering', () => {
    const categories: MenuCategory[] = [
      {
        id: 'cat-1',
        restaurantId: 'xutorok',
        slug: 'hot-dishes',
        name: { hy: 'Տաք ուտեստներ', ru: 'Горячие блюда', en: 'Hot Dishes' },
        sortOrder: 1,
        isVisible: true,
      },
      {
        id: 'cat-2',
        restaurantId: 'xutorok',
        slug: 'drinks',
        name: { hy: 'Ըմպելիքներ', ru: 'Напитки', en: 'Drinks' },
        sortOrder: 2,
        isVisible: true,
      },
    ];

    const products: MenuProduct[] = [
      makeProduct({
        id: 'first-item',
        categoryId: 'cat-1',
        sortOrder: 1,
        name: { hy: 'Առաջին ուտեստ', ru: 'Первое', en: 'First Dish' },
      }),
      makeProduct({
        id: 'drink-item',
        categoryId: 'cat-2',
        sortOrder: 1,
        name: { hy: 'Հանքային ջուր', ru: 'Вода', en: 'Mineral Water' },
      }),
    ];

    const cat1Items = products.filter((p) => p.categoryId === categories[0].id);
    const html = renderToStaticMarkup(
      <ProductGrid products={cat1Items} onSelectProduct={() => {}} />
    );

    expect(html).toContain('Առաջին ուտեստ');
    expect(html).not.toContain('Հանքային ջուր');
  });

  it('13. Preserves product sortOrder sequence', () => {
    const products: MenuProduct[] = [
      makeProduct({
        id: 'second-item',
        categoryId: 'cat-1',
        sortOrder: 2,
        name: { hy: 'Երկրորդ ուտեստ', ru: 'Второе', en: 'Second Dish' },
      }),
      makeProduct({
        id: 'first-item',
        categoryId: 'cat-1',
        sortOrder: 1,
        name: { hy: 'Առաջին ուտեստ', ru: 'Первое', en: 'First Dish' },
      }),
    ];

    const sortedItems = [...products].sort((a, b) => a.sortOrder - b.sortOrder);
    const html = renderToStaticMarkup(
      <ProductGrid products={sortedItems} onSelectProduct={() => {}} />
    );

    const idxFirst = html.indexOf('Առաջին ուտեստ');
    const idxSecond = html.indexOf('Երկրորդ ուտեստ');
    expect(idxFirst).toBeGreaterThan(-1);
    expect(idxSecond).toBeGreaterThan(idxFirst);
  });

  it('14. Preserves product detail dialog interaction with and without product image', () => {
    const onSelect = vi.fn();
    const productNoImg = makeProduct({ imageUrl: undefined });
    const productWithImg = makeProduct({
      imageUrl: 'https://example.com/khorovats.jpg',
    });

    onSelect(productNoImg);
    expect(onSelect).toHaveBeenCalledWith(productNoImg);

    const dialogNoImgHtml = renderToStaticMarkup(
      <ProductDetailDialog
        product={productNoImg}
        categoryName="Տաք ուտեստներ"
        onClose={() => {}}
      />
    );
    // No empty image placeholder in modal when product has no image
    expect(dialogNoImgHtml).not.toContain('<img');
    expect(dialogNoImgHtml).not.toContain(i18n.t('menu.noImage'));
    // Still displays all 3 languages and price
    expect(dialogNoImgHtml).toContain('Խոզի խորոված');
    expect(dialogNoImgHtml).toContain('Шашлык из свинины');
    expect(dialogNoImgHtml).toContain('Pork Khorovats');
    expect(dialogNoImgHtml).toContain(formatAMD(3800));

    const dialogWithImgHtml = renderToStaticMarkup(
      <ProductDetailDialog
        product={productWithImg}
        categoryName="Տաք ուտեստներ"
        onClose={() => {}}
      />
    );
    expect(dialogWithImgHtml).toContain('<img');
    expect(dialogWithImgHtml).toContain('https://example.com/khorovats.jpg');
  });

  it('15. Simplifies header to logo-only, preserves dynamic Firestore branding colors, and localizes menu heading/subtitle across HY/RU/EN', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <PublicLayout
          settingsStatus="ready"
          profile={{
            id: 'xutorok',
            restaurantId: 'xutorok',
            slug: 'xutorok',
            status: 'active',
            currency: 'AMD',
            name: { hy: 'Խուտոռոկ', ru: 'Хуторок', en: 'Xutorok' },
            defaultLanguage: 'hy',
            supportedLanguages: ['hy', 'ru', 'en'],
            branding: {
              logoUrl:
                'https://firebasestorage.googleapis.com/v0/b/ai-twin-conflicts/o/logo.svg',
              primaryColor: '#4a2c16',
              secondaryColor: '#8c6239',
            },
          }}
        >
          <div>Menu Body</div>
        </PublicLayout>
      </MemoryRouter>
    );

    // Header link contains only the logo image, not a separate restaurant name text span
    const headerMatch = html.match(/<header[\s\S]*?<\/header>/);
    expect(headerMatch).not.toBeNull();
    expect(headerMatch![0]).toContain(
      'https://firebasestorage.googleapis.com/v0/b/ai-twin-conflicts/o/logo.svg'
    );
    expect(headerMatch![0]).not.toContain('>Խուտոռոկ<');
    expect(headerMatch![0]).toContain('Language selector');

    // Dynamic Firestore branding CSS custom properties are preserved
    expect(html).toContain('--color-primary:#4a2c16');
    expect(html).toContain('--color-secondary:#8c6239');

    // Localized Menu heading & cuisine description in HY / RU / EN
    setAppLanguage('hy');
    expect(i18n.t('menu.title')).toBe('Մենյու');
    expect(i18n.t('menu.subtitle')).toBe('Հայկական և ուկրաինական խոհանոց');

    setAppLanguage('ru');
    expect(i18n.t('menu.title')).toBe('Меню');
    expect(i18n.t('menu.subtitle')).toBe('Армянская и украинская кухня');

    setAppLanguage('en');
    expect(i18n.t('menu.title')).toBe('Menu');
    expect(i18n.t('menu.subtitle')).toBe('Armenian and Ukrainian cuisine');
  });
});
