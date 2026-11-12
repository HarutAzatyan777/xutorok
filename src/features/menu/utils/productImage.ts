import type { MenuCategory, MenuProduct } from '../../../types';

/**
 * Normalizes and validates a product image URL.
 * Rejects undefined, null, empty strings, whitespace-only strings,
 * literal placeholder tokens ("null", "undefined", "none"), and malformed URLs.
 */
export function normalizeProductImageUrl(imageUrl?: string | null): string | null {
  if (typeof imageUrl !== 'string') {
    return null;
  }

  const trimmed = imageUrl.trim();
  if (!trimmed) {
    return null;
  }

  const lower = trimmed.toLowerCase();
  if (lower === 'null' || lower === 'undefined' || lower === 'none' || lower === 'false') {
    return null;
  }

  // Allow valid root-relative asset paths (e.g. "/images/dish.webp") without whitespace
  if (trimmed.startsWith('/')) {
    if (trimmed.length < 2 || /\s/.test(trimmed) || trimmed.startsWith('//')) {
      return null;
    }
    return trimmed;
  }

  // Allow valid data:image/* URIs
  if (lower.startsWith('data:image/')) {
    return trimmed.includes(',') ? trimmed : null;
  }

  // Validate absolute HTTP/HTTPS URLs
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
}

/**
 * Returns true only when the product has a usable image URL.
 */
export function hasValidProductImage(imageUrl?: string | null): boolean {
  return normalizeProductImageUrl(imageUrl) !== null;
}

/**
 * Returns true when a product has a valid image URL that has NOT failed at runtime.
 */
export function isProductImageDisplayable(
  product: Pick<MenuProduct, 'id' | 'imageUrl'>,
  failedImageKeys?: Record<string, true>
): boolean {
  const normalizedUrl = normalizeProductImageUrl(product.imageUrl);
  if (!normalizedUrl) {
    return false;
  }
  if (failedImageKeys && failedImageKeys[`${product.id}::${normalizedUrl}`]) {
    return false;
  }
  return true;
}

/**
 * Presentation-layer sorting for products within a category:
 * 1. Products with valid (and non-broken) images first.
 * 2. Products without images afterward.
 * 3. Preserves the admin-defined `sortOrder` ascending within each group,
 *    and preserves original array order (stable sort) when `sortOrder` values match.
 *
 * Never mutates the input array or Firestore `sortOrder` values.
 */
export function sortProductsImageFirst(
  products: readonly MenuProduct[],
  failedImageKeys?: Record<string, true>
): MenuProduct[] {
  const indexed = products.map((product, originalIndex) => ({
    product,
    originalIndex,
    hasImage: isProductImageDisplayable(product, failedImageKeys),
    sortOrder: typeof product.sortOrder === 'number' && Number.isFinite(product.sortOrder)
      ? product.sortOrder
      : Number.MAX_SAFE_INTEGER,
  }));

  indexed.sort((a, b) => {
    if (a.hasImage !== b.hasImage) {
      return a.hasImage ? -1 : 1;
    }
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }
    return a.originalIndex - b.originalIndex;
  });

  return indexed.map((entry) => entry.product);
}

/**
 * Groups products by category while applying `sortProductsImageFirst` strictly
 * WITHIN each category section (never mixing image products from different categories).
 */
export function groupProductsByCategoryImageFirst(
  categories: readonly MenuCategory[],
  products: readonly MenuProduct[],
  failedImageKeys?: Record<string, true>
): Array<{ category: MenuCategory; items: MenuProduct[] }> {
  return categories
    .map((category) => ({
      category,
      items: sortProductsImageFirst(
        products.filter((product) => product.categoryId === category.id),
        failedImageKeys
      ),
    }))
    .filter((group) => group.items.length > 0);
}


