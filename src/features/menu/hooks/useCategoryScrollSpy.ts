import { useCallback, useEffect, useRef, useState } from 'react';

export const DEFAULT_MOBILE_HEADER_HEIGHT = 56;
export const DEFAULT_DESKTOP_HEADER_HEIGHT = 64;
export const DEFAULT_CATEGORY_NAV_HEIGHT = 60;
export const STICKY_SECTION_BREATHING_ROOM = 16;

export interface SectionPositionSnapshot {
  categoryId: string;
  top: number;
  bottom: number;
}

export interface StickyOffsetMeasurementInput {
  viewportWidth?: number;
  headerHeight?: number | null;
  categoryNavHeight?: number | null;
  breathingRoom?: number;
}

/**
 * Computes the total sticky top offset (sticky header + sticky category strip + breathing room)
 * so category section headings are never hidden behind sticky bars and scroll-spy triggers
 * align accurately with the visible reading line.
 */
export function computeStickyMenuOffset({
  viewportWidth = 1024,
  headerHeight,
  categoryNavHeight,
  breathingRoom = STICKY_SECTION_BREATHING_ROOM,
}: StickyOffsetMeasurementInput = {}): number {
  const defaultHeader =
    viewportWidth >= 640 ? DEFAULT_DESKTOP_HEADER_HEIGHT : DEFAULT_MOBILE_HEADER_HEIGHT;
  const resolvedHeader =
    typeof headerHeight === 'number' && headerHeight > 0 ? headerHeight : defaultHeader;
  const resolvedCategoryNav =
    typeof categoryNavHeight === 'number' && categoryNavHeight > 0
      ? categoryNavHeight
      : DEFAULT_CATEGORY_NAV_HEIGHT;

  return Math.round(resolvedHeader + resolvedCategoryNav + breathingRoom);
}

/**
 * Deterministically resolves the currently active category section from viewport-relative
 * section bounds (`getBoundingClientRect().top` and `.bottom`).
 *
 * Rules:
 * - Works identically during both downward and upward scrolling.
 * - Uses an activation line slightly below the sticky header + category bar (`stickyOffset + 24px`).
 * - Returns `null` when the user is near the top of the page above the first category section
 *   (so "All Products" remains highlighted before entering individual category sections).
 * - Selects the last section whose top has crossed or reached the activation line and whose
 *   bottom is still visible below the sticky offset.
 * - If between two sections' gaps, selects the section whose top has already passed the line.
 */
export function resolveActiveCategoryFromSections(
  sections: readonly SectionPositionSnapshot[],
  stickyOffset: number,
  scrollY: number = 0
): string | null {
  if (sections.length === 0) {
    return null;
  }

  const activationLine = stickyOffset + 24;
  const firstSection = sections[0];

  // When at the top of the page and the first category section hasn't reached the activation zone yet,
  // keep "All Products" highlighted (activeScrollCategoryId = null).
  if (scrollY <= 12 && firstSection.top > activationLine + 16) {
    return null;
  }
  if (firstSection.top > activationLine + 48) {
    return null;
  }

  let activeId: string | null = null;

  for (const section of sections) {
    if (section.top <= activationLine) {
      activeId = section.categoryId;
    } else {
      break;
    }
  }

  return activeId ?? firstSection.categoryId;
}

export interface HorizontalPillMetrics {
  containerScrollLeft: number;
  containerClientWidth: number;
  pillOffsetLeft: number;
  pillOffsetWidth: number;
}

/**
 * Computes the horizontal `scrollLeft` target that centers (or brings clearly into view)
 * the active category pill inside the horizontal category navigation strip on mobile/desktop.
 */
export function computeHorizontalPillScrollLeft({
  containerScrollLeft,
  containerClientWidth,
  pillOffsetLeft,
  pillOffsetWidth,
}: HorizontalPillMetrics): number {
  if (containerClientWidth <= 0) {
    return 0;
  }

  const targetCenter = pillOffsetLeft + pillOffsetWidth / 2;
  const idealScrollLeft = targetCenter - containerClientWidth / 2;

  return Math.max(0, Math.round(idealScrollLeft ?? containerScrollLeft));
}

/**
 * Computes the exact window `scrollTo({ top })` target for a category section element
 * so its heading lands cleanly below the sticky header + sticky category navigation bar.
 */
export function computeCategorySectionScrollTop(
  sectionRectTop: number,
  currentScrollY: number,
  stickyOffset: number
): number {
  return Math.max(0, Math.round(currentScrollY + sectionRectTop - stickyOffset));
}

export interface UseCategoryScrollSpyOptions {
  /** Whether "All Products" mode is currently active (`selectedCategoryId === null`) */
  enabled: boolean;
  /** Ordered list of visible category IDs */
  categoryIds: readonly string[];
}

export interface UseCategoryScrollSpyResult {
  activeScrollCategoryId: string | null;
  stickyOffset: number;
  scrollToCategorySection: (categoryId: string | null) => void;
}

