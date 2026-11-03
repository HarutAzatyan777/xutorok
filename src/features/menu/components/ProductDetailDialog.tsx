import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, CheckCircle2, XCircle, Globe } from 'lucide-react';
import { formatAMD, getLocalizedText } from '../../../lib/utils/format';
import { normalizeProductImageUrl } from '../utils/productImage';
import type { Language, MenuProduct } from '../../../types';

interface ProductDetailDialogProps {
  product: MenuProduct | null;
  categoryName?: string;
  onClose: () => void;
}

/**
 * Accessible native modal <dialog> following Modern Web Guidance:
 * - Opened via dialogRef.current.showModal() (top-layer, focus management, Esc/back gesture).
 * - Uses closedby="any" with bounding-box pointerdown/pointerup fallback for light dismiss.
 * - Does not add redundant role="dialog" or aria-modal.
 */
export function ProductDetailDialog({
  product,
  categoryName,
  onClose,
}: ProductDetailDialogProps) {
  const { i18n, t } = useTranslation();
  const lang = (i18n.language?.slice(0, 2) as Language) || 'hy';
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (product && !dialog.open) {
      dialog.showModal();
    } else if (!product && dialog.open) {
      dialog.close();
    }
  }, [product]);

  // Fallback light-dismiss where native <dialog closedby="any"> is not yet supported (e.g. Safari)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if ('closedBy' in HTMLDialogElement.prototype) {
      return;
    }

    const isOutside = (e: PointerEvent, el: HTMLDialogElement) => {
      const r = el.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };

    let pressedOutside = false;
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e, dialog);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e, dialog)) {
        dialog.close();
      }
    };

    dialog.addEventListener('pointerdown', onPointerDown);
    dialog.addEventListener('pointerup', onPointerUp);
    return () => {
      dialog.removeEventListener('pointerdown', onPointerDown);
      dialog.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  const handleDialogClose = () => {
    if (dialogRef.current) {
      dialogRef.current.returnValue = '';
    }
    onClose();
  };

  const title = product ? getLocalizedText(product.name, lang) : '';
  const description = product ? getLocalizedText(product.description, lang) : '';
  const validImageUrl = normalizeProductImageUrl(product?.imageUrl);
  const showImage = Boolean(validImageUrl) && failedImageUrl !== validImageUrl;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={handleDialogClose}
      {...({ closedby: 'any' } as Record<string, string>)}
      className="m-auto w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-3xl border border-stone-200 bg-white p-0 text-stone-900 shadow-2xl open:flex open:flex-col"
    >
      {product && (
        <>
          {/* Image Header — only rendered when product has a valid, loadable image */}
          {showImage && validImageUrl && (
            <div className="relative aspect-[4/3] w-full bg-stone-100">
              <img
                src={validImageUrl}
                alt={title}
                onError={() => setFailedImageUrl(validImageUrl)}
                className="h-full w-full object-cover"
              />

              <form method="dialog" className="absolute top-3 right-3">
                <button
                  type="submit"
                  value="close"
                  autoFocus
                  aria-label={t('menu.closeDetails')}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-stone-800 shadow-sm backdrop-blur-xs transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#5c3a1e]"
                >
                  <X className="h-5 w-5" />
                </button>
              </form>
            </div>
          )}

          {/* Modal Body */}
          <div className="flex flex-col gap-5 p-6">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {categoryName && (
                    <span className="text-xs font-semibold tracking-wider text-stone-400 uppercase">
                      {categoryName}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      product.isAvailable
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {product.isAvailable ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-stone-500" />
                    )}
                    {product.isAvailable ? t('menu.available') : t('menu.unavailable')}
                  </span>
                </div>

                {!showImage && (
                  <form method="dialog" className="shrink-0">
                    <button
                      type="submit"
                      value="close"
                      autoFocus
                      aria-label={t('menu.closeDetails')}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-stone-700 transition hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-[#5c3a1e]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </form>
                )}
              </div>

              <h2 id={titleId} className="mt-2 text-2xl font-bold text-stone-900 break-words">
                {title}
              </h2>
            </div>

            {/* Price or Variants Section */}
            <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4">
              {product.variants && product.variants.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
                    {t('menu.variantsTitle')}
                  </p>
                  <div className="mt-2.5 divide-y divide-stone-200/70">
                    {product.variants.map((variant, idx) => {
                      const vLabel =
                        getLocalizedText(variant.label, lang) ||
                        t('menu.portionOption', { index: idx + 1 });
                      return (
                        <div
                          key={variant.id}
                          className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
                        >
                          <span className="text-sm font-medium text-stone-700">
                            {vLabel}
                          </span>
                          <span className="text-base font-bold text-[#5c3a1e]">
                            {formatAMD(variant.price)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-600">
                    {t('menu.priceLabel')}
                  </span>
                  <span className="text-xl font-bold text-[#5c3a1e]">
                    {formatAMD(product.price)}
                  </span>
                </div>
              )}
            </div>

            {/* Optional Description */}
            {description && (
              <div>
                <h3 className="text-xs font-semibold tracking-wider text-stone-500 uppercase">
                  {t('menu.descriptionLabel')}
                </h3>
                <p className="mt-1.5 text-sm text-stone-700 leading-relaxed">
                  {description}
                </p>
              </div>
            )}

            {/* Three-Language Product Name Card */}
            <div className="rounded-2xl border border-stone-200/70 bg-white p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-stone-500 uppercase">
                <Globe className="h-3.5 w-3.5" />
                <span>{t('menu.namesInLanguages')}</span>
              </div>
              <dl className="mt-2.5 grid grid-cols-1 gap-2 text-sm">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-xs font-semibold text-stone-400">HY</dt>
                  <dd className="font-medium text-stone-800 text-right">{product.name.hy}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-t border-stone-100 pt-1.5">
                  <dt className="text-xs font-semibold text-stone-400">RU</dt>
                  <dd className="font-medium text-stone-800 text-right">{product.name.ru}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-t border-stone-100 pt-1.5">
                  <dt className="text-xs font-semibold text-stone-400">EN</dt>
                  <dd className="font-medium text-stone-800 text-right">{product.name.en}</dd>
                </div>
              </dl>
            </div>

            <form method="dialog">
              <button
                type="submit"
                value="close"
                className="w-full rounded-xl bg-stone-900 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
              >
                {t('menu.closeDetails')}
              </button>
            </form>
          </div>
        </>
      )}
    </dialog>
  );
}
