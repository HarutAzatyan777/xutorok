import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { appConfig, getRestaurantId } from '../../../config/app';
import { db } from '../../../config/firebase';
import { restaurantProfileConverter } from '../../../lib/firebase/converters';
import { tenantPaths } from '../../../lib/firebase/paths';
import type {
  BrandingSettingsDoc,
  GeneralSettingsDoc,
  Language,
  LocalizedText,
  MenuSettingsDoc,
  RestaurantBranding,
  RestaurantContactInfo,
  RestaurantProfile,
} from '../../../types';

export const DEFAULT_BRAND_LOGO_URL = '/Xutorok Logo.svg';

export function normalizeBrandLogoUrl(logoUrl?: string | null): string {
  const trimmed = logoUrl?.trim() ?? '';
  if (!trimmed || trimmed === '/logo.svg') {
    return DEFAULT_BRAND_LOGO_URL;
  }
  return trimmed;
}

function getProfileCacheKey(restaurantId: string): string {
  return `xutorok_profile_cache_v3_${restaurantId}`;
}

/**
 * Reads the last authoritative RestaurantProfile saved/fetched from Firestore
 * (`restaurants/{restaurantId}`). Returns null if no Firestore profile has been
 * cached yet so the UI can show a skeleton rather than flashing fallback text/logo.
 */
export function getCachedRestaurantProfile(
  restaurantId = getRestaurantId()
): RestaurantProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(getProfileCacheKey(restaurantId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RestaurantProfile;
    if (!parsed || typeof parsed !== 'object' || !parsed.name) return null;
    return {
      ...parsed,
      branding: {
        ...parsed.branding,
        logoUrl: normalizeBrandLogoUrl(parsed.branding?.logoUrl),
      },
    };
  } catch {
    return null;
  }
}

export function setCachedRestaurantProfile(
  profile: RestaurantProfile,
  restaurantId = getRestaurantId()
): void {
  if (typeof window === 'undefined') return;
  try {
    const cacheable: RestaurantProfile = {
      id: profile.id || restaurantId,
      restaurantId: profile.restaurantId || restaurantId,
      name: profile.name,
      slug: profile.slug || restaurantId,
      status: profile.status || 'active',
      defaultLanguage: profile.defaultLanguage || appConfig.defaultLanguage,
      supportedLanguages: profile.supportedLanguages || [...appConfig.supportedLanguages],
      currency: 'AMD',
      branding: {
        ...profile.branding,
        logoUrl: normalizeBrandLogoUrl(profile.branding?.logoUrl),
      },
      contact: profile.contact,
    };
    window.localStorage.setItem(
      getProfileCacheKey(restaurantId),
      JSON.stringify(cacheable)
    );
  } catch {
    // Ignore storage quota or private mode restrictions
  }
}

export function getDefaultRestaurantProfile(
  restaurantId = getRestaurantId()
): RestaurantProfile {
  const cached = getCachedRestaurantProfile(restaurantId);
  if (cached) {
    return cached;
  }
  return {
    id: restaurantId,
    restaurantId,
    name: { ...appConfig.defaultRestaurantName },
    slug: restaurantId,
    status: 'active',
    defaultLanguage: appConfig.defaultLanguage,
    supportedLanguages: [...appConfig.supportedLanguages],
    currency: 'AMD',
    branding: {
      logoUrl: DEFAULT_BRAND_LOGO_URL,
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

export async function fetchRestaurantProfile(
  restaurantId = getRestaurantId()
): Promise<RestaurantProfile> {
  const docRef = doc(db, tenantPaths.restaurantDoc(restaurantId)).withConverter(
    restaurantProfileConverter
  );
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    const normalized: RestaurantProfile = {
      ...data,
      branding: {
        ...data.branding,
        logoUrl: normalizeBrandLogoUrl(data.branding?.logoUrl),
      },
    };
    setCachedRestaurantProfile(normalized, restaurantId);
    return normalized;
  }
  return getDefaultRestaurantProfile(restaurantId);
}

export function subscribeToRestaurantProfile(
  onData: (profile: RestaurantProfile) => void,
  onError?: (err: Error) => void,
  restaurantId = getRestaurantId()
): Unsubscribe {
  const docRef = doc(db, tenantPaths.restaurantDoc(restaurantId)).withConverter(
    restaurantProfileConverter
  );
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const normalized: RestaurantProfile = {
          ...data,
          branding: {
            ...data.branding,
            logoUrl: normalizeBrandLogoUrl(data.branding?.logoUrl),
          },
        };
        setCachedRestaurantProfile(normalized, restaurantId);
        onData(normalized);
      } else {
        onData(getDefaultRestaurantProfile(restaurantId));
      }
    },
    (err) => {
      onError?.(err);
    }
  );
}

