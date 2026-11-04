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
      className={`sticky top-[69px] z-20 border-b backdrop-blur-md transition-colors duration-200 ${
        isDark
          ? 'border-[#4A2C16] bg-[#23160e]/95'
          : 'border-app-border bg-[#FBF7F2]/95'
      }`}
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto py-3">
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            aria-pressed={selectedCategoryId === null}
            className={`inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              selectedCategoryId === null
                ? isDark
                  ? 'bg-[#C8A77A] text-[#23160e] font-semibold shadow-xs'
                  : 'bg-[#2F1E14] text-[#F4EEE8] shadow-xs'
                : isDark
                  ? 'border border-[#4A2C16] bg-[#2F1E14] text-[#D8CBBF] hover:border-[#C8A77A]/70 hover:bg-[#3D261A] hover:text-[#F4EEE8]'
                  : 'border border-app-border bg-white text-app-text-secondary hover:border-brand-gold/70 hover:bg-[#F5EFE7] hover:text-app-text'
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
                    ? isDark
                      ? 'bg-[#C8A77A] text-[#23160e] font-semibold shadow-xs'
                      : 'bg-[#2F1E14] text-[#F4EEE8] shadow-xs'
                    : isDark
                      ? 'border border-[#4A2C16] bg-[#2F1E14] text-[#D8CBBF] hover:border-[#C8A77A]/70 hover:bg-[#3D261A] hover:text-[#F4EEE8]'
                      : 'border border-app-border bg-white text-app-text-secondary hover:border-brand-gold/70 hover:bg-[#F5EFE7] hover:text-app-text'
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
