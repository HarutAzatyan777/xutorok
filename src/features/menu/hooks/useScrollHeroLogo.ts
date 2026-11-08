import { useCallback, useEffect, useRef } from 'react';

export const MOBILE_MAX_HEADER_LOGO_HEIGHT = 34;
export const DESKTOP_MAX_HEADER_LOGO_HEIGHT = 40;
export const MIN_HEADER_VERTICAL_CLEARANCE = 10;
export const MIN_HEADER_HORIZONTAL_GAP = 12;

export interface ScrollLogoGeometryInput {
  viewportWidth: number;
  scrollY: number;
  baseWidth: number;
  baseHeight: number;
  anchorRect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  headerHeight: number;
  leftControlRight: number;
  rightControlLeft: number;
}

export interface ScrollLogoMetrics {
  baseWidth: number;
  baseHeight: number;
  startCenterX: number;
  startCenterY: number;
  targetCenterX: number;
  targetCenterY: number;
  targetScale: number;
  finalWidth: number;
  finalHeight: number;
  verticalClearance: number;
  scrollDistance: number;
}

export interface ScrollLogoTransformState {
  progress: number;
  isAtTop: boolean;
  isDocked: boolean;
  scale: number;
  tx: number;
  ty: number;
  visualWidth: number;
  visualHeight: number;
  centerX: number;
  centerY: number;
}

/**
 * Computes the start (hero) and end (sticky header center) geometry and scale
 * for the single scroll-animated restaurant logo.
 *
 * Guarantees:
 * - Desktop (>= 640px): final logo height <= 40px
 * - Mobile (< 640px): final logo height <= 34px
 * - At least 10px vertical clearance from top and bottom edges of the header
 * - Uniform scaling preserving original aspect ratio (never stretched or cropped)
 * - Horizontal centering in the viewport without overlapping left/right header controls
 */
export function computeScrollLogoMetrics(
  input: ScrollLogoGeometryInput
): ScrollLogoMetrics {
  const isDesktop = input.viewportWidth >= 640;
  const baseWidth = Math.max(1, input.baseWidth);
  const baseHeight = Math.max(1, input.baseHeight);

  const headerHeight =
    input.headerHeight > 0 ? input.headerHeight : isDesktop ? 64 : 56;

  const maxRoleHeight = isDesktop
    ? DESKTOP_MAX_HEADER_LOGO_HEIGHT
    : MOBILE_MAX_HEADER_LOGO_HEIGHT;
  const maxClearanceHeight = Math.max(
    16,
    headerHeight - MIN_HEADER_VERTICAL_CLEARANCE * 2
  );
  const targetMaxHeight = Math.min(maxRoleHeight, maxClearanceHeight);

  const targetCenterX = input.viewportWidth / 2;
  const targetCenterY = headerHeight / 2;

  const distToLeft =
    targetCenterX - input.leftControlRight - MIN_HEADER_HORIZONTAL_GAP;
  const distToRight =
    input.rightControlLeft - targetCenterX - MIN_HEADER_HORIZONTAL_GAP;
  const safeHalfWidth = Math.min(distToLeft, distToRight);
  const targetMaxWidth = Math.max(48, safeHalfWidth * 2);

  const scaleByHeight = targetMaxHeight / baseHeight;
  const scaleByWidth = targetMaxWidth / baseWidth;
  const targetScale = Math.min(1, scaleByHeight, scaleByWidth);

  const finalWidth = baseWidth * targetScale;
  const finalHeight = baseHeight * targetScale;
  const verticalClearance = (headerHeight - finalHeight) / 2;

  const startCenterX = input.anchorRect.left + input.anchorRect.width / 2;
  const startCenterY =
    input.anchorRect.top + input.scrollY + input.anchorRect.height / 2;

  const scrollDistance = Math.max(48, startCenterY - targetCenterY);

  return {
    baseWidth,
    baseHeight,
    startCenterX,
    startCenterY,
    targetCenterX,
    targetCenterY,
    targetScale,
    finalWidth,
    finalHeight,
    verticalClearance,
    scrollDistance,
  };
}

/**
 * Interpolates the logo's viewport center position and uniform scale for a given scrollY.
 */
export function computeScrollLogoTransformState(
  scrollY: number,
  metrics: ScrollLogoMetrics,
  prefersReducedMotion = false
): ScrollLogoTransformState {
  const clampedScrollY = Math.max(0, scrollY);
  const rawProgress = Math.min(1, clampedScrollY / metrics.scrollDistance);
  const progress = prefersReducedMotion
    ? rawProgress >= 0.5
      ? 1
      : 0
    : rawProgress;

  const isAtTop = progress <= 0.0001;
  const isDocked = progress >= 0.9999;

  const centerX =
    metrics.startCenterX +
    (metrics.targetCenterX - metrics.startCenterX) * progress;
  const centerY =
    metrics.startCenterY +
    (metrics.targetCenterY - metrics.startCenterY) * progress;
  const scale = 1 + (metrics.targetScale - 1) * progress;

  const tx = centerX - metrics.baseWidth / 2;
  const ty = centerY - metrics.baseHeight / 2;

  return {
    progress,
    isAtTop,
    isDocked,
    scale,
    tx,
    ty,
    visualWidth: metrics.baseWidth * scale,
    visualHeight: metrics.baseHeight * scale,
    centerX,
    centerY,
  };
}

interface UseScrollHeroLogoOptions {
  enabled: boolean;
  logoKey?: string;
}

