import {
  collection,
  doc,
  getDoc,
  getDocs,
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

const VALID_LANGUAGES = new Set<Language>(['hy', 'ru', 'en']);

/**
 * Returns a neutral, non-branded empty profile structure for unconfigured tenants
 * or missing Firestore documents. Never injects hardcoded "Xutorok" or "/logo.svg".
 */
export function createEmptyRestaurantProfile(
  restaurantId = getRestaurantId()
): RestaurantProfile {
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
      logoPath: '',
      primaryColor: '#5c3a1e',
      secondaryColor: '#8c6239',
    },
    contact: {
      phone: '',
      address: { hy: '', ru: '', en: '' },
      workingHours: { hy: '', ru: '', en: '' },
      instagram: '',
      facebook: '',
      website: '',
    },
    menuSettings: {
      showUnavailableItems: true,
      showFeaturedSection: true,
    },
  };
}

function parseLocalizedMap(raw: unknown): LocalizedText {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return { hy: trimmed, ru: trimmed, en: trimmed };
  }
  const obj = (raw as Record<string, unknown> | undefined) ?? {};
  return {
    hy: typeof obj.hy === 'string' ? obj.hy.trim() : '',
    ru: typeof obj.ru === 'string' ? obj.ru.trim() : '',
    en: typeof obj.en === 'string' ? obj.en.trim() : '',
  };
}

function parseSupportedLanguages(raw: unknown): Language[] {
  if (!Array.isArray(raw)) {
    return [...appConfig.supportedLanguages];
  }
  const filtered = raw.filter(
    (item): item is Language => typeof item === 'string' && VALID_LANGUAGES.has(item as Language)
  );
  return filtered.length > 0 ? filtered : [...appConfig.supportedLanguages];
}

function parseDefaultLanguage(raw: unknown, supported: Language[]): Language {
  if (typeof raw === 'string' && VALID_LANGUAGES.has(raw as Language)) {
    return raw as Language;
  }
  return supported[0] ?? appConfig.defaultLanguage;
}

function parseContactInfo(raw: unknown): RestaurantContactInfo {
  const obj = (raw as Record<string, unknown> | undefined) ?? {};
  return {
    phone: typeof obj.phone === 'string' ? obj.phone.trim() : '',
    address: parseLocalizedMap(obj.address),
    workingHours: parseLocalizedMap(obj.workingHours),
    instagram: typeof obj.instagram === 'string' ? obj.instagram.trim() : '',
    facebook: typeof obj.facebook === 'string' ? obj.facebook.trim() : '',
    website: typeof obj.website === 'string' ? obj.website.trim() : '',
  };
}

/**
 * Merges authoritative settings documents from `restaurants/{restaurantId}/settings/{general,branding,menu}`
 * with optional fallback fields from the root `restaurants/{restaurantId}` document.
 */
