import { useCallback, useEffect, useState } from 'react';
import { appConfig, getRestaurantId } from '../../../config/app';
import { subscribeToPublicCategories } from '../../categories/services/categoryService';
import { subscribeToPublicProducts } from '../../products/services/productService';
import { subscribeToRestaurantProfile } from '../../settings/services/settingsService';
import type { MenuCategory, MenuProduct, RestaurantProfile } from '../../../types';

export interface PublicMenuState {
  profile: RestaurantProfile;
  profileLoaded: boolean;
  profileReady: boolean;
  categories: MenuCategory[];
  products: MenuProduct[];
  loading: boolean;
  error: string | null;
  retry: () => void;
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
      workingHours: { hy: '', en: '', ru: '' },
    },
  };
}

/**
 * Connects live real-time Firestore queries (`restaurants/{restaurantId}`,
 * `restaurants/{restaurantId}/categories`, and `restaurants/{restaurantId}/products`)
 * as the single authoritative source of truth.
 * Never renders default fallback names or logos before Firestore responds.
 */
export function usePublicMenu(): PublicMenuState {
  const restaurantId = getRestaurantId();
  const [profile, setProfile] = useState<RestaurantProfile>(() =>
    createEmptyLoadingProfile(restaurantId)
  );
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [catLoaded, setCatLoaded] = useState(false);
  const [prodLoaded, setProdLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const retry = useCallback(() => {
    setProfileLoaded(false);
    setCatLoaded(false);
    setProdLoaded(false);
    setError(null);
    setRetryTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let active = true;

    const unsubProfile = subscribeToRestaurantProfile(
      (res) => {
        if (!active) return;
        setProfile(res);
        setProfileLoaded(true);
      },
      () => {
        if (!active) return;
        setProfileLoaded(true);
      },
      restaurantId
    );

    const unsubCategories = subscribeToPublicCategories(
      (cats) => {
        if (!active) return;
        setCategories(cats);
        setCatLoaded(true);
        setError(null);
      },
      (err) => {
        if (!active) return;
        setError(err.message);
        setCatLoaded(true);
      },
      restaurantId
    );

    const unsubProducts = subscribeToPublicProducts(
      (prods) => {
        if (!active) return;
        setProducts(prods);
        setProdLoaded(true);
        setError(null);
      },
      (err) => {
        if (!active) return;
        setError(err.message);
        setProdLoaded(true);
      },
      restaurantId
    );

    return () => {
      active = false;
      unsubProfile();
      unsubCategories();
      unsubProducts();
    };
  }, [restaurantId, retryTick]);

  const loading = !profileLoaded || !catLoaded || !prodLoaded;
  const profileReady = profileLoaded && !loading;

  return {
    profile,
    profileLoaded,
    profileReady,
    categories,
    products,
    loading,
    error,
    retry,
  };
}
