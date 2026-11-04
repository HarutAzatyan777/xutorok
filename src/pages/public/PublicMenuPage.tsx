import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, RefreshCw, UtensilsCrossed } from 'lucide-react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { CategoryNav } from '../../features/menu/components/CategoryNav';
import { MenuSkeleton } from '../../features/menu/components/MenuSkeleton';
import { ProductGrid } from '../../features/menu/components/ProductGrid';
import { ProductDetailDialog } from '../../features/menu/components/ProductDetailDialog';
import { usePublicMenu } from '../../features/menu/hooks/usePublicMenu';
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

  const filteredProducts = useMemo(() => {
    return activeProducts.filter((prod) => {
      if (selectedCategoryId && prod.categoryId !== selectedCategoryId) {
        return false;
      }
      return true;
    });
  }, [activeProducts, selectedCategoryId]);

  const groupedByCategory = useMemo(() => {
    if (selectedCategoryId) {
      return null;
    }
    return categories
      .map((category) => ({
        category,
        items: filteredProducts.filter((p) => p.categoryId === category.id),
      }))
      .filter((group) => group.items.length > 0);
  }, [categories, filteredProducts, selectedCategoryId]);

  return (
    <PublicLayout
      profile={profile}
      settingsStatus={settingsStatus}
      onRetrySettings={retrySettings}
      onNavigateToCategories={handleNavigateToCategories}
    >
      {/* 1) Hero Section with Centered Large Logo and Subtitle (Dark in dark mode, Warm Light in light mode) */}
      <section
        data-testid="hero-section"
        className={`relative border-b pt-8 pb-8 sm:pt-10 sm:pb-10 transition-colors duration-200 ${
          isDark
            ? 'border-[#4A2C16] bg-[#2F1E14] text-[#F4EEE8]'
            : 'border-app-border bg-white text-app-text'
        }`}
      >
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 text-center">
          {/* Centered Large Logo loaded from Firebase settings — The ONLY logo on the page */}
          <div className="flex items-center justify-center min-h-[90px] sm:min-h-[110px]">
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
              <img
                src={rawLogoUrl}
                alt={t('menu.title')}
                onError={() => setFailedHeroLogoUrl(rawLogoUrl)}
                className={`h-16 sm:h-20 md:h-24 w-auto max-w-[200px] sm:max-w-[240px] md:max-w-[280px] object-contain drop-shadow-md transition-all duration-300 ${
                  isDark ? 'brightness-0 invert opacity-95' : 'opacity-100'
                }`}
              />
            ) : (
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
                  isDark ? 'bg-[#3D261A] text-[#C8A77A]' : 'bg-app-surface-muted text-brand-primary'
                }`}
              >
                <UtensilsCrossed className="h-9 w-9" />
              </div>
            )}
          </div>

          {/* Heading & Localized Subtitle */}
          <h1
            data-testid="menu-main-heading"
            className={`mt-3 text-2xl font-bold tracking-tight sm:text-3xl ${
              isDark ? 'text-[#F4EEE8]' : 'text-app-text'
            }`}
          >
            {t('menu.title')}
          </h1>

          <p
            data-testid="menu-main-subtitle"
            className={`mt-1 text-sm font-medium sm:text-base ${
              isDark ? 'text-[#C8B9AD]' : 'text-app-text-muted'
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
                  ? 'border-[#4A2C16] bg-[#3D261A] text-[#F4EEE8]'
                  : 'border-app-border bg-app-surface-muted text-app-text'
              }`}
            >
              <AlertCircle
                className={`h-4 w-4 shrink-0 ${
                  isDark ? 'text-[#C8A77A]' : 'text-brand-primary'
                }`}
              />
              <span>{settingsError || t('menu.errorDescription')}</span>
              <button
                type="button"
                onClick={retrySettings}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                  isDark
                    ? 'bg-[#C8A77A] text-[#2F1E14] hover:bg-[#d6b78d]'
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
            onSelectCategory={setSelectedCategoryId}
          />

          <div className="mx-auto max-w-6xl px-4 py-6">
            {activeProducts.length === 0 ? (
              <div className="rounded-2xl border border-app-border bg-app-surface p-12 text-center">
                <UtensilsCrossed className="mx-auto h-10 w-10 text-app-text-muted stroke-[1.5]" />
                <h2 className="mt-3 text-lg font-bold text-app-text">
                  {t('menu.menuEmptyTitle')}
                </h2>
                <p className="mt-1 text-sm text-app-text-muted">
                  {t('menu.menuEmptyDescription')}
                </p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-app-border bg-app-surface p-12 text-center">
                <UtensilsCrossed className="mx-auto h-10 w-10 text-app-text-muted stroke-[1.5]" />
                <h2 className="mt-3 text-lg font-bold text-app-text">
                  {t('menu.emptyTitle')}
                </h2>
                <p className="mt-1 text-sm text-app-text-muted">
                  {t('menu.emptyDescription')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(null);
                  }}
                  className="mt-4 inline-flex items-center rounded-xl border border-app-border bg-app-surface px-4 py-2 text-xs font-semibold text-app-text hover:bg-app-surface-muted"
                >
                  {t('menu.allCategories')}
                </button>
              </div>
            ) : groupedByCategory ? (
              <div className="space-y-10">
                {groupedByCategory.map(({ category, items }) => (
                  <section key={category.id} aria-labelledby={`cat-heading-${category.id}`}>
                    <div className="mb-4 flex items-baseline justify-between border-b border-app-border pb-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold"
                        />
                        <h2
                          id={`cat-heading-${category.id}`}
                          className="text-lg font-bold text-app-text sm:text-xl"
                        >
                          {getLocalizedText(category.name, lang)}
                        </h2>
                      </div>
                      <span className="text-xs font-medium text-app-text-muted">
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
              <ProductGrid
                products={filteredProducts}
                categoriesById={categoriesById}
                onSelectProduct={setActiveProduct}
              />
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