export function assembleRestaurantProfile(
  restaurantId: string,
  settingsDocs: Record<string, Record<string, unknown>>,
  rootProfile?: RestaurantProfile | null
): RestaurantProfile {
  const base = createEmptyRestaurantProfile(restaurantId);
  const general = settingsDocs.general;
  const branding = settingsDocs.branding;
  const menu = settingsDocs.menu;

  const generalName = general?.name ? parseLocalizedMap(general.name) : null;
  const rootName = rootProfile?.name ? parseLocalizedMap(rootProfile.name) : null;
  const name: LocalizedText = {
    hy: generalName?.hy || rootName?.hy || '',
    ru: generalName?.ru || rootName?.ru || '',
    en: generalName?.en || rootName?.en || '',
  };

  const supportedLanguages = general?.supportedLanguages
    ? parseSupportedLanguages(general.supportedLanguages)
    : rootProfile?.supportedLanguages?.length
      ? parseSupportedLanguages(rootProfile.supportedLanguages)
      : base.supportedLanguages;

  const defaultLanguage = general?.defaultLanguage
    ? parseDefaultLanguage(general.defaultLanguage, supportedLanguages)
    : rootProfile?.defaultLanguage
      ? parseDefaultLanguage(rootProfile.defaultLanguage, supportedLanguages)
      : base.defaultLanguage;

  const contact: RestaurantContactInfo = general?.contact
    ? parseContactInfo(general.contact)
    : rootProfile?.contact
      ? parseContactInfo(rootProfile.contact)
      : base.contact!;

  const logoUrl =
    typeof branding?.logoUrl === 'string'
      ? branding.logoUrl.trim()
      : typeof rootProfile?.branding?.logoUrl === 'string'
        ? rootProfile.branding.logoUrl.trim()
        : '';

  const logoPath =
    typeof branding?.logoPath === 'string'
      ? branding.logoPath.trim()
      : typeof rootProfile?.branding?.logoPath === 'string'
        ? rootProfile.branding.logoPath.trim()
        : '';

  const primaryColor =
    typeof branding?.primaryColor === 'string' && branding.primaryColor.trim()
      ? branding.primaryColor.trim()
      : rootProfile?.branding?.primaryColor || '#5c3a1e';

  const secondaryColor =
    typeof branding?.secondaryColor === 'string' && branding.secondaryColor.trim()
      ? branding.secondaryColor.trim()
      : rootProfile?.branding?.secondaryColor || '#8c6239';

  const showUnavailableItems =
    typeof menu?.showUnavailableItems === 'boolean'
      ? menu.showUnavailableItems
      : rootProfile?.menuSettings?.showUnavailableItems ?? true;

  const showFeaturedSection =
    typeof menu?.showFeaturedSection === 'boolean'
      ? menu.showFeaturedSection
      : rootProfile?.menuSettings?.showFeaturedSection ?? true;

  return {
    id: restaurantId,
    restaurantId,
    slug: rootProfile?.slug || restaurantId,
    status: rootProfile?.status || 'active',
    name,
    defaultLanguage,
    supportedLanguages,
    currency: 'AMD',
    branding: {
      logoUrl,
      logoPath,
      primaryColor,
      secondaryColor,
    },
    contact,
    menuSettings: {
      showUnavailableItems,
      showFeaturedSection,
    },
    createdAt: rootProfile?.createdAt ?? null,
    updatedAt: rootProfile?.updatedAt ?? null,
  };
}

// Per-tenant in-memory cache and subscriber registry for zero-flicker navigation and instant admin updates
const cachedProfiles = new Map<string, RestaurantProfile>();
const activeSubscribers = new Map<
  string,
  Set<(profile: RestaurantProfile) => void>
>();

export function getCachedRestaurantProfile(
  restaurantId = getRestaurantId()
): RestaurantProfile | null {
  return cachedProfiles.get(restaurantId) ?? null;
}

export function clearRestaurantSettingsCache(restaurantId?: string): void {
  if (restaurantId) {
    cachedProfiles.delete(restaurantId);
  } else {
    cachedProfiles.clear();
  }
}

function notifySettingsSubscribers(restaurantId: string, profile: RestaurantProfile): void {
  cachedProfiles.set(restaurantId, profile);
  const subs = activeSubscribers.get(restaurantId);
  if (subs) {
    for (const cb of subs) {
      cb(profile);
    }
  }
}

async function fetchRootRestaurantDoc(
  restaurantId: string
): Promise<RestaurantProfile | null> {
  const docRef = doc(db, tenantPaths.restaurantDoc(restaurantId)).withConverter(
    restaurantProfileConverter
  );
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data() : null;
}

/**
 * Fetches authoritative restaurant settings from `restaurants/{restaurantId}/settings/{general,branding,menu}`,
 * falling back to `restaurants/{restaurantId}` only when settings subdocuments are not yet initialized.
 */
export async function fetchRestaurantProfile(
  restaurantId = getRestaurantId()
): Promise<RestaurantProfile> {
  const settingsColRef = collection(db, tenantPaths.settingsCollection(restaurantId));
  const settingsSnap = await getDocs(settingsColRef);

  const settingsDocs: Record<string, Record<string, unknown>> = {};
  for (const docSnap of settingsSnap.docs ?? []) {
    settingsDocs[docSnap.id] = (docSnap.data() as Record<string, unknown>) ?? {};
  }

  const hasGeneralAndBranding = Boolean(settingsDocs.general && settingsDocs.branding);
  const rootProfile = hasGeneralAndBranding
    ? null
    : await fetchRootRestaurantDoc(restaurantId);

  const assembled = assembleRestaurantProfile(restaurantId, settingsDocs, rootProfile);
  cachedProfiles.set(restaurantId, assembled);
  return assembled;
}

/**
 * Subscribes to live restaurant settings under `restaurants/{restaurantId}/settings`.
 * Evaluates snapshot metadata so an empty initial local cache does not flash missing branding
 * before the authoritative server snapshot arrives.
 */
