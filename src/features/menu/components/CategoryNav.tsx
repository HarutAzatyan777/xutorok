import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/themeContext';
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
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <nav
      id="menu-categories-nav"
      aria-label="Menu categories"
      className={`sticky top-14 sm:top-16 z-20 border-b backdrop-blur-md transition-colors duration-200 ${
        isDark
          ? 'border-[#4A2C16] bg-[#302019]/95'
          : 'border-app-border bg-[#FBF7F2]/95'
      }`}
    >
      <div className="relative mx-auto max-w-6xl px-4">
        {/* Right-edge subtle gradient fade indicating more horizontal categories */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute right-4 top-0 bottom-0 w-8 z-10 transition-opacity duration-200 ${
            isDark
              ? 'bg-gradient-to-l from-[#302019] to-transparent'
              : 'bg-gradient-to-l from-[#FBF7F2] to-transparent'
          }`}
        />

        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto py-3">
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            aria-pressed={selectedCategoryId === null}
            className={`inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              selectedCategoryId === null
                ? 'bg-[#C5A47A] text-[#241B17] font-semibold shadow-xs'
                : isDark
                  ? 'border border-[#C5A47A]/30 bg-[#3D261A]/40 text-[#F8F1E9] hover:border-[#C5A47A]/70 hover:bg-[#3D261A] hover:text-white'
                  : 'border border-app-border bg-[#FFF9F2] text-[#241B17] hover:border-brand-gold/70 hover:bg-[#F5EFE7]'
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
                    ? 'bg-[#C5A47A] text-[#241B17] font-semibold shadow-xs'
                    : isDark
                      ? 'border border-[#C5A47A]/30 bg-[#3D261A]/40 text-[#F8F1E9] hover:border-[#C5A47A]/70 hover:bg-[#3D261A] hover:text-white'
                      : 'border border-app-border bg-[#FFF9F2] text-[#241B17] hover:border-brand-gold/70 hover:bg-[#F5EFE7]'
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
