import type { Timestamp } from 'firebase/firestore';
import type { Language, LocalizedText } from '../../types';

const amdFormatter = new Intl.NumberFormat('hy-AM', {
  maximumFractionDigits: 0,
});

/**
 * Formats a numeric price in Armenian Dram (AMD).
 * Example: 3500 -> "3,500 ֏" or "3 500 ֏"
 */
export function formatAMD(amount: number): string {
  if (!Number.isFinite(amount)) {
    return '0 ֏';
  }
  return `${amdFormatter.format(Math.round(amount))} ֏`;
}

/**
 * Resolves a localized text object to the requested language,
 * falling back to Armenian ('hy'), Russian ('ru'), then English ('en').
 */
export function getLocalizedText(
  text: Partial<LocalizedText> | string | undefined | null,
  lang: Language,
  fallback = ''
): string {
  if (!text) return fallback;
  if (typeof text === 'string') return text;

  const direct = text[lang]?.trim();
  if (direct) return direct;

  const hy = text.hy?.trim();
  if (hy) return hy;

  const ru = text.ru?.trim();
  if (ru) return ru;

  const en = text.en?.trim();
  if (en) return en;

  return fallback;
}

/**
 * Generates a URL-safe deterministic slug from English/Armenian/Russian text.
 */
export function slugify(input: string): string {
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/['"«»()*]/g, '')
    .replace(/[^a-z0-9\u0530-\u058f\u0400-\u04ff]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'item';
}

/**
 * Converts a Firestore Timestamp, Date, or serialized timestamp into a JS Date or null.
 */
export function toDate(value: Timestamp | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate();
  }
  return null;
}

/**
 * Cleans an optional Partial<LocalizedText> so empty strings are normalized or omitted.
 */
export function normalizeOptionalLocalizedText(
  input?: Partial<LocalizedText> | null
): Partial<LocalizedText> | undefined {
  if (!input) return undefined;
  const hy = input.hy?.trim() ?? '';
  const ru = input.ru?.trim() ?? '';
  const en = input.en?.trim() ?? '';
  if (!hy && !ru && !en) return undefined;
  return { hy, ru, en };
}