export function subscribeToRestaurantSettings(
  onData: (profile: RestaurantProfile) => void,
  onError: (err: Error) => void,
  restaurantId = getRestaurantId()
): Unsubscribe {
  let active = true;

  if (!activeSubscribers.has(restaurantId)) {
    activeSubscribers.set(restaurantId, new Set());
  }
  const tenantSubs = activeSubscribers.get(restaurantId)!;
  const subscriber = (profile: RestaurantProfile) => {
    if (active) onData(profile);
  };
  tenantSubs.add(subscriber);

  const settingsColRef = collection(db, tenantPaths.settingsCollection(restaurantId));

  const unsubFirestore = onSnapshot(
    settingsColRef,
    (snapshot) => {
      if (!active) return;

      // Avoid flashing unpopulated cache state if offline cache is empty before server responds
      if (snapshot.empty && snapshot.metadata?.fromCache === true) {
        return;
      }

      const settingsDocs: Record<string, Record<string, unknown>> = {};
      for (const docSnap of snapshot.docs ?? []) {
        settingsDocs[docSnap.id] = (docSnap.data() as Record<string, unknown>) ?? {};
      }

      if (settingsDocs.general && settingsDocs.branding) {
        const profile = assembleRestaurantProfile(restaurantId, settingsDocs, null);
        cachedProfiles.set(restaurantId, profile);
        onData(profile);
        return;
      }

      // If settings subcollection is partially or completely uninitialized, check root doc once
      fetchRootRestaurantDoc(restaurantId)
        .then((rootProfile) => {
          if (!active) return;
          const profile = assembleRestaurantProfile(
            restaurantId,
            settingsDocs,
            rootProfile
          );
          cachedProfiles.set(restaurantId, profile);
          onData(profile);
        })
        .catch((err) => {
          if (!active) return;
          onError(err instanceof Error ? err : new Error(String(err)));
        });
    },
    (err) => {
      if (!active) return;
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  );

  return () => {
    active = false;
    tenantSubs.delete(subscriber);
    unsubFirestore();
  };
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
): Promise<RestaurantProfile> {
  const restaurantDocRef = doc(db, tenantPaths.restaurantDoc(restaurantId));
  const generalRef = doc(db, tenantPaths.settingDoc('general', restaurantId));
  const brandingRef = doc(db, tenantPaths.settingDoc('branding', restaurantId));
  const menuRef = doc(db, tenantPaths.settingDoc('menu', restaurantId));

  const cleanLogoUrl = input.branding.logoUrl?.trim() || '';
  const cleanLogoPath = input.branding.logoPath?.trim() || '';
  const primaryColor = input.branding.primaryColor?.trim() || '#5c3a1e';
  const secondaryColor = input.branding.secondaryColor?.trim() || '#8c6239';

  const normalizedName: LocalizedText = {
    hy: input.name.hy.trim(),
    ru: input.name.ru.trim(),
    en: input.name.en.trim(),
  };

  const normalizedContact: RestaurantContactInfo = {
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
  };

  const profilePayload = {
    id: restaurantId,
    restaurantId,
    slug: restaurantId,
    status: 'active' as const,
    name: normalizedName,
    defaultLanguage: input.defaultLanguage,
    supportedLanguages: input.supportedLanguages,
    currency: 'AMD' as const,
    logoUrl: cleanLogoUrl || null,
    branding: {
      logoUrl: cleanLogoUrl,
      logoPath: cleanLogoPath,
      primaryColor,
      secondaryColor,
    },
    contact: normalizedContact,
    updatedAt: serverTimestamp(),
  };

  const generalDoc: GeneralSettingsDoc = {
    restaurantId,
    name: normalizedName,
    contact: normalizedContact,
    defaultLanguage: input.defaultLanguage,
    supportedLanguages: input.supportedLanguages,
  };

  const brandingDoc: BrandingSettingsDoc = {
    restaurantId,
    logoUrl: cleanLogoUrl,
    logoPath: cleanLogoPath,
    primaryColor,
    secondaryColor,
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

  const updatedProfile: RestaurantProfile = {
    id: restaurantId,
    restaurantId,
    slug: restaurantId,
    status: 'active',
    name: normalizedName,
    defaultLanguage: input.defaultLanguage,
    supportedLanguages: input.supportedLanguages,
    currency: 'AMD',
    branding: {
      logoUrl: cleanLogoUrl,
      logoPath: cleanLogoPath,
      primaryColor,
      secondaryColor,
    },
    contact: normalizedContact,
    menuSettings: {
      showUnavailableItems: menuDoc.showUnavailableItems,
      showFeaturedSection: menuDoc.showFeaturedSection,
    },
  };

  notifySettingsSubscribers(restaurantId, updatedProfile);
  return updatedProfile;
}