export function useScrollHeroLogo({
  enabled,
  logoKey,
}: UseScrollHeroLogoOptions) {
  const heroAnchorRef = useRef<HTMLDivElement | null>(null);
  const animatedLogoRef = useRef<HTMLDivElement | null>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);

  const metricsRef = useRef<ScrollLogoMetrics | null>(null);
  const lastAppliedProgressRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const reducedMotionRef = useRef<boolean>(false);

  const applyCurrentScroll = useCallback((forceUpdate = false) => {
    const logoEl = animatedLogoRef.current;
    const metrics = metricsRef.current;
    if (!logoEl || !metrics) return;

    const scrollY = window.scrollY || window.pageYOffset || 0;
    const state = computeScrollLogoTransformState(
      scrollY,
      metrics,
      reducedMotionRef.current
    );

    if (
      !forceUpdate &&
      lastAppliedProgressRef.current !== null &&
      Math.abs(lastAppliedProgressRef.current - state.progress) < 0.0001
    ) {
      return;
    }

    lastAppliedProgressRef.current = state.progress;

    if (state.isAtTop) {
      logoEl.style.position = 'relative';
      logoEl.style.left = '';
      logoEl.style.top = '';
      logoEl.style.width = '';
      logoEl.style.height = '';
      logoEl.style.transform = 'translate3d(0px, 0px, 0) scale(1)';
      logoEl.dataset.docked = 'false';
      logoEl.dataset.scrollState = 'hero';
    } else {
      logoEl.style.position = 'fixed';
      logoEl.style.left = '0px';
      logoEl.style.top = '0px';
      logoEl.style.width = `${metrics.baseWidth}px`;
      logoEl.style.height = `${metrics.baseHeight}px`;
      logoEl.style.transform = `translate3d(${state.tx.toFixed(2)}px, ${state.ty.toFixed(2)}px, 0) scale(${state.scale.toFixed(4)})`;
      logoEl.dataset.docked = state.isDocked ? 'true' : 'false';
      logoEl.dataset.scrollState = state.isDocked ? 'header' : 'transitioning';
    }
  }, []);

  const measureAndSync = useCallback(() => {
    if (typeof window === 'undefined' || !enabled) return;

    const anchorEl = heroAnchorRef.current;
    const logoEl = animatedLogoRef.current;
    if (!anchorEl || !logoEl) return;

    // Temporarily clear fixed width/height override so responsive classes determine natural hero size
    logoEl.style.width = '';
    logoEl.style.height = '';

    const vw = document.documentElement.clientWidth || window.innerWidth;
    const isDesktop = vw >= 640;

    const visualEl = logoImgRef.current ?? logoEl;
    const rawWidth = visualEl.offsetWidth;
    const rawHeight = visualEl.offsetHeight;

    const baseWidth = rawWidth > 0 ? rawWidth : isDesktop ? 225 : 165;
    const baseHeight = rawHeight > 0 ? rawHeight : isDesktop ? 100 : 74;

    // Reserve exact in-flow height on hero anchor to prevent any layout shift (CLS = 0)
    const minAnchorHeight = isDesktop ? 100 : 80;
    anchorEl.style.minHeight = `${Math.max(minAnchorHeight, Math.ceil(baseHeight))}px`;

    const anchorRect = anchorEl.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset || 0;

    const headerEl = document.querySelector<HTMLElement>(
      '[data-testid="public-header"]'
    );
    const headerRect = headerEl?.getBoundingClientRect();
    const headerHeight =
      headerRect && headerRect.height > 0
        ? headerRect.height
        : isDesktop
          ? 64
          : 56;

    const leftControlEl =
      headerEl?.querySelector<HTMLElement>('[data-header-left]');
    const rightControlEl =
      headerEl?.querySelector<HTMLElement>('[data-header-right]');

    const leftControlRight =
      leftControlEl?.getBoundingClientRect().right ?? 56;
    const rightControlLeft =
      rightControlEl?.getBoundingClientRect().left ?? vw - 132;

    metricsRef.current = computeScrollLogoMetrics({
      viewportWidth: vw,
      scrollY,
      baseWidth,
      baseHeight,
      anchorRect: {
        left: anchorRect.left,
        top: anchorRect.top,
        width: anchorRect.width,
        height: anchorRect.height,
      },
      headerHeight,
      leftControlRight,
      rightControlLeft,
    });

    applyCurrentScroll(true);
  }, [applyCurrentScroll, enabled]);

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) return;

    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = Boolean(mediaQuery?.matches);

    const handleMotionPreferenceChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
      applyCurrentScroll(true);
    };

    mediaQuery?.addEventListener?.('change', handleMotionPreferenceChange);

    measureAndSync();
    if (logoImgRef.current?.complete) {
      measureAndSync();
    }

    const handleScroll = () => {
      if (rafIdRef.current !== null) return;
      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = null;
        applyCurrentScroll(false);
      });
    };

    const handleResize = () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      measureAndSync();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        measureAndSync();
      });
      const headerEl = document.querySelector<HTMLElement>(
        '[data-testid="public-header"]'
      );
      if (headerEl) resizeObserver.observe(headerEl);
      if (logoImgRef.current) resizeObserver.observe(logoImgRef.current);
    }

    return () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      mediaQuery?.removeEventListener?.('change', handleMotionPreferenceChange);
      resizeObserver?.disconnect();
    };
  }, [applyCurrentScroll, enabled, logoKey, measureAndSync]);

  return {
    heroAnchorRef,
    animatedLogoRef,
    logoImgRef,
    handleLogoLoad: measureAndSync,
  };
}

