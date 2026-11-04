import type { Timestamp } from 'firebase/firestore';

export type Language = 'hy' | 'ru' | 'en';

export type LocalizedText = Record<Language, string>;

export type CurrencyCode = 'AMD';

export type AdminRole = 'platformAdmin' | 'restaurantOwner' | 'restaurantManager';

export type MembershipStatus = 'active' | 'disabled';

export type RestaurantStatus = 'active' | 'inactive' | 'draft' | 'suspended';

export type SettingsLoadStatus = 'loading' | 'ready' | 'error';

export interface ProductVariant {
  id: string;
  label: Partial<LocalizedText>;
  price: number;
  sortOrder: number;
}

export interface MenuProduct {
  id: string;
  restaurantId: string;
  categoryId: string;

  name: LocalizedText;
  description?: Partial<LocalizedText>;

  price: number;
  secondPrice?: number | null;
  originalPriceText?: string;
  currency: CurrencyCode;

  variants?: ProductVariant[];

  imagePath?: string;
  imageUrl?: string;

  isAvailable: boolean;
  isVisible: boolean;
  isFeatured: boolean;

  sortOrder: number;

  /* Preserved original source metadata */
  sourceId?: number;
  sourcePage?: number;
  sourceCategoryHy?: string;

  createdAt?: Timestamp | Date | null;
  updatedAt?: Timestamp | Date | null;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;

  name: LocalizedText;
  description?: Partial<LocalizedText>;

  slug: string;
  sortOrder: number;

  isVisible: boolean;

  imagePath?: string;
  imageUrl?: string;

  createdAt?: Timestamp | Date | null;
  updatedAt?: Timestamp | Date | null;
}

export interface RestaurantContactInfo {
  phone?: string;
  phone2?: string;
  address?: Partial<LocalizedText>;
  workingHours?: Partial<LocalizedText>;
  instagram?: string;
  facebook?: string;
  website?: string;
}

export interface RestaurantBranding {
  logoUrl?: string;
  logoPath?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

export interface RestaurantMenuDisplaySettings {
  showUnavailableItems: boolean;
  showFeaturedSection: boolean;
}

export interface RestaurantProfile {
  id: string;
  restaurantId: string;
  name: LocalizedText;
  slug: string;
  status: RestaurantStatus;
  defaultLanguage: Language;
  supportedLanguages: Language[];
  currency: CurrencyCode;
  branding?: RestaurantBranding;
  contact?: RestaurantContactInfo;
  menuSettings?: RestaurantMenuDisplaySettings;
  createdAt?: Timestamp | Date | null;
  updatedAt?: Timestamp | Date | null;
}

export interface RestaurantMember {
  uid: string;
  restaurantId: string;
  role: 'restaurantOwner' | 'restaurantManager';
  status: MembershipStatus;
  email?: string;
  displayName?: string;
  createdAt?: Timestamp | Date | null;
  updatedAt?: Timestamp | Date | null;
}

export interface GeneralSettingsDoc {
  restaurantId: string;
  name: LocalizedText;
  contact: RestaurantContactInfo;
  defaultLanguage: Language;
  supportedLanguages: Language[];
  updatedAt?: Timestamp | Date | null;
}

export interface MenuSettingsDoc {
  restaurantId: string;
  currency: CurrencyCode;
  showUnavailableItems: boolean;
  showFeaturedSection: boolean;
  serviceChargePercent?: number;
  footerNote?: Partial<LocalizedText>;
  updatedAt?: Timestamp | Date | null;
}

export interface BrandingSettingsDoc {
  restaurantId: string;
  logoUrl?: string;
  logoPath?: string;
  primaryColor: string;
  secondaryColor: string;
  updatedAt?: Timestamp | Date | null;
}