/**
 * Smart Category Scroll Spy hook for the Xutorok public menu:
 * - Observes category sections (`#category-section-${id}`) using `IntersectionObserver`
 *   combined with requestAnimationFrame-throttled scroll evaluation.
 * - Accurately tracks both downward and upward scrolling without flickering.
 * - Suppresses intermediate observer updates during programmatic smooth scrolling
 *   triggered by clicking a category button.
 */
export function useCategoryScrollSpy({
  enabled,
  categoryIds,
}: UseCategoryScrollSpyOptions): UseCategoryScrollSpyResult {
  const [activeScrollCategoryId, setActiveScrollCategoryId] = useState<string | null>(null);
  const [stickyOffset, setStickyOffset] = useState<number>(() =>
    computeStickyMenuOffset({
      viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1024,
    })
  );

  const programmaticTargetRef = useRef<string | null>(null);
  const programmaticTimeoutRef = useRef<number | null>(null);

  const measureCurrentStickyOffset = useCallback((): number => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return computeStickyMenuOffset();
    }

    const headerEl = document.querySelector<HTMLElement>('[data-testid="public-header"]');
    const navEl = document.getElementById('menu-categories-nav');

    return computeStickyMenuOffset({
      viewportWidth: window.innerWidth,
      headerHeight: headerEl?.getBoundingClientRect().height ?? null,
      categoryNavHeight: navEl?.getBoundingClientRect().height ?? null,
    });
  }, []);

  const evaluateActiveSection = useCallback(() => {
    if (!enabled || typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    // While a programmatic smooth scroll is in flight, hold the target category active
    // to prevent intermediate section flicker.
    if (programmaticTargetRef.current !== null) {
      return;
    }

    const currentOffset = measureCurrentStickyOffset();
    setStickyOffset((prev) => (prev === currentOffset ? prev : currentOffset));

    const snapshots: SectionPositionSnapshot[] = [];
    for (const categoryId of categoryIds) {
      const sectionEl = document.getElementById(`category-section-${categoryId}`);
      if (!sectionEl) continue;
      const rect = sectionEl.getBoundingClientRect();
      snapshots.push({
        categoryId,
        top: rect.top,
        bottom: rect.bottom,
      });
    }

    const resolved = resolveActiveCategoryFromSections(
      snapshots,
      currentOffset,
      window.scrollY || window.pageYOffset || 0
    );

    setActiveScrollCategoryId((prev) => (prev === resolved ? prev : resolved));
  }, [categoryIds, enabled, measureCurrentStickyOffset]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    let rafId: number | null = null;
    const scheduleEvaluation = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        evaluateActiveSection();
      });
    };

    scheduleEvaluation();

    window.addEventListener('scroll', scheduleEvaluation, { passive: true });
    window.addEventListener('resize', scheduleEvaluation, { passive: true });

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      const offsetPx = measureCurrentStickyOffset();
      observer = new IntersectionObserver(
        () => {
          scheduleEvaluation();
        },
        {
          root: null,
          rootMargin: `-${offsetPx}px 0px -55% 0px`,
          threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
        }
      );

      for (const categoryId of categoryIds) {
        const el = document.getElementById(`category-section-${categoryId}`);
        if (el) {
          observer.observe(el);
        }
      }
    }

    return () => {
      window.removeEventListener('scroll', scheduleEvaluation);
      window.removeEventListener('resize', scheduleEvaluation);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      if (observer) {
        observer.disconnect();
      }
    };
  }, [categoryIds, enabled, evaluateActiveSection, measureCurrentStickyOffset]);

  useEffect(() => {
    return () => {
      if (programmaticTimeoutRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(programmaticTimeoutRef.current);
      }
    };
  }, []);

  const scrollToCategorySection = useCallback(
    (categoryId: string | null) => {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return;
      }

      const prefersReducedMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const behavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';
      const currentOffset = measureCurrentStickyOffset();
      setStickyOffset(currentOffset);

      if (programmaticTimeoutRef.current !== null) {
        window.clearTimeout(programmaticTimeoutRef.current);
        programmaticTimeoutRef.current = null;
      }

      if (categoryId === null) {
        programmaticTargetRef.current = null;
        setActiveScrollCategoryId(null);
        return;
      }

      programmaticTargetRef.current = categoryId;
      setActiveScrollCategoryId(categoryId);

      // Wait one animation frame so if React just switched from another category to this one,
      // the target `#category-section-${categoryId}` is mounted in the DOM.
      window.requestAnimationFrame(() => {
        const sectionEl = document.getElementById(`category-section-${categoryId}`);
        if (sectionEl) {
          const rect = sectionEl.getBoundingClientRect();
          const currentScrollY = window.scrollY || window.pageYOffset || 0;
          const targetTop = computeCategorySectionScrollTop(
            rect.top,
            currentScrollY,
            currentOffset
          );

          window.scrollTo({
            top: targetTop,
            behavior,
          });
        }

        programmaticTimeoutRef.current = window.setTimeout(() => {
          programmaticTargetRef.current = null;
          programmaticTimeoutRef.current = null;
        }, prefersReducedMotion ? 50 : 550);
      });
    },
    [measureCurrentStickyOffset]
  );

  return {
    activeScrollCategoryId: enabled ? activeScrollCategoryId : null,
    stickyOffset,
    scrollToCategorySection,
  };
}
