import { useState } from 'react';
import {
  DEFAULT_BRAND_LOGO_URL,
  normalizeBrandLogoUrl,
} from '../../features/settings/services/settingsService';

interface BrandLogoProps {
  logoUrl?: string | null;
  alt?: string;
  /**
   * When false, the authoritative restaurant branding profile is still loading
   * from Firestore, so ONLY a skeleton placeholder is rendered (no img element
   * is mounted yet, preventing any flash of a default logo).
   */
  ready?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', { img: string; skeleton: string }> = {
  sm: {
    img: 'h-9 w-auto max-w-[130px]',
    skeleton: 'h-9 w-24',
  },
  md: {
    img: 'h-11 w-auto max-w-[160px]',
    skeleton: 'h-11 w-28',
  },
  lg: {
    img: 'h-14 w-auto max-w-[200px]',
    skeleton: 'h-14 w-36',
  },
};

export function BrandLogo({
  logoUrl,
  alt = 'Restaurant Logo',
  ready = true,
  size = 'md',
  className = '',
}: BrandLogoProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const sizeSpec = SIZE_CLASSES[size];

  // Do not mount or resolve any fallback logo until Firestore profile is ready
  if (!ready) {
    return (
      <div
        aria-hidden="true"
        className={`${sizeSpec.skeleton} shrink-0 animate-pulse rounded-xl bg-stone-200/80 ${className}`}
      />
    );
  }

  const resolvedSrc = normalizeBrandLogoUrl(logoUrl);
  const effectiveSrc =
    failedSrc === resolvedSrc ? DEFAULT_BRAND_LOGO_URL : resolvedSrc;
  const isLocalSvg =
    effectiveSrc === DEFAULT_BRAND_LOGO_URL || effectiveSrc === '/logo.svg';
  const isImageDecoded = isLocalSvg || loadedSrc === effectiveSrc;

  return (
    <div className={`relative inline-flex shrink-0 items-center ${className}`}>
      {!isImageDecoded && (
        <div
          aria-hidden="true"
          className={`${sizeSpec.skeleton} animate-pulse rounded-xl bg-stone-200/80`}
        />
      )}
      <img
        key={effectiveSrc}
        src={effectiveSrc}
        alt={alt}
        fetchPriority="high"
        decoding="async"
        onLoad={() => setLoadedSrc(effectiveSrc)}
        onError={() => setFailedSrc(resolvedSrc)}
        className={`${sizeSpec.img} object-contain transition-opacity duration-200 ${
          isImageDecoded ? 'opacity-100' : 'pointer-events-none absolute inset-0 opacity-0'
        }`}
      />
    </div>
  );
}
