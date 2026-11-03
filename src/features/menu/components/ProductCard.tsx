import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatAMD, getLocalizedText } from '../../../lib/utils/format';
import { normalizeProductImageUrl } from '../utils/productImage';
import type { Language, MenuProduct } from '../../../types';

export interface ProductCardProps {
  product: MenuProduct;
  categoryName?: string;
  onSelect: (product: MenuProduct) => void;
  forceCompact?: boolean;
  onImageError?: (productId: string, failedUrl: string) => void;
}

export function ProductCard({
  product,
  categoryName,
  onSelect,
  forceCompact = false,
  onImageError,
}: ProductCardProps) {
  const { i18n, t } = useTranslation();
  const lang = (i18n.language?.slice(0, 2) as Language) || 'hy';

  const validImageUrl = normalizeProductImageUrl(product.imageUrl);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);

  const showImage =
    Boolean(validImageUrl) && !forceCompact && failedImageUrl !== validImageUrl;

  const title = getLocalizedText(product.name, lang);
  const description = getLocalizedText(product.description, lang);
  const hasVariants = Boolean(product.variants && product.variants.length > 0);

  const handleActivate = () => {
    onSelect(product);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(product);
    }
  };

  const handleImageError = () => {
    if (!validImageUrl) return;
    setFailedImageUrl(validImageUrl);
    onImageError?.(product.id, validImageUrl);
  };

  const priceBlock =
    hasVariants && product.variants ? (
      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
        {product.variants.map((variant) => {
          const vLabel = getLocalizedText(variant.label, lang);
          return (
            <span
              key={variant.id}
              className="inline-flex items-center gap-1 rounded-lg bg-app-bg px-1.5 py-0.5 text-[11px] font-medium text-app-text sm:px-2 sm:py-1 sm:text-xs"
            >
              {vLabel && <span className="text-app-text-muted">{vLabel}:</span>}
              <span className="font-bold text-brand-primary">
                {formatAMD(variant.price)}
              </span>
            </span>
          );
        })}
      </div>
    ) : (
      <span className="text-sm font-bold text-brand-primary sm:text-[15px]">
        {formatAMD(product.price)}
      </span>
    );

  if (showImage && validImageUrl) {
    return (
      <article
        data-testid={`product-card-${product.id}`}
        data-card-variant="image"
        onClick={handleActivate}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`${title} — ${formatAMD(product.price)}`}
        className={`group relative flex flex-col overflow-hidden rounded-2xl border border-app-border bg-white transition-colors duration-150 hover:border-brand-gold/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 motion-reduce:transition-none min-[340px]:row-span-2 ${
          !product.isAvailable ? 'opacity-70' : 'cursor-pointer'
        }`}
      >
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-app-surface-muted">
          <img
            src={validImageUrl}
            alt={title}
            loading="lazy"
            decoding="async"
            onError={handleImageError}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />

          {(product.isFeatured || !product.isAvailable) && (
            <div className="absolute top-2 left-2 flex flex-wrap gap-1 sm:top-2.5 sm:left-2.5">
              {product.isFeatured && (
                <span className="inline-flex items-center rounded-full bg-brand-primary/90 px-2 py-0.5 text-[10px] font-semibold text-white sm:px-2.5 sm:text-[11px]">
                  {t('menu.featured')}
                </span>
              )}
              {!product.isAvailable && (
                <span className="inline-flex items-center rounded-full bg-stone-900/85 px-2 py-0.5 text-[10px] font-semibold text-white sm:px-2.5 sm:text-[11px]">
                  {t('menu.unavailable')}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-between p-3 sm:p-3.5">
          <div>
            {categoryName && (
              <p className="mb-0.5 truncate text-[10px] font-semibold tracking-wider text-app-text-muted uppercase sm:text-[11px]">
                {categoryName}
              </p>
            )}
            <h3 className="text-sm font-semibold text-app-text leading-snug break-words transition-colors group-hover:text-brand-primary sm:text-[15px]">
              {title}
            </h3>
            {description && (
              <p className="mt-1 line-clamp-2 text-[11px] text-app-text-muted leading-relaxed sm:text-xs">
                {description}
              </p>
            )}
          </div>

          <div className="mt-2.5 flex items-end justify-between gap-2 border-t border-app-border/70 pt-2.5">
            {priceBlock}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      data-testid={`product-card-${product.id}`}
      data-card-variant="compact"
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${title} — ${formatAMD(product.price)}`}
      className={`group relative row-span-1 flex min-h-[88px] flex-col justify-between rounded-2xl border border-app-border bg-white p-3 transition-colors duration-150 hover:border-brand-gold/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 motion-reduce:transition-none sm:min-h-[96px] sm:p-3.5 ${
        !product.isAvailable ? 'opacity-70' : 'cursor-pointer'
      }`}
    >
      <div>
        {(categoryName || product.isFeatured || !product.isAvailable) && (
          <div className="mb-1 flex flex-wrap items-center justify-between gap-1">
            {categoryName ? (
              <span className="truncate text-[10px] font-semibold tracking-wider text-app-text-muted uppercase sm:text-[11px]">
                {categoryName}
              </span>
            ) : (
              <span />
            )}
            <div className="flex flex-wrap items-center gap-1">
              {product.isFeatured && (
                <span className="inline-flex items-center rounded-full border border-brand-gold/40 bg-brand-primary-soft px-2 py-0.5 text-[10px] font-semibold text-brand-primary">
                  {t('menu.featured')}
                </span>
              )}
              {!product.isAvailable && (
                <span className="inline-flex items-center rounded-full bg-app-surface-muted px-2 py-0.5 text-[10px] font-semibold text-app-text-muted">
                  {t('menu.unavailable')}
                </span>
              )}
            </div>
          </div>
        )}

        <h3 className="text-sm font-semibold text-app-text leading-snug break-words transition-colors group-hover:text-brand-primary sm:text-[15px]">
          {title}
        </h3>

        {description && (
          <p className="mt-1 line-clamp-2 text-[11px] text-app-text-muted leading-relaxed sm:text-xs">
            {description}
          </p>
        )}
      </div>

      <div className="mt-2.5 flex items-end justify-between gap-2 border-t border-app-border/70 pt-2">
        {priceBlock}
      </div>
    </article>
  );
}
