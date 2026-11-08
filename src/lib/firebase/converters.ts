import type {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from 'firebase/firestore';
import type {
  MenuCategory,
  MenuProduct,
  ProductVariant,
  RestaurantMember,
  RestaurantProfile,
} from '../../types';
import { normalizeOptionalLocalizedText } from '../utils/format';

export const categoryConverter: FirestoreDataConverter<MenuCategory> = {
  toFirestore(category: MenuCategory): DocumentData {
    const data: DocumentData = {
      id: category.id,
      restaurantId: category.restaurantId,
      name: {
        hy: category.name.hy.trim(),
        ru: category.name.ru.trim(),
        en: category.name.en.trim(),
      },
      slug: category.slug.trim(),
      sortOrder: Number(category.sortOrder) || 0,
      isVisible: Boolean(category.isVisible),
    };

    const desc = normalizeOptionalLocalizedText(category.description);
    if (desc) data.description = desc;
    if (category.imagePath) data.imagePath = category.imagePath;
    if (category.imageUrl) data.imageUrl = category.imageUrl;
    if (category.createdAt) data.createdAt = category.createdAt;
    if (category.updatedAt) data.updatedAt = category.updatedAt;

    return data;
  },

  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): MenuCategory {
    const raw = snapshot.data(options);
    return {
      id: snapshot.id,
      restaurantId: String(raw.restaurantId ?? ''),
      name: {
        hy: String(raw.name?.hy ?? ''),
        ru: String(raw.name?.ru ?? ''),
        en: String(raw.name?.en ?? ''),
      },
      description: raw.description
        ? {
            hy: String(raw.description.hy ?? ''),
            ru: String(raw.description.ru ?? ''),
            en: String(raw.description.en ?? ''),
          }
        : undefined,
      slug: String(raw.slug ?? snapshot.id),
      sortOrder: Number(raw.sortOrder ?? 0),
      isVisible: raw.isVisible !== false,
      imagePath: raw.imagePath ? String(raw.imagePath) : undefined,
      imageUrl: raw.imageUrl ? String(raw.imageUrl) : undefined,
      createdAt: raw.createdAt ?? null,
      updatedAt: raw.updatedAt ?? null,
    };
  },
};

export const productConverter: FirestoreDataConverter<MenuProduct> = {
  toFirestore(product: MenuProduct): DocumentData {
    const variants: ProductVariant[] = Array.isArray(product.variants)
      ? product.variants.map((v, idx) => ({
          id: v.id || `v-${idx + 1}`,
          label: {
            hy: v.label?.hy?.trim() ?? '',
            ru: v.label?.ru?.trim() ?? '',
            en: v.label?.en?.trim() ?? '',
          },
          price: Number(v.price) || 0,
          sortOrder: typeof v.sortOrder === 'number' ? v.sortOrder : idx,
        }))
      : [];

    const data: DocumentData = {
      id: product.id,
      restaurantId: product.restaurantId,
      categoryId: product.categoryId,
      name: {
        hy: product.name.hy.trim(),
        ru: product.name.ru.trim(),
        en: product.name.en.trim(),
      },
      price: Number(product.price) || 0,
      currency: 'AMD',
      variants,
      isAvailable: Boolean(product.isAvailable),
      isVisible: Boolean(product.isVisible),
      isFeatured: Boolean(product.isFeatured),
      sortOrder: Number(product.sortOrder) || 0,
    };

    const desc = normalizeOptionalLocalizedText(product.description);
    if (desc) data.description = desc;
    if (product.secondPrice !== undefined) data.secondPrice = product.secondPrice;
    if (product.originalPriceText) data.originalPriceText = product.originalPriceText;
    if (product.sourceId !== undefined) data.sourceId = product.sourceId;
    if (product.sourcePage !== undefined) data.sourcePage = product.sourcePage;
    if (product.sourceCategoryHy) data.sourceCategoryHy = product.sourceCategoryHy;
    if (product.imagePath) data.imagePath = product.imagePath;
    if (product.imageUrl) data.imageUrl = product.imageUrl;
    if (product.createdAt) data.createdAt = product.createdAt;
    if (product.updatedAt) data.updatedAt = product.updatedAt;

    return data;
  },

  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): MenuProduct {
    const raw = snapshot.data(options);
    const rawVariants = Array.isArray(raw.variants) ? raw.variants : [];
    const variants: ProductVariant[] = rawVariants.map(
      (v: Record<string, unknown>, index: number) => {
        const labelObj = (v.label as Record<string, unknown> | undefined) ?? {};
        return {
          id: String(v.id ?? `v-${index + 1}`),
          label: {
            hy: labelObj.hy ? String(labelObj.hy) : '',
            ru: labelObj.ru ? String(labelObj.ru) : '',
            en: labelObj.en ? String(labelObj.en) : '',
          },
          price: Number(v.price ?? 0),
          sortOrder: Number(v.sortOrder ?? index),
        };
      }
    );

    return {
      id: snapshot.id,
      restaurantId: String(raw.restaurantId ?? ''),
      categoryId: String(raw.categoryId ?? ''),
      name: {
        hy: String(raw.name?.hy ?? ''),
        ru: String(raw.name?.ru ?? ''),
        en: String(raw.name?.en ?? ''),
      },
      description: raw.description
        ? {
            hy: String(raw.description.hy ?? ''),
            ru: String(raw.description.ru ?? ''),
            en: String(raw.description.en ?? ''),
          }
        : undefined,
      price: Number(raw.price ?? 0),
      secondPrice:
        typeof raw.secondPrice === 'number' ? raw.secondPrice : null,
      originalPriceText: raw.originalPriceText
        ? String(raw.originalPriceText)
        : undefined,
      currency: 'AMD',
      variants: variants.length > 0 ? variants : undefined,
      imagePath: raw.imagePath ? String(raw.imagePath) : undefined,
      imageUrl: raw.imageUrl ? String(raw.imageUrl) : undefined,
      isAvailable: raw.isAvailable !== false,
      isVisible: raw.isVisible !== false,
      isFeatured: Boolean(raw.isFeatured),
      sortOrder: Number(raw.sortOrder ?? 0),
      sourceId: typeof raw.sourceId === 'number' ? raw.sourceId : undefined,
      sourcePage: typeof raw.sourcePage === 'number' ? raw.sourcePage : undefined,
      sourceCategoryHy: raw.sourceCategoryHy
        ? String(raw.sourceCategoryHy)
        : undefined,
      createdAt: raw.createdAt ?? null,
      updatedAt: raw.updatedAt ?? null,
    };
  },
};

