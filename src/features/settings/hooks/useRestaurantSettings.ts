import { useCallback, useEffect, useState } from 'react';
import { getRestaurantId } from '../../../config/app';
import { syncLanguageWithSettings } from '../../../i18n';
import {
  getCachedRestaurantProfile,
  subscribeToRestaurantSettings,
} from '../services/settingsService';
import type { RestaurantProfile, SettingsLoadStatus } from '../../../types';

export interface UseRestaurantSettingsResult {
  profile: RestaurantProfile | null;
  status: SettingsLoadStatus;
  error: string | null;
  retry: () => void;
}

/**
 * Provides authoritative restaurant settings and branding from Firestore
 * (`restaurants/{restaurantId}/settings/{general,branding,menu}`) with an explicit
 * initialization state (`loading` | `ready` | `error`).
 * Never initializes with hardcoded branding or placeholder logos.
 */
export function useRestaurantSettings(
  overrideRestaurantId?: string
): UseRestaurantSettingsResult {
  const restaurantId = getRestaurantId(overrideRestaurantId);
  const initialCached = getCachedRestaurantProfile(restaurantId);

  const [profile, setProfile] = useState<RestaurantProfile | null>(initialCached);
  const [status, setStatus] = useState<SettingsLoadStatus>(
    initialCached ? 'ready' : 'loading'
  );
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const retry = useCallback(() => {
    setStatus('loading');
    setError(null);
    setRetryTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeToRestaurantSettings(
      (nextProfile) => {
        if (!active) return;
        setProfile(nextProfile);
        setStatus('ready');
        setError(null);
        syncLanguageWithSettings(
          nextProfile.defaultLanguage,
          nextProfile.supportedLanguages
        );
      },
      (err) => {
        if (!active) return;
        setError(err.message);
        setStatus('error');
      },
      restaurantId
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [restaurantId, retryTick]);

  return {
    profile,
    status,
    error,
    retry,
  };
}
