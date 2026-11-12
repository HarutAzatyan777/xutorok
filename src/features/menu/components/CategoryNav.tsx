import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/themeContext';
import { getLocalizedText } from '../../../lib/utils/format';
import { computeHorizontalPillScrollLeft } from '../hooks/useCategoryScrollSpy';
import type { Language, MenuCategory } from '../../../types';

export interface CategoryNavProps {
  categories: MenuCategory[];
  selectedCategoryId: string | null;
  /** Currently visible category section while scrolling in "All Products" mode */
  activeScrollCategoryId?: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export function CategoryNav({
  categories,
  selectedCategoryId,
  activeScrollCategoryId = null,
  onSelectCategory,
}: CategoryNavProps) {
  const { i18n, t } = useTranslation();
  const lang = (i18n.language?.slice(0, 2) as Language) || 'hy';
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Determine which category pill is visually highlighted:
  // - When a single category is selected (`selectedCategoryId !== null`), that category is active.
  // - When "All Products" is selected (`selectedCategoryId === null`), the scroll-spy category
  //   (`activeScrollCategoryId`) is highlighted while scrolling through sections, or "All Products"
  //   (`__all__`) when at the top above the first category section.
  const visuallyActiveId =
    selectedCategoryId !== null
      ? selectedCategoryId
      : activeScrollCategoryId ?? '__all__';

  useEffect(() => {
    const container = scrollContainerRef.current;
    const activeButton = pillRefs.current[visuallyActiveId];
    if (!container || !activeButton) {
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const targetScrollLeft = computeHorizontalPillScrollLeft({
      containerScrollLeft: container.scrollLeft,
      containerClientWidth: container.clientWidth,
      pillOffsetLeft: activeButton.offsetLeft,
      pillOffsetWidth: activeButton.offsetWidth,
    });

    if (typeof container.scrollTo === 'function') {
      container.scrollTo({
        left: targetScrollLeft,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    } else {
      container.scrollLeft = targetScrollLeft;
    }
  }, [visuallyActiveId]);

  const isAllSelected = selectedCategoryId === null;
  const isAllVisuallyActive = visuallyActiveId === '__all__';

  return (
    <nav
      id="menu-categories-nav"
      data-testid="category-nav"
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

        <div
          ref={scrollContainerRef}
          data-testid="category-nav-scroll-strip"
          className="no-scrollbar flex items-center gap-2 overflow-x-auto py-3 scroll-smooth"
        >
          <button
            ref={(el) => {
              pillRefs.current['__all__'] = el;
            }}
            type="button"
            data-testid="category-pill-all"
            data-category-id="all"
            data-selected={isAllSelected ? 'true' : 'false'}
            data-active={isAllVisuallyActive ? 'true' : 'false'}
            onClick={() => onSelectCategory(null)}
            aria-pressed={isAllSelected}
            className={`inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 ${
              isAllVisuallyActive
                ? 'bg-[#C5A47A] text-[#241B17] font-semibold shadow-xs'
                : isAllSelected
                  ? isDark
                    ? 'border border-[#C5A47A]/80 bg-[#3D261A]/85 text-[#F8F1E9] font-semibold hover:bg-[#3D261A]'
                    : 'border border-brand-gold bg-[#F5EFE7] text-[#241B17] font-semibold hover:bg-[#EDE3D5]'
                  : isDark
                    ? 'border border-[#C5A47A]/30 bg-[#3D261A]/40 text-[#F8F1E9] hover:border-[#C5A47A]/70 hover:bg-[#3D261A] hover:text-white'
                    : 'border border-app-border bg-[#FFF9F2] text-[#241B17] hover:border-brand-gold/70 hover:bg-[#F5EFE7]'
            }`}
          >
            <span>{t('menu.allCategories')}</span>
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            const isScrollActive =
              selectedCategoryId === null && activeScrollCategoryId === cat.id;
            const isActive = isSelected || isScrollActive;
            const label = getLocalizedText(cat.name, lang);

            return (
              <button
                key={cat.id}
                ref={(el) => {
                  pillRefs.current[cat.id] = el;
                }}
                type="button"
                data-testid={`category-pill-${cat.id}`}
                data-category-id={cat.id}
                data-selected={isSelected ? 'true' : 'false'}
                data-scroll-active={isScrollActive ? 'true' : 'false'}
                data-active={isActive ? 'true' : 'false'}
                onClick={() => onSelectCategory(cat.id)}
                aria-pressed={isSelected}
                aria-current={isScrollActive ? 'location' : undefined}
                className={`inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                  isActive
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

