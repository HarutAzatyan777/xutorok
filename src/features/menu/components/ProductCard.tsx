import { useTranslation } from 'react-i18next';
import { Utensils, Sparkles } from 'lucide-react';
import { formatAMD, getLocalizedText } from '../../../lib/utils/format';
import type { Language, MenuProduct } from '../../../types';

interface ProductCardProps {
  product: MenuProduct;
  categoryName?: string;
  onSelect: (product: MenuProduct) => void;
}

export function ProductCard({ product, categoryName, onSelect }: ProductCardProps) {
  const { i18n, t } = useTranslation();
  const lang = (i18n.language?.slice(0, 2) as Language) || 'hy';

  const title = getLocalizedText(product.name, lang);
  const description = getLocalizedText(product.description, lang);
  const hasVariants = Boolean(product.variants && product.variants.length > 0);

  return (
    <article
      onClick={() => onSelect(product)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(product);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${title} — ${formatAMD(product.price)}`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-900/40 ${
        !product.isAvailable ? 'opacity-70' : 'cursor-pointer'
      }`}
    >
      {/* Image / Placeholder Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-stone-100 to-stone-200/60 text-stone-400">
            <Utensils className="h-7 w-7 stroke-[1.5]" />
            <span className="text-[11px] font-medium tracking-wide uppercase">
              {t('menu.noImage')}
            </span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
          {product.isFeatured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-xs">
              <Sparkles className="h-3 w-3" />
              {t('menu.featured')}
            </span>
          )}
          {!product.isAvailable && (
            <span className="inline-flex items-center rounded-full bg-stone-900/85 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-xs">
              {t('menu.unavailable')}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          {categoryName && (
            <p className="text-[11px] font-semibold tracking-wider text-stone-400 uppercase">
              {categoryName}
            </p>
          )}
          <h3 className="mt-0.5 text-base font-semibold text-stone-900 leading-snug group-hover:text-amber-900 transition-colors">
            {title}
          </h3>
          {description && (
            <p className="mt-1.5 line-clamp-2 text-xs text-stone-500 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Price & Variants */}
        <div className="mt-4 flex items-end justify-between border-t border-stone-100 pt-3">
          {hasVariants && product.variants ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {product.variants.map((variant) => {
                const vLabel = getLocalizedText(variant.label, lang);
                return (
                  <span
                    key={variant.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2 py-1 text-xs font-medium text-stone-800"
                  >
                    {vLabel && <span className="text-stone-500">{vLabel}:</span>}
                    <span className="font-bold text-amber-950">
                      {formatAMD(variant.price)}
                    </span>
                  </span>
                );
              })}
            </div>
          ) : (
            <span className="text-base font-bold text-amber-950">
              {formatAMD(product.price)}
            </span>
          )}

          <span className="text-xs font-medium text-amber-900 opacity-0 transition-opacity group-hover:opacity-100">
            {t('menu.viewDetails')} →
          </span>
        </div>
      </div>
    </article>
  );
}

