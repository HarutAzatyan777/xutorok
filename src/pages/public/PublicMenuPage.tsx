import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, AlertCircle, RefreshCw, UtensilsCrossed } from 'lucide-react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { CategoryNav } from '../../features/menu/components/CategoryNav';
import { MenuSkeleton } from '../../features/menu/components/MenuSkeleton';
import { ProductCard } from '../../features/menu/components/ProductCard';
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

  const productCountsByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const prod of activeProducts) {
      counts[prod.categoryId] = (counts[prod.categoryId] ?? 0) + 1;
    }
    return counts;
  }, [activeProducts]);

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

  const restaurantName =
    settingsStatus === 'ready' && profile
      ? getLocalizedText(profile.name, lang)
      : '';

  return (
    <PublicLayout
      profile={profile}
      settingsStatus={settingsStatus}
      onRetrySettings={retrySettings}
    >
      {/* Hero / Search Bar Section — stable dimensions during loading */}
      <section className="border-b border-stone-200/60 bg-white pt-6 pb-5">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-h-[3.5rem] flex flex-col justify-center">
              {settingsStatus === 'loading' ? (
                <div
                  data-testid="hero-branding-skeleton"
                  aria-busy="true"
                  className="space-y-2"
                >
                  <div className="h-8 w-44 animate-pulse rounded-lg bg-stone-200/80 sm:h-9 sm:w-56" />
                  <div className="h-4 w-60 animate-pulse rounded bg-stone-200/60" />
                </div>
              ) : settingsStatus === 'error' ? (
                <div
                  data-testid="settings-error-banner"
                  role="alert"
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2 text-xs text-amber-950"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
                  <span>{settingsError || t('menu.errorDescription')}</span>
                  <button
                    type="button"
                    onClick={retrySettings}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-950"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>{t('menu.retry')}</span>
                  </button>
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                    {restaurantName || t('menu.title')}
                  </h1>
                  <p className="mt-1 text-sm text-stone-500">{t('menu.subtitle')}</p>
                </div>
              )}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('menu.searchPlaceholder')}
                aria-label={t('menu.searchPlaceholder')}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/80 py-2.5 pr-9 pl-10 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/15"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label={t('menu.clearSearch')}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-lg p-1 text-stone-400 hover:text-stone-700"
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
          <h2 className="mt-4 text-lg font-bold text-stone-900">{t('menu.errorTitle')}</h2>
          <p className="mt-1.5 text-sm text-stone-500">{t('menu.errorDescription')}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-950"
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
            productCountsByCategory={productCountsByCategory}
            totalProductCount={activeProducts.length}
          />

          <div className="mx-auto max-w-6xl px-4 py-6">
            {activeProducts.length === 0 ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center">
                <UtensilsCrossed className="mx-auto h-10 w-10 text-stone-400 stroke-[1.5]" />
                <h2 className="mt-3 text-lg font-bold text-stone-900">
                  {t('menu.menuEmptyTitle')}
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  {t('menu.menuEmptyDescription')}
                </p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center">
                <Search className="mx-auto h-10 w-10 text-stone-400 stroke-[1.5]" />
                <h2 className="mt-3 text-lg font-bold text-stone-900">
                  {t('menu.emptyTitle')}
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  {t('menu.emptyDescription')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategoryId(null);
                  }}
                  className="mt-4 inline-flex items-center rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  {t('menu.clearSearch')}
                </button>
              </div>
            ) : groupedByCategory ? (
              <div className="space-y-10">
                {groupedByCategory.map(({ category, items }) => (
                  <section key={category.id} aria-labelledby={`cat-heading-${category.id}`}>
                    <div className="mb-4 flex items-baseline justify-between border-b border-stone-200/80 pb-2">
                      <h2
                        id={`cat-heading-${category.id}`}
                        className="text-xl font-bold text-stone-900"
                      >
                        {getLocalizedText(category.name, lang)}
                      </h2>
                      <span className="text-xs font-medium text-stone-500">
                        {t('menu.itemsCount', { count: items.length })}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onSelect={setActiveProduct}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    categoryName={categoriesById[product.categoryId]}
                    onSelect={setActiveProduct}
                  />
                ))}
              </div>
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