export const restaurantProfileConverter: FirestoreDataConverter<RestaurantProfile> = {
  toFirestore(profile: RestaurantProfile): DocumentData {
    return {
      id: profile.id,
      restaurantId: profile.restaurantId,
      name: {
        hy: profile.name.hy.trim(),
        ru: profile.name.ru.trim(),
        en: profile.name.en.trim(),
      },
      slug: profile.slug.trim(),
      status: profile.status,
      defaultLanguage: profile.defaultLanguage,
      supportedLanguages: profile.supportedLanguages,
      currency: 'AMD',
      branding: profile.branding ?? {},
      contact: profile.contact ?? {},
      ...(profile.createdAt ? { createdAt: profile.createdAt } : {}),
      ...(profile.updatedAt ? { updatedAt: profile.updatedAt } : {}),
    };
  },

  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): RestaurantProfile {
    const raw = snapshot.data(options);
    const rawName = raw.name;
    const normalizedName =
      typeof rawName === 'string'
        ? { hy: rawName, ru: rawName, en: rawName }
        : {
            hy: String(rawName?.hy ?? ''),
            ru: String(rawName?.ru ?? ''),
            en: String(rawName?.en ?? ''),
          };

    const rawBranding = (raw.branding as Record<string, unknown> | undefined) ?? undefined;
    const topLevelLogoUrl = typeof raw.logoUrl === 'string' ? raw.logoUrl : undefined;

    return {
      id: snapshot.id,
      restaurantId: String(raw.restaurantId ?? snapshot.id),
      name: normalizedName,
      slug: String(raw.slug ?? snapshot.id),
      status: (raw.status as RestaurantProfile['status']) ?? 'active',
      defaultLanguage: (raw.defaultLanguage as RestaurantProfile['defaultLanguage']) ?? 'hy',
      supportedLanguages: Array.isArray(raw.supportedLanguages)
        ? (raw.supportedLanguages as RestaurantProfile['supportedLanguages'])
        : ['hy', 'ru', 'en'],
      currency: 'AMD',
      branding: rawBranding
        ? {
            logoUrl: String(rawBranding.logoUrl ?? topLevelLogoUrl ?? ''),
            logoPath: rawBranding.logoPath ? String(rawBranding.logoPath) : '',
            primaryColor: rawBranding.primaryColor ? String(rawBranding.primaryColor) : '#5c3a1e',
            secondaryColor: rawBranding.secondaryColor
              ? String(rawBranding.secondaryColor)
              : '#8c6239',
          }
        : topLevelLogoUrl
          ? { logoUrl: topLevelLogoUrl, primaryColor: '#5c3a1e', secondaryColor: '#8c6239' }
          : undefined,
      contact: raw.contact ?? undefined,
      createdAt: raw.createdAt ?? null,
      updatedAt: raw.updatedAt ?? null,
    };
  },
};

export const memberConverter: FirestoreDataConverter<RestaurantMember> = {
  toFirestore(member: RestaurantMember): DocumentData {
    return {
      uid: member.uid,
      restaurantId: member.restaurantId,
      role: member.role,
      status: member.status,
      ...(member.email ? { email: member.email } : {}),
      ...(member.displayName ? { displayName: member.displayName } : {}),
      ...(member.createdAt ? { createdAt: member.createdAt } : {}),
      ...(member.updatedAt ? { updatedAt: member.updatedAt } : {}),
    };
  },

  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): RestaurantMember {
    const raw = snapshot.data(options);
    return {
      uid: String(raw.uid ?? snapshot.id),
      restaurantId: String(raw.restaurantId ?? ''),
      role: raw.role === 'restaurantOwner' ? 'restaurantOwner' : 'restaurantManager',
      status: raw.status === 'active' ? 'active' : 'disabled',
      email: raw.email ? String(raw.email) : undefined,
      displayName: raw.displayName ? String(raw.displayName) : undefined,
      createdAt: raw.createdAt ?? null,
      updatedAt: raw.updatedAt ?? null,
    };
  },
};
