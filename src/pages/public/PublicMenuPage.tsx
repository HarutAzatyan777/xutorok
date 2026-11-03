import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, AlertCircle, RefreshCw, UtensilsCrossed } from 'lucide-react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { CategoryNav } from '../../features/menu/components/CategoryNav';
import { MenuSkeleton } from '../../features/menu/components/MenuSkeleton';
import { ProductGrid } from '../../features/menu/components/ProductGrid';
import { ProductDetailDialog } from '../../features/menu/components/ProductDetailDialog';
import { usePublicMenu } from '../../features/menu/hooks/usePublicMenu';
import { getLocalizedText } from '../../lib/utils/format';
import type { Language, MenuProduct } from '../../types';

export function PublicMenuPage() {
  const { i18n, t } = useTranslation();
  const lang = (i18n.language?.slice(0, 2) as Language) || 'hy';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeProduct, setActiveProduct] = useState<MenuProduct | null>(null);

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
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return activeProducts.filter((prod) => {
      if (selectedCategoryId && prod.categoryId !== selectedCategoryId) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      const matchesName =
        prod.name.hy.toLowerCase().includes(normalizedSearch) ||
        prod.name.ru.toLowerCase().includes(normalizedSearch) ||
        prod.name.en.toLowerCase().includes(normalizedSearch);
      const matchesDesc =
        (prod.description?.hy?.toLowerCase().includes(normalizedSearch) ?? false) ||
        (prod.description?.ru?.toLowerCase().includes(normalizedSearch) ?? false) ||
        (prod.description?.en?.toLowerCase().includes(normalizedSearch) ?? false);
      return matchesName || matchesDesc;
    });
  }, [activeProducts, selectedCategoryId, searchQuery]);

  const groupedByCategory = useMemo(() => {
    if (selectedCategoryId || searchQuery.trim()) {
      return null;
    }
    return categories
      .map((category) => ({
        category,
        items: filteredProducts.filter((p) => p.categoryId === category.id),
      }))
      .filter((group) => group.items.length > 0);
  }, [categories, filteredProducts, selectedCategoryId, searchQuery]);

  return (
    <PublicLayout
      profile={profile}
      settingsStatus={settingsStatus}
      onRetrySettings={retrySettings}
    >
      {/* Main Heading & Search Section */}
      <section className="border-b border-app-border bg-white pt-5 pb-4 sm:pt-6 sm:pb-5">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="h-5 w-1 shrink-0 rounded-full bg-brand-gold"
                />
                <h1
                  data-testid="menu-main-heading"
                  className="text-2xl font-bold tracking-tight text-app-text sm:text-3xl"
                >
                  {t('menu.title')}
                </h1>
              </div>
              <p
                data-testid="menu-main-subtitle"
                className="mt-1 pl-3.5 text-xs text-app-text-muted sm:text-sm"
              >
                {t('menu.subtitle')}
              </p>

              {settingsStatus === 'error' && (
                <div
                  data-testid="settings-error-banner"
                  role="alert"
                  className="mt-2.5 flex flex-wrap items-center gap-2.5 rounded-xl border border-app-border bg-app-surface-muted px-3 py-1.5 text-xs text-app-text"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-brand-primary" />
                  <span>{settingsError || t('menu.errorDescription')}</span>
                  <button
                    type="button"
                    onClick={retrySettings}
                    className="inline-flex items-center gap-1 rounded-lg bg-brand-primary px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-primary-hover"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>{t('menu.retry')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-app-text-muted" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('menu.searchPlaceholder')}
                aria-label={t('menu.searchPlaceholder')}
                className="w-full rounded-xl border border-app-border bg-app-bg/70 py-2.5 pr-9 pl-10 text-sm text-app-text placeholder:text-app-text-muted focus:border-brand-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/15"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label={t('menu.clearSearch')}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-lg p-1 text-app-text-muted hover:text-app-text"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

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
              <div className="rounded-2xl border border-app-border bg-white p-12 text-center">
                <UtensilsCrossed className="mx-auto h-10 w-10 text-app-text-muted stroke-[1.5]" />
                <h2 className="mt-3 text-lg font-bold text-app-text">
                  {t('menu.menuEmptyTitle')}
                </h2>
                <p className="mt-1 text-sm text-app-text-muted">
                  {t('menu.menuEmptyDescription')}
                </p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-app-border bg-white p-12 text-center">
                <Search className="mx-auto h-10 w-10 text-app-text-muted stroke-[1.5]" />
                <h2 className="mt-3 text-lg font-bold text-app-text">
                  {t('menu.emptyTitle')}
                </h2>
                <p className="mt-1 text-sm text-app-text-muted">
                  {t('menu.emptyDescription')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategoryId(null);
                  }}
                  className="mt-4 inline-flex items-center rounded-xl border border-app-border bg-white px-4 py-2 text-xs font-semibold text-app-text hover:bg-app-surface-muted"
                >
                  {t('menu.clearSearch')}
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
