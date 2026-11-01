import type { Language } from '../types';

export interface AppConfig {
  restaurantId: string;
  defaultLanguage: Language;
  supportedLanguages: readonly Language[];
  defaultCurrency: 'AMD';
  useFirebaseEmulator: boolean;
}

const rawRestaurantId = (import.meta.env.VITE_RESTAURANT_ID as string | undefined)?.trim();

if (!rawRestaurantId) {
  console.warn(
    '[AppConfig] VITE_RESTAURANT_ID is not set in environment variables. Falling back to "xutorok".'
  );
}

export const appConfig: AppConfig = {
  restaurantId: rawRestaurantId || 'xutorok',
  defaultLanguage: 'hy',
  supportedLanguages: ['hy', 'ru', 'en'] as const,
  defaultCurrency: 'AMD',
  useFirebaseEmulator: import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true',
};

/**
 * Helper to get the active tenant restaurantId from centralized configuration.
 */
export function getRestaurantId(overrideId?: string): string {
  return overrideId || appConfig.restaurantId;
}
