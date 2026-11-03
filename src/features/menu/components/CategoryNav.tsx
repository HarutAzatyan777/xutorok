import { useTranslation } from 'react-i18next';
import { getLocalizedText } from '../../../lib/utils/format';
import type { Language, MenuCategory } from '../../../types';

interface CategoryNavProps {
  categories: MenuCategory[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export function CategoryNav({
  categories,
  selectedCategoryId,
  onSelectCategory,
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
            className={`inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium transition-all ${
              selectedCategoryId === null
                ? 'bg-amber-900 text-white shadow-xs'
                : 'border border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50'
            }`}
          >
            <span>{t('menu.allCategories')}</span>
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            const label = getLocalizedText(cat.name, lang);

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                aria-pressed={isSelected}
                className={`inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-amber-900 text-white shadow-xs'
                    : 'border border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50'
                }`}
              >
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
