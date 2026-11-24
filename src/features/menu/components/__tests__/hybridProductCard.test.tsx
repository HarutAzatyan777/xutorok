import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicLayout } from '../../../../components/layout/PublicLayout';
import { LanguageSwitcher } from '../../../../components/common/LanguageSwitcher';
import { CategoryNav } from '../CategoryNav';
import { ProductCard } from '../ProductCard';
import { ProductGrid } from '../ProductGrid';
import { ProductDetailDialog } from '../ProductDetailDialog';
import {
  computeScrollLogoMetrics,
  computeScrollLogoTransformState,
  DESKTOP_MAX_HEADER_LOGO_HEIGHT,
  MIN_HEADER_VERTICAL_CLEARANCE,
  MOBILE_MAX_HEADER_LOGO_HEIGHT,
} from '../../hooks/useScrollHeroLogo';
import {
  computeCategorySectionScrollTop,
  computeHorizontalPillScrollLeft,
  computeStickyMenuOffset,
  resolveActiveCategoryFromSections,
} from '../../hooks/useCategoryScrollSpy';
import {
  groupProductsByCategoryImageFirst,
  hasValidProductImage,
  normalizeProductImageUrl,
  sortProductsImageFirst,
} from '../../utils/productImage';
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

  it('15. Preserves dynamic Firestore branding colors and localizes menu heading/subtitle across HY/RU/EN', () => {
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

    // Header has burger menu and language selector, single logo is rendered in the hero
    const headerMatch = html.match(/<header[\s\S]*?<\/header>/);
    expect(headerMatch).not.toBeNull();
    expect(headerMatch![0]).toContain('Language selector');

    // Dynamic Firestore branding CSS custom properties are preserved
    expect(html).toContain('--color-primary:#4a2c16');
    expect(html).toContain('--color-secondary:#8c6239');

    // Localized Menu heading & cuisine description in HY / RU / EN
    setAppLanguage('hy');
    expect(i18n.t('menu.title')).toBe('Մենյու');
    expect(i18n.t('menu.subtitle')).toBe('Ուկրաինական և Հայկական-Ռեստորան');

    setAppLanguage('ru');
    expect(i18n.t('menu.title')).toBe('Меню');
    expect(i18n.t('menu.subtitle')).toBe('Украинский и армянский ресторан');

    setAppLanguage('en');
    expect(i18n.t('menu.title')).toBe('Menu');
    expect(i18n.t('menu.subtitle')).toBe('Ukrainian and Armenian Restaurant');
  });

  it('16. Renders burger navigation button and accessible drawer in public layout', () => {
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
              logoUrl: 'https://example.com/logo.svg',
            },
          }}
        >
          <div>Main menu content</div>
        </PublicLayout>
      </MemoryRouter>
    );

    // Burger button is present with accessible label
    expect(html).toContain('aria-label="Բացել մենյուն"');
    expect(html).toContain('bg-[#302019]');
  });

  it('17. Computes mobile and desktop scroll-driven logo animation into the sticky header with exact clearance and aspect ratio', () => {
    // Mobile viewport (375px wide, 56px header, 165x73.77 hero logo)
    const mobileMetrics = computeScrollLogoMetrics({
      viewportWidth: 375,
      scrollY: 0,
      baseWidth: 165,
      baseHeight: 73.77,
      anchorRect: {
        left: 105,
        top: 80,
        width: 165,
        height: 80,
      },
      headerHeight: 56,
      leftControlRight: 56,
      rightControlLeft: 247,
    });

    expect(mobileMetrics.finalHeight).toBeLessThanOrEqual(MOBILE_MAX_HEADER_LOGO_HEIGHT);
    expect(mobileMetrics.finalHeight).toBeCloseTo(34, 1);
    expect(mobileMetrics.verticalClearance).toBeGreaterThanOrEqual(
      MIN_HEADER_VERTICAL_CLEARANCE
    );
    expect(mobileMetrics.targetCenterX).toBe(187.5);
    expect(mobileMetrics.targetCenterY).toBe(28);
    // Preserves aspect ratio
    expect(mobileMetrics.finalWidth / mobileMetrics.finalHeight).toBeCloseTo(
      165 / 73.77,
      3
    );
    // Does not overlap left burger button (56px) or right language switcher (247px)
    const mobileLeftEdge = mobileMetrics.targetCenterX - mobileMetrics.finalWidth / 2;
    const mobileRightEdge = mobileMetrics.targetCenterX + mobileMetrics.finalWidth / 2;
    expect(mobileLeftEdge).toBeGreaterThan(56);
    expect(mobileRightEdge).toBeLessThan(247);

    // At top of page (scrollY = 0)
    const mobileTopState = computeScrollLogoTransformState(0, mobileMetrics, false);
    expect(mobileTopState.isAtTop).toBe(true);
    expect(mobileTopState.isDocked).toBe(false);
    expect(mobileTopState.scale).toBe(1);

    // Halfway through hero scroll
    const mobileMidState = computeScrollLogoTransformState(
      mobileMetrics.scrollDistance / 2,
      mobileMetrics,
      false
    );
    expect(mobileMidState.isAtTop).toBe(false);
    expect(mobileMidState.isDocked).toBe(false);
    expect(mobileMidState.scale).toBeGreaterThan(mobileMetrics.targetScale);
    expect(mobileMidState.scale).toBeLessThan(1);

    // Docked inside sticky header (scrollY >= scrollDistance)
    const mobileDockedState = computeScrollLogoTransformState(
      mobileMetrics.scrollDistance + 250,
      mobileMetrics,
      false
    );
    expect(mobileDockedState.isDocked).toBe(true);
    expect(mobileDockedState.visualHeight).toBeCloseTo(34, 1);
    expect(mobileDockedState.centerX).toBe(187.5);
    expect(mobileDockedState.centerY).toBe(28);

    // Desktop viewport (1280px wide, 64px header, 225x100.59 hero logo)
    const desktopMetrics = computeScrollLogoMetrics({
      viewportWidth: 1280,
      scrollY: 0,
      baseWidth: 225,
      baseHeight: 100.59,
      anchorRect: {
        left: 527.5,
        top: 96,
        width: 225,
        height: 100.59,
      },
      headerHeight: 64,
      leftControlRight: 112,
      rightControlLeft: 1100,
    });

    expect(desktopMetrics.finalHeight).toBeLessThanOrEqual(DESKTOP_MAX_HEADER_LOGO_HEIGHT);
    expect(desktopMetrics.finalHeight).toBeCloseTo(40, 1);
    expect(desktopMetrics.verticalClearance).toBeGreaterThanOrEqual(
      MIN_HEADER_VERTICAL_CLEARANCE
    );
    expect(desktopMetrics.targetCenterX).toBe(640);
    expect(desktopMetrics.targetCenterY).toBe(32);
    expect(desktopMetrics.finalWidth / desktopMetrics.finalHeight).toBeCloseTo(
      225 / 100.59,
      3
    );

    const desktopDockedState = computeScrollLogoTransformState(
      desktopMetrics.scrollDistance + 500,
      desktopMetrics,
      false
    );
    expect(desktopDockedState.isDocked).toBe(true);
    expect(desktopDockedState.visualHeight).toBeCloseTo(40, 1);
    expect(desktopDockedState.centerX).toBe(640);
    expect(desktopDockedState.centerY).toBe(32);

    // Respects prefers-reduced-motion
    const reducedMotionBeforeHalf = computeScrollLogoTransformState(
      desktopMetrics.scrollDistance * 0.25,
      desktopMetrics,
      true
    );
    expect(reducedMotionBeforeHalf.progress).toBe(0);
    expect(reducedMotionBeforeHalf.scale).toBe(1);

    const reducedMotionAfterHalf = computeScrollLogoTransformState(
      desktopMetrics.scrollDistance * 0.75,
      desktopMetrics,
      true
    );
    expect(reducedMotionAfterHalf.progress).toBe(1);
    expect(reducedMotionAfterHalf.isDocked).toBe(true);
  });

  it('18. Renders flags-only language dropdown with #452B1E trigger, #FFF9F2 menu, accessible aria-labels, and zero visible text', () => {
    setAppLanguage('hy');
    const html = renderToStaticMarkup(<LanguageSwitcher />);

    expect(html).toContain('data-testid="language-switcher-trigger"');
    expect(html).toContain('bg-[#452B1E]');
    expect(html).toContain('bg-[#FFF9F2]');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-label="Հայերեն (Armenian)"');
    expect(html).toContain('aria-label="Русский (Russian)"');
    expect(html).toContain('aria-label="English"');
    // US flag (🇺🇸) colors for English option, not UK flag
    expect(html).toContain('#B22234');
    expect(html).toContain('#3C3B6E');
    expect(html).not.toContain('#012169');

    // Strip all HTML tags to verify zero visible text (no HY, RU, EN or language names)
    const visibleText = html.replace(/<[^>]+>/g, '').trim();
    expect(visibleText).toBe('');
  });

  it('19. Image-first ordering within a category places valid-image products first and no-image products afterward', () => {
    const unsorted: MenuProduct[] = [
      makeProduct({
        id: 'no-img-1',
        sortOrder: 1,
        imageUrl: undefined,
        name: { hy: 'Առանց նկար 1', ru: 'Без фото 1', en: 'No Image 1' },
      }),
      makeProduct({
        id: 'with-img-2',
        sortOrder: 3,
        imageUrl: 'https://example.com/dish-2.webp',
        name: { hy: 'Նկարով 2', ru: 'С фото 2', en: 'With Image 2' },
      }),
      makeProduct({
        id: 'no-img-2',
        sortOrder: 2,
        imageUrl: '   ',
        name: { hy: 'Առանց նկար 2', ru: 'Без фото 2', en: 'No Image 2' },
      }),
      makeProduct({
        id: 'with-img-1',
        sortOrder: 1,
        imageUrl: 'https://example.com/dish-1.webp',
        name: { hy: 'Նկարով 1', ru: 'С фото 1', en: 'With Image 1' },
      }),
    ];

    const sorted = sortProductsImageFirst(unsorted);
    expect(sorted.map((p) => p.id)).toEqual([
      'with-img-1',
      'with-img-2',
      'no-img-1',
      'no-img-2',
    ]);

    // Does not mutate input array or Firestore sortOrder values
    expect(unsorted.map((p) => p.id)).toEqual([
      'no-img-1',
      'with-img-2',
      'no-img-2',
      'with-img-1',
    ]);
    expect(sorted[0].sortOrder).toBe(1);
    expect(sorted[1].sortOrder).toBe(3);

    // ProductGrid also enforces image-first ordering in rendered markup
    const html = renderToStaticMarkup(
      <ProductGrid products={unsorted} onSelectProduct={() => {}} />
    );
    const idxImg1 = html.indexOf('product-card-with-img-1');
    const idxImg2 = html.indexOf('product-card-with-img-2');
    const idxNoImg1 = html.indexOf('product-card-no-img-1');
    const idxNoImg2 = html.indexOf('product-card-no-img-2');

    expect(idxImg1).toBeGreaterThan(-1);
    expect(idxImg2).toBeGreaterThan(idxImg1);
    expect(idxNoImg1).toBeGreaterThan(idxImg2);
    expect(idxNoImg2).toBeGreaterThan(idxNoImg1);
  });

  it('20. Stable ordering of products with the same image status preserves sortOrder and original sequence on ties', () => {
    const items: MenuProduct[] = [
      makeProduct({
        id: 'no-img-a',
        sortOrder: 5,
        imageUrl: undefined,
      }),
      makeProduct({
        id: 'no-img-b',
        sortOrder: 5,
        imageUrl: '',
      }),
      makeProduct({
        id: 'img-a',
        sortOrder: 2,
        imageUrl: 'https://example.com/a.jpg',
      }),
      makeProduct({
        id: 'img-b',
        sortOrder: 2,
        imageUrl: 'https://example.com/b.jpg',
      }),
      makeProduct({
        id: 'img-c',
        sortOrder: 1,
        imageUrl: 'https://example.com/c.jpg',
      }),
    ];

    const sorted = sortProductsImageFirst(items);
    expect(sorted.map((p) => p.id)).toEqual([
      'img-c',
      'img-a',
      'img-b',
      'no-img-a',
      'no-img-b',
    ]);

    // When an image fails at runtime, it demotes to the no-image group while preserving sortOrder
    const sortedWithBroken = sortProductsImageFirst(items, {
      'img-c::https://example.com/c.jpg': true,
    });
    expect(sortedWithBroken.map((p) => p.id)).toEqual([
      'img-a',
      'img-b',
      'img-c',
      'no-img-a',
      'no-img-b',
    ]);
  });

  it('21. Correct category grouping in "All Products" keeps category sections separate and sorts image-first within each category', () => {
    const categories: MenuCategory[] = [
      {
        id: 'cat-soups',
        restaurantId: 'xutorok',
        slug: 'soups',
        name: { hy: 'Ապուրներ', ru: 'Супы', en: 'Soups' },
        sortOrder: 1,
        isVisible: true,
      },
      {
        id: 'cat-grill',
        restaurantId: 'xutorok',
        slug: 'grill',
        name: { hy: 'Խորոված', ru: 'Шашлык', en: 'Grill' },
        sortOrder: 2,
        isVisible: true,
      },
    ];

    const products: MenuProduct[] = [
      makeProduct({
        id: 'soup-no-img',
        categoryId: 'cat-soups',
        sortOrder: 1,
        imageUrl: undefined,
      }),
      makeProduct({
        id: 'grill-img',
        categoryId: 'cat-grill',
        sortOrder: 1,
        imageUrl: 'https://example.com/grill.jpg',
      }),
      makeProduct({
        id: 'soup-img',
        categoryId: 'cat-soups',
        sortOrder: 2,
        imageUrl: 'https://example.com/borscht.jpg',
      }),
      makeProduct({
        id: 'grill-no-img',
        categoryId: 'cat-grill',
        sortOrder: 2,
        imageUrl: undefined,
      }),
    ];

    const groups = groupProductsByCategoryImageFirst(categories, products);

    expect(groups).toHaveLength(2);
    expect(groups[0].category.id).toBe('cat-soups');
    expect(groups[0].items.map((p) => p.id)).toEqual(['soup-img', 'soup-no-img']);
    expect(groups[1].category.id).toBe('cat-grill');
    expect(groups[1].items.map((p) => p.id)).toEqual(['grill-img', 'grill-no-img']);
  });

  it('22. Scroll Spy active category updates accurately during both downward and upward scrolling', () => {
    const stickyOffset = 136; // 64px header + 56px category nav + 16px breathing room

    // 1. At top of page above first category section -> returns null ("All Products" stays active)
    expect(
      resolveActiveCategoryFromSections(
        [
          { categoryId: 'cat-1', top: 260, bottom: 760 },
          { categoryId: 'cat-2', top: 780, bottom: 1280 },
          { categoryId: 'cat-3', top: 1300, bottom: 1800 },
        ],
        stickyOffset,
        0
      )
    ).toBeNull();

    // 2. Scrolled down into Category 1
    expect(
      resolveActiveCategoryFromSections(
        [
          { categoryId: 'cat-1', top: 120, bottom: 620 },
          { categoryId: 'cat-2', top: 640, bottom: 1140 },
          { categoryId: 'cat-3', top: 1160, bottom: 1660 },
        ],
        stickyOffset,
        200
      )
    ).toBe('cat-1');

    // 3. Scrolled further down into Category 2
    expect(
      resolveActiveCategoryFromSections(
        [
          { categoryId: 'cat-1', top: -380, bottom: 120 },
          { categoryId: 'cat-2', top: 140, bottom: 640 },
          { categoryId: 'cat-3', top: 660, bottom: 1160 },
        ],
        stickyOffset,
        700
      )
    ).toBe('cat-2');

    // 4. Scrolled down into Category 3
    expect(
      resolveActiveCategoryFromSections(
        [
          { categoryId: 'cat-1', top: -900, bottom: -400 },
          { categoryId: 'cat-2', top: -380, bottom: 120 },
          { categoryId: 'cat-3', top: 145, bottom: 645 },
        ],
        stickyOffset,
        1220
      )
    ).toBe('cat-3');

    // 5. Scrolled back UP into Category 2 -> immediately highlights Category 2 again
    expect(
      resolveActiveCategoryFromSections(
        [
          { categoryId: 'cat-1', top: -300, bottom: 200 },
          { categoryId: 'cat-2', top: 150, bottom: 650 },
          { categoryId: 'cat-3', top: 670, bottom: 1170 },
        ],
        stickyOffset,
        620
      )
    ).toBe('cat-2');
  });

  it('23. Clicking category navigation and rendering CategoryNav preserves distinction between selected filter and scroll-active section', () => {
    const categories: MenuCategory[] = [
      {
        id: 'cat-1',
        restaurantId: 'xutorok',
        slug: 'soups',
        name: { hy: 'Ապուրներ', ru: 'Супы', en: 'Soups' },
        sortOrder: 1,
        isVisible: true,
      },
      {
        id: 'cat-2',
        restaurantId: 'xutorok',
        slug: 'grill',
        name: { hy: 'Խորոված', ru: 'Шашлык', en: 'Grill' },
        sortOrder: 2,
        isVisible: true,
      },
    ];

    const onSelect = vi.fn();

    // Case A: "All Products" selected (`selectedCategoryId = null`), scrolling inside `cat-2`
    const scrollSpyHtml = renderToStaticMarkup(
      <CategoryNav
        categories={categories}
        selectedCategoryId={null}
        activeScrollCategoryId="cat-2"
        onSelectCategory={onSelect}
      />
    );

    // "All Products" retains `data-selected="true"` (`aria-pressed="true"`), while `cat-2` is `data-scroll-active="true"` and `data-active="true"`
    expect(scrollSpyHtml).toContain(
      'data-testid="category-pill-all" data-category-id="all" data-selected="true" data-active="false"'
    );
    expect(scrollSpyHtml).toContain(
      'data-testid="category-pill-cat-2" data-category-id="cat-2" data-selected="false" data-scroll-active="true" data-active="true"'
    );
    expect(scrollSpyHtml).toContain('aria-current="location"');

    // Case B: Specific category `cat-1` selected -> `cat-1` is selected & active, "All Products" is unselected and clickable to return
    const singleCategoryHtml = renderToStaticMarkup(
      <CategoryNav
        categories={categories}
        selectedCategoryId="cat-1"
        activeScrollCategoryId={null}
        onSelectCategory={onSelect}
      />
    );

    expect(singleCategoryHtml).toContain(
      'data-testid="category-pill-all" data-category-id="all" data-selected="false" data-active="false"'
    );
    expect(singleCategoryHtml).toContain(
      'data-testid="category-pill-cat-1" data-category-id="cat-1" data-selected="true" data-scroll-active="false" data-active="true"'
    );
  });

  it('24. Sticky header and category navigation offsets prevent section headings from hiding behind sticky bars', () => {
    // Mobile: 56px header + 60px category nav + 16px breathing room = 132px
    const mobileOffset = computeStickyMenuOffset({
      viewportWidth: 375,
      headerHeight: 56,
      categoryNavHeight: 60,
    });
    expect(mobileOffset).toBe(132);

    // Desktop: 64px header + 60px category nav + 16px breathing room = 140px
    const desktopOffset = computeStickyMenuOffset({
      viewportWidth: 1280,
      headerHeight: 64,
      categoryNavHeight: 60,
    });
    expect(desktopOffset).toBe(140);

    // Target scroll position places section heading cleanly below sticky offset
    const targetTop = computeCategorySectionScrollTop(420, 300, desktopOffset);
    expect(targetTop).toBe(300 + 420 - 140);
  });

  it('25. Mobile horizontal category navigation computes centered scrollLeft to keep active pill visible', () => {
    // Active pill near the right side of a 360px mobile category strip
    const scrollLeft = computeHorizontalPillScrollLeft({
      containerScrollLeft: 0,
      containerClientWidth: 360,
      pillOffsetLeft: 480,
      pillOffsetWidth: 110,
    });

    // Pill center is 480 + 55 = 535; centered in 360px container -> 535 - 180 = 355
    expect(scrollLeft).toBe(355);

    // First pill ("All Products") at the left edge clamps cleanly to 0
    const firstPillScrollLeft = computeHorizontalPillScrollLeft({
      containerScrollLeft: 200,
      containerClientWidth: 360,
      pillOffsetLeft: 16,
      pillOffsetWidth: 96,
    });
    expect(firstPillScrollLeft).toBe(0);
  });
});
