import { useEffect, useState } from 'react';
import { appConfig, getRestaurantId } from '../../../config/app';
import { subscribeToRestaurantProfile } from '../services/settingsService';
import type { RestaurantProfile } from '../../../types';

export interface RestaurantProfileState {
  profile: RestaurantProfile;
  profileLoaded: boolean;
  profileReady: boolean;
}

function createEmptyLoadingProfile(restaurantId: string): RestaurantProfile {
  return {
    id: restaurantId,
    restaurantId,
    name: { hy: '', ru: '', en: '' },
    slug: restaurantId,
    status: 'active',
    defaultLanguage: appConfig.defaultLanguage,
    supportedLanguages: [...appConfig.supportedLanguages],
    currency: 'AMD',
    branding: {
      logoUrl: '',
      primaryColor: '#5c3a1e',
      secondaryColor: '#8c6239',
    },
    contact: {
      phone: '',
      address: { hy: '', ru: '', en: '' },
      workingHours: { hy: '', ru: '', en: '' },
    },
  };
}

export function useRestaurantProfile(
  restaurantId = getRestaurantId()
): RestaurantProfileState {
  const [profile, setProfile] = useState<RestaurantProfile>(() =>
    createEmptyLoadingProfile(restaurantId)
  );
  const [profileLoaded, setProfileLoaded] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    const unsub = subscribeToRestaurantProfile(
      (nextProfile) => {
        if (!active) return;
        setProfile(nextProfile);
        setProfileLoaded(true);
      },
      () => {
        if (!active) return;
        setProfileLoaded(true);
      },
      restaurantId
    );
    return () => {
      active = false;
      unsub();
    };
  }, [restaurantId]);

  return {
    profile,
    profileLoaded,
    profileReady: profileLoaded,
  };
}