export interface SaveRestaurantSettingsInput {
  name: LocalizedText;
  defaultLanguage: Language;
  supportedLanguages: Language[];
  contact: RestaurantContactInfo;
  branding: RestaurantBranding;
  showUnavailableItems?: boolean;
  showFeaturedSection?: boolean;
}

export async function saveRestaurantSettings(
  input: SaveRestaurantSettingsInput,
  restaurantId = getRestaurantId()
): Promise<void> {
  const restaurantDocRef = doc(db, tenantPaths.restaurantDoc(restaurantId));
  const generalRef = doc(db, tenantPaths.settingDoc('general', restaurantId));
  const brandingRef = doc(db, tenantPaths.settingDoc('branding', restaurantId));
  const menuRef = doc(db, tenantPaths.settingDoc('menu', restaurantId));

  const resolvedLogoUrl = normalizeBrandLogoUrl(input.branding.logoUrl);

  const profilePayload = {
    id: restaurantId,
    restaurantId,
    slug: restaurantId,
    status: 'active' as const,
    name: {
      hy: input.name.hy.trim(),
      ru: input.name.ru.trim(),
      en: input.name.en.trim(),
    },
    defaultLanguage: input.defaultLanguage,
    supportedLanguages: input.supportedLanguages,
    currency: 'AMD' as const,
    logoUrl: resolvedLogoUrl,
    branding: {
      logoUrl: resolvedLogoUrl,
      logoPath: input.branding.logoPath?.trim() || '',
      primaryColor: input.branding.primaryColor || '#5c3a1e',
      secondaryColor: input.branding.secondaryColor || '#8c6239',
    },
    contact: {
      phone: input.contact.phone?.trim() || '',
      address: {
        hy: input.contact.address?.hy?.trim() || '',
        ru: input.contact.address?.ru?.trim() || '',
        en: input.contact.address?.en?.trim() || '',
      },
      workingHours: {
        hy: input.contact.workingHours?.hy?.trim() || '',
        ru: input.contact.workingHours?.ru?.trim() || '',
        en: input.contact.workingHours?.en?.trim() || '',
      },
      instagram: input.contact.instagram?.trim() || '',
      facebook: input.contact.facebook?.trim() || '',
      website: input.contact.website?.trim() || '',
    },
    updatedAt: serverTimestamp(),
  };

  // Immediately update local cache so navigating to /menu shows the new settings on frame 0
  setCachedRestaurantProfile(
    {
      id: restaurantId,
      restaurantId,
      slug: restaurantId,
      status: 'active',
      name: profilePayload.name,
      defaultLanguage: profilePayload.defaultLanguage,
      supportedLanguages: profilePayload.supportedLanguages,
      currency: 'AMD',
      branding: profilePayload.branding,
      contact: profilePayload.contact,
    },
    restaurantId
  );

  const generalDoc: GeneralSettingsDoc = {
    restaurantId,
    name: profilePayload.name,
    contact: profilePayload.contact,
    defaultLanguage: input.defaultLanguage,
    supportedLanguages: input.supportedLanguages,
  };

  const brandingDoc: BrandingSettingsDoc = {
    restaurantId,
    logoUrl: resolvedLogoUrl,
    logoPath: input.branding.logoPath?.trim() || '',
    primaryColor: input.branding.primaryColor || '#5c3a1e',
    secondaryColor: input.branding.secondaryColor || '#8c6239',
  };

  const menuDoc: MenuSettingsDoc = {
    restaurantId,
    currency: 'AMD',
    showUnavailableItems: input.showUnavailableItems ?? true,
    showFeaturedSection: input.showFeaturedSection ?? true,
  };

  await Promise.all([
    setDoc(restaurantDocRef, profilePayload, { merge: true }),
    setDoc(
      generalRef,
      { ...generalDoc, updatedAt: serverTimestamp() },
      { merge: true }
    ),
    setDoc(
      brandingRef,
      { ...brandingDoc, updatedAt: serverTimestamp() },
      { merge: true }
    ),
    setDoc(
      menuRef,
      { ...menuDoc, updatedAt: serverTimestamp() },
      { merge: true }
    ),
  ]);
}
