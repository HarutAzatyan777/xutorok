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
      className="sticky top-[69px] z-20 border-b border-app-border bg-app-bg/95 backdrop-blur-md"
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto py-3">
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            aria-pressed={selectedCategoryId === null}
            className={`inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              selectedCategoryId === null
                ? 'bg-brand-primary text-white shadow-xs'
                : 'border border-app-border bg-white text-app-text-secondary hover:border-brand-gold/70 hover:bg-app-surface-muted hover:text-app-text'
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
                className={`inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-brand-primary text-white shadow-xs'
                    : 'border border-app-border bg-white text-app-text-secondary hover:border-brand-gold/70 hover:bg-app-surface-muted hover:text-app-text'
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
