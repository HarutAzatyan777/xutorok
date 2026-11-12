import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, RefreshCw, UtensilsCrossed } from 'lucide-react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { CategoryNav } from '../../features/menu/components/CategoryNav';
import { MenuSkeleton } from '../../features/menu/components/MenuSkeleton';
import { ProductGrid } from '../../features/menu/components/ProductGrid';
import { ProductDetailDialog } from '../../features/menu/components/ProductDetailDialog';
import { usePublicMenu } from '../../features/menu/hooks/usePublicMenu';
import { useScrollHeroLogo } from '../../features/menu/hooks/useScrollHeroLogo';
import { useCategoryScrollSpy } from '../../features/menu/hooks/useCategoryScrollSpy';
import {
  groupProductsByCategoryImageFirst,
  sortProductsImageFirst,
} from '../../features/menu/utils/productImage';
import { useTheme } from '../../app/providers/themeContext';
import { getLocalizedText } from '../../lib/utils/format';
import type { Language, MenuProduct } from '../../types';

export function PublicMenuPage() {
  const { i18n, t } = useTranslation();
  const lang = (i18n.language?.slice(0, 2) as Language) || 'hy';
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const {
    profile,
    settingsStatus,
    settingsError,
    categories,
    products,
    loading,
    error,
    retry,
    retrySettings,
  } = usePublicMenu();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState<MenuProduct | null>(null);

  const rawLogoUrl =
    settingsStatus === 'ready' && profile
      ? profile.branding?.logoUrl?.trim() || ''
      : '';
  const [failedHeroLogoUrl, setFailedHeroLogoUrl] = useState<string | null>(null);
  const hasValidHeroLogo = Boolean(rawLogoUrl && failedHeroLogoUrl !== rawLogoUrl);

  const {
    heroAnchorRef,
    animatedLogoRef,
    logoImgRef,
    handleLogoLoad,
  } = useScrollHeroLogo({
    enabled: settingsStatus !== 'loading',
    logoKey: hasValidHeroLogo ? rawLogoUrl : 'fallback-icon',
  });

  const handleNavigateToCategories = () => {
    const el = document.getElementById('menu-categories-nav');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const visibleCategoryIds = useMemo(
    () => new Set(categories.map((c) => c.id)),
    [categories]
  );

  const showUnavailable = profile?.menuSettings?.showUnavailableItems !== false;

  // Only show products belonging to visible categories (and respect showUnavailableItems setting)
  const activeProducts = useMemo(() => {
    return products.filter((p) => {
      if (categories.length > 0 && !visibleCategoryIds.has(p.categoryId)) {
        return false;
      }
      if (!showUnavailable && !p.isAvailable) {
        return false;
      }
      return true;
    });
  }, [categories.length, products, showUnavailable, visibleCategoryIds]);

  const categoriesById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cat of categories) {
      map[cat.id] = getLocalizedText(cat.name, lang);
    }
    return map;
  }, [categories, lang]);

  // All non-empty category sections with image-first product ordering inside each category
  const allCategorySections = useMemo(
    () => groupProductsByCategoryImageFirst(categories, activeProducts),
    [categories, activeProducts]
  );

  const nonEmptyCategoryIds = useMemo(
    () => allCategorySections.map((group) => group.category.id),
    [allCategorySections]
  );

  const {
    activeScrollCategoryId,
    stickyOffset,
    scrollToCategorySection,
  } = useCategoryScrollSpy({
    enabled: !loading && !error && selectedCategoryId === null,
    categoryIds: nonEmptyCategoryIds,
  });

  const handleSelectCategory = useCallback(
    (categoryId: string | null) => {
      setSelectedCategoryId(categoryId);
      scrollToCategorySection(categoryId);
    },
    [scrollToCategorySection]
  );

  // Filtered products for single-category mode (sorted image-first while preserving sortOrder)
  const filteredProducts = useMemo(() => {
    const matching = activeProducts.filter((prod) => {
      if (selectedCategoryId && prod.categoryId !== selectedCategoryId) {
        return false;
      }
      return true;
    });
    return selectedCategoryId ? sortProductsImageFirst(matching) : matching;
  }, [activeProducts, selectedCategoryId]);

  const selectedCategoryObj = useMemo(
    () =>
      selectedCategoryId
        ? categories.find((cat) => cat.id === selectedCategoryId) ?? null
        : null,
    [categories, selectedCategoryId]
  );

  const groupedByCategory = useMemo(() => {
    if (selectedCategoryId) {
      return null;
    }
    return allCategorySections;
  }, [allCategorySections, selectedCategoryId]);


  return (
    <PublicLayout
      profile={profile}
      settingsStatus={settingsStatus}
      onRetrySettings={retrySettings}
      onNavigateToCategories={handleNavigateToCategories}
    >
      {/* 1) Hero Section with Centered Large Logo and Subtitle (Dark Chocolate in dark mode, Warm Light in light mode) */}
      <section
        data-testid="hero-section"
        className={`relative border-b pt-6 pb-6 sm:pt-8 sm:pb-8 transition-colors duration-200 ${
          isDark
            ? 'border-[#4A2C16] bg-[#302019] text-[#F8F1E9]'
            : 'border-app-border bg-white text-app-text'
        }`}
      >
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 text-center">
          {/* Centered Large Logo loaded from Firebase settings — The ONLY logo on the page, smoothly animates into the sticky header on scroll */}
          <div
            ref={heroAnchorRef}
            data-testid="hero-logo-anchor"
            className="relative flex items-center justify-center min-h-[80px] sm:min-h-[100px]"
          >
            {settingsStatus === 'loading' ? (
              <div
                data-testid="hero-branding-skeleton"
                aria-busy="true"
                aria-label="Loading restaurant logo"
                className={`h-16 w-44 animate-pulse rounded-2xl sm:h-20 sm:w-56 ${
                  isDark ? 'bg-[#3D261A]' : 'bg-stone-200/80'
                }`}
              />
            ) : hasValidHeroLogo ? (
              <div
                ref={animatedLogoRef}
                data-testid="animated-brand-logo"
                data-docked="false"
                data-scroll-state="hero"
                className="z-40 pointer-events-none flex items-center justify-center origin-center will-change-transform"
              >
                <img
                  ref={logoImgRef}
                  src={rawLogoUrl}
                  alt={t('menu.title')}
                  onLoad={handleLogoLoad}
                  onError={() => setFailedHeroLogoUrl(rawLogoUrl)}
                  className={`h-auto max-h-[96px] sm:max-h-[112px] w-[165px] sm:w-[195px] md:w-[225px] max-w-[240px] object-contain select-none drop-shadow-md ${
                    isDark ? 'brightness-0 invert opacity-95' : 'opacity-100'
                  }`}
                />
              </div>
            ) : (
              <div
                ref={animatedLogoRef}
                data-testid="animated-brand-logo"
                data-docked="false"
                data-scroll-state="hero"
                className={`z-40 pointer-events-none flex h-16 w-16 items-center justify-center rounded-2xl origin-center will-change-transform ${
                  isDark ? 'bg-[#3D261A] text-[#C5A47A]' : 'bg-app-surface-muted text-brand-primary'
                }`}
              >
                <UtensilsCrossed className="h-9 w-9" />
              </div>
            )}
          </div>

          {/* Heading & Localized Subtitle */}
          <h1
            data-testid="menu-main-heading"
            className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${
              isDark ? 'text-[#F8F1E9]' : 'text-app-text'
            }`}
          >
            {t('menu.title')}
          </h1>

          <p
            data-testid="menu-main-subtitle"
            className={`mt-1 text-xs sm:text-sm font-medium ${
              isDark ? 'text-[#C5A47A]' : 'text-app-text-muted'
            }`}
          >
            {t('menu.subtitle')}
          </p>

          {/* Error Banner if settings failed */}
          {settingsStatus === 'error' && (
            <div
              data-testid="settings-error-banner"
              role="alert"
              className={`mt-4 flex flex-wrap items-center justify-center gap-2.5 rounded-xl border px-3.5 py-2 text-xs ${
                isDark
                  ? 'border-[#4A2C16] bg-[#3D261A] text-[#F8F1E9]'
                  : 'border-app-border bg-app-surface-muted text-app-text'
              }`}
            >
              <AlertCircle
                className={`h-4 w-4 shrink-0 ${
                  isDark ? 'text-[#C5A47A]' : 'text-brand-primary'
                }`}
              />
              <span>{settingsError || t('menu.errorDescription')}</span>
              <button
                type="button"
                onClick={retrySettings}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                  isDark
                    ? 'bg-[#C5A47A] text-[#241B17] hover:bg-[#d6b78d]'
                    : 'bg-brand-primary text-white hover:bg-brand-primary-hover'
                }`}
              >
                <RefreshCw className="h-3 w-3" />
                <span>{t('menu.retry')}</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 2) Menu Content Area — Supports both Dark & Light Themes */}
      {loading ? (
        <MenuSkeleton />
      ) : error ? (
        <div className="mx-auto max-w-md px-4 py-16 text-center" role="alert">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-app-text">{t('menu.errorTitle')}</h2>
          <p className="mt-1.5 text-sm text-app-text-muted">{t('menu.errorDescription')}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-hover"
          >
            <RefreshCw className="h-4 w-4" />
            {t('menu.retry')}
          </button>
        </div>
      ) : (
        <>
          <CategoryNav
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            activeScrollCategoryId={activeScrollCategoryId}
            onSelectCategory={handleSelectCategory}
          />

          <div className="mx-auto max-w-6xl px-4 py-6">
            {activeProducts.length === 0 ? (
              <div
                className={`rounded-2xl border p-12 text-center ${
                  isDark
                    ? 'border-[#4A2C16] bg-[#3D261A]/40 text-[#F8F1E9]'
                    : 'border-app-border bg-[#FFF9F2] text-[#241B17]'
                }`}
              >
                <UtensilsCrossed
                  className={`mx-auto h-10 w-10 stroke-[1.5] ${
                    isDark ? 'text-[#C5A47A]' : 'text-[#6D4029]'
                  }`}
                />
                <h2 className="mt-3 text-lg font-bold">
                  {t('menu.menuEmptyTitle')}
                </h2>
                <p
                  className={`mt-1 text-sm ${
                    isDark ? 'text-[#D8CBBF]' : 'text-stone-600'
                  }`}
                >
                  {t('menu.menuEmptyDescription')}
                </p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div
                className={`rounded-2xl border p-12 text-center ${
                  isDark
                    ? 'border-[#4A2C16] bg-[#3D261A]/40 text-[#F8F1E9]'
                    : 'border-app-border bg-[#FFF9F2] text-[#241B17]'
                }`}
              >
                <UtensilsCrossed
                  className={`mx-auto h-10 w-10 stroke-[1.5] ${
                    isDark ? 'text-[#C5A47A]' : 'text-[#6D4029]'
                  }`}
                />
                <h2 className="mt-3 text-lg font-bold">
                  {t('menu.emptyTitle')}
                </h2>
                <p
                  className={`mt-1 text-sm ${
                    isDark ? 'text-[#D8CBBF]' : 'text-stone-600'
                  }`}
                >
                  {t('menu.emptyDescription')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    handleSelectCategory(null);
                  }}
                  className={`mt-4 inline-flex items-center rounded-xl border px-4 py-2 text-xs font-semibold transition-colors ${
                    isDark
                      ? 'border-[#4A2C16] bg-[#3D261A] text-[#F8F1E9] hover:bg-[#4A2C16]'
                      : 'border-stone-200 bg-white text-[#241B17] hover:bg-stone-100'
                  }`}
                >
                  {t('menu.allCategories')}
                </button>
              </div>
            ) : groupedByCategory ? (
              <div className="space-y-10" data-testid="all-categories-sections">
                {groupedByCategory.map(({ category, items }) => (
                  <section
                    key={category.id}
                    id={`category-section-${category.id}`}
                    data-testid={`category-section-${category.id}`}
                    data-category-section={category.id}
                    tabIndex={-1}
                    style={{ scrollMarginTop: `${stickyOffset}px` }}
                    aria-labelledby={`cat-heading-${category.id}`}
                    className="scroll-mt-32 sm:scroll-mt-36 focus:outline-none"
                  >
                    <div
                      className={`mb-4 flex items-baseline justify-between border-b pb-2.5 ${
                        isDark ? 'border-[#4A2C16]' : 'border-stone-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-2 w-2 shrink-0 rounded-full bg-[#C5A47A]"
                        />
                        <h2
                          id={`cat-heading-${category.id}`}
                          className={`text-lg font-bold sm:text-xl ${
                            isDark ? 'text-[#F8F1E9]' : 'text-[#241B17]'
                          }`}
                        >
                          {getLocalizedText(category.name, lang)}
                        </h2>
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          isDark ? 'text-[#D8CBBF]' : 'text-[#6D4029]'
                        }`}
                      >
                        {t('menu.itemsCount', { count: items.length })}
                      </span>
                    </div>

                    <ProductGrid
                      products={items}
                      onSelectProduct={setActiveProduct}
                    />
                  </section>
                ))}
              </div>
            ) : (
              <section
                id={selectedCategoryId ? `category-section-${selectedCategoryId}` : undefined}
                data-testid={
                  selectedCategoryId ? `category-section-${selectedCategoryId}` : 'single-category-section'
                }
                data-category-section={selectedCategoryId ?? undefined}
                tabIndex={-1}
                style={{ scrollMarginTop: `${stickyOffset}px` }}
                aria-labelledby={
                  selectedCategoryId ? `cat-heading-${selectedCategoryId}` : undefined
                }
                className="scroll-mt-32 sm:scroll-mt-36 focus:outline-none"
              >
                {selectedCategoryObj && (
                  <div
                    className={`mb-4 flex flex-wrap items-center justify-between gap-2 border-b pb-2.5 ${
                      isDark ? 'border-[#4A2C16]' : 'border-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 shrink-0 rounded-full bg-[#C5A47A]"
                      />
                      <h2
                        id={`cat-heading-${selectedCategoryObj.id}`}
                        className={`text-lg font-bold sm:text-xl ${
                          isDark ? 'text-[#F8F1E9]' : 'text-[#241B17]'
                        }`}
                      >
                        {getLocalizedText(selectedCategoryObj.name, lang)}
                      </h2>
                      <span
                        className={`text-xs font-medium ${
                          isDark ? 'text-[#D8CBBF]' : 'text-[#6D4029]'
                        }`}
                      >
                        ({t('menu.itemsCount', { count: filteredProducts.length })})
                      </span>
                    </div>

                    <button
                      type="button"
                      data-testid="return-to-all-categories"
                      onClick={() => handleSelectCategory(null)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                        isDark
                          ? 'border-[#C5A47A]/40 bg-[#3D261A]/70 text-[#F8F1E9] hover:border-[#C5A47A] hover:bg-[#3D261A]'
                          : 'border-app-border bg-[#FFF9F2] text-[#241B17] hover:border-brand-gold hover:bg-[#F5EFE7]'
                      }`}
                    >
                      <ArrowLeft className="h-3.5 w-3.5 text-[#C5A47A]" />
                      <span>{t('menu.allCategories')}</span>
                    </button>
                  </div>
                )}

                <ProductGrid
                  products={filteredProducts}
                  categoriesById={categoriesById}
                  onSelectProduct={setActiveProduct}
                />
              </section>
            )}
          </div>
        </>
      )}

      <ProductDetailDialog
        product={activeProduct}
        categoryName={activeProduct ? categoriesById[activeProduct.categoryId] : undefined}
        onClose={() => setActiveProduct(null)}
      />
    </PublicLayout>
  );
}
