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

