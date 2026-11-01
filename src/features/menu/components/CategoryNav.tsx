import { useTranslation } from 'react-i18next';
import { getLocalizedText } from '../../../lib/utils/format';
import type { Language, MenuCategory } from '../../../types';

interface CategoryNavProps {
  categories: MenuCategory[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  productCountsByCategory: Record<string, number>;
  totalProductCount: number;
}

export function CategoryNav({
  categories,
  selectedCategoryId,
  onSelectCategory,
  productCountsByCategory,
  totalProductCount,
}: CategoryNavProps) {
  const { i18n, t } = useTranslation();
  const lang = (i18n.language?.slice(0, 2) as Language) || 'hy';

  return (
    <nav
      aria-label="Menu categories"
      className="sticky top-[69px] z-20 border-b border-stone-200/80 bg-[#faf9f6]/95 backdrop-blur-md"
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto py-3">
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            aria-pressed={selectedCategoryId === null}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              selectedCategoryId === null
                ? 'bg-amber-900 text-white shadow-xs'
                : 'border border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50'
            }`}
          >
            <span>{t('menu.allCategories')}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs ${
                selectedCategoryId === null
                  ? 'bg-white/20 text-white'
                  : 'bg-stone-100 text-stone-500'
              }`}
            >
              {totalProductCount}
            </span>
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            const count = productCountsByCategory[cat.id] ?? 0;
            const label = getLocalizedText(cat.name, lang);

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                aria-pressed={isSelected}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-amber-900 text-white shadow-xs'
                    : 'border border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

