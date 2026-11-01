import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
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

export function getDefaultRestaurantProfile(
  restaurantId = getRestaurantId()
): RestaurantProfile {
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
      logoUrl: '/logo.svg',
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
    return snap.data();
  }
  return getDefaultRestaurantProfile(restaurantId);
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

  const profilePayload = {
    id: restaurantId,
    restaurantId,
    slug: restaurantId,
    status: 'active',
    name: {
      hy: input.name.hy.trim(),
      ru: input.name.ru.trim(),
      en: input.name.en.trim(),
    },
    defaultLanguage: input.defaultLanguage,
    supportedLanguages: input.supportedLanguages,
    currency: 'AMD',
    logoUrl: input.branding.logoUrl?.trim() || null,
    branding: {
      logoUrl: input.branding.logoUrl?.trim() || '',
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

  const generalDoc: GeneralSettingsDoc = {
    restaurantId,
    name: profilePayload.name,
    contact: profilePayload.contact,
    defaultLanguage: input.defaultLanguage,
    supportedLanguages: input.supportedLanguages,
  };

  const brandingDoc: BrandingSettingsDoc = {
    restaurantId,
    logoUrl: input.branding.logoUrl?.trim() || '',
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

