import { useCallback, useState } from 'react';
import { ProductCard } from './ProductCard';
import { normalizeProductImageUrl } from '../utils/productImage';
import type { MenuProduct } from '../../../types';

export interface ProductGridProps {
  products: MenuProduct[];
  categoriesById?: Record<string, string>;
  onSelectProduct: (product: MenuProduct) => void;
}

/**
 * Responsive Hybrid Product Grid:
 * - Mobile (< 340px): 1 column for ultra-narrow readability
 * - Mobile (>= 340px): 2 columns (`min-[340px]:grid-cols-2`)
 * - Tablet (>= 768px): 3 columns (`md:grid-cols-3`)
 * - Desktop (>= 1280px): 4 columns (`xl:grid-cols-4`)
 *
 * Uses `grid-flow-row-dense` paired with `min-[340px]:row-span-2` on visual image cards
 * and `row-span-1` on compact text-only cards so two compact cards naturally fit
 * alongside one image card without large blank gaps while preserving reading order.
 */
export function ProductGrid({
  products,
  categoriesById,
  onSelectProduct,
}: ProductGridProps) {
  const [failedImageKeys, setFailedImageKeys] = useState<Record<string, true>>({});

  const handleImageError = useCallback((productId: string, failedUrl: string) => {
    const key = `${productId}::${failedUrl}`;
    setFailedImageKeys((prev) => {
      if (prev[key]) return prev;
      return { ...prev, [key]: true };
    });
  }, []);

  return (
    <div
      data-testid="hybrid-product-grid"
      className="grid grid-cols-1 min-[340px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 grid-flow-row-dense gap-3 sm:gap-3.5 lg:gap-4 items-stretch"
    >
      {products.map((product) => {
        const normalizedUrl = normalizeProductImageUrl(product.imageUrl);
        const isBroken = Boolean(
          normalizedUrl && failedImageKeys[`${product.id}::${normalizedUrl}`]
        );

        return (
          <ProductCard
            key={product.id}
            product={product}
            categoryName={categoriesById ? categoriesById[product.categoryId] : undefined}
            onSelect={onSelectProduct}
            forceCompact={isBroken}
            onImageError={handleImageError}
          />
        );
      })}
    </div>
  );
}

