import { useCallback, useEffect, useState } from 'react';
import { getRestaurantId } from '../../../config/app';
import { subscribeToPublicCategories } from '../../categories/services/categoryService';
import { subscribeToPublicProducts } from '../../products/services/productService';
import { useRestaurantSettings } from '../../settings/hooks/useRestaurantSettings';
import type {
  MenuCategory,
  MenuProduct,
  RestaurantProfile,
  SettingsLoadStatus,
} from '../../../types';

export interface PublicMenuState {
  profile: RestaurantProfile | null;
  settingsStatus: SettingsLoadStatus;
  settingsError: string | null;
  categories: MenuCategory[];
  products: MenuProduct[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  retrySettings: () => void;
}

/**
 * Connects live real-time Firestore queries (`restaurants/{restaurantId}/settings`,
 * `restaurants/{restaurantId}/categories`, and `restaurants/{restaurantId}/products`)
 * as the single authoritative source of truth.
 * Never initializes with hardcoded branding or static product arrays.
 */
export function usePublicMenu(overrideRestaurantId?: string): PublicMenuState {
  const restaurantId = getRestaurantId(overrideRestaurantId);
  const {
    profile,
    status: settingsStatus,
    error: settingsError,
    retry: retrySettings,
  } = useRestaurantSettings(restaurantId);

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [catLoaded, setCatLoaded] = useState(false);
  const [prodLoaded, setProdLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const retry = useCallback(() => {
    setCatLoaded(false);
    setProdLoaded(false);
    setError(null);
    setRetryTick((prev) => prev + 1);
    if (settingsStatus === 'error') {
      retrySettings();
    }
  }, [retrySettings, settingsStatus]);

  useEffect(() => {
    let active = true;

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
      unsubCategories();
      unsubProducts();
    };
  }, [restaurantId, retryTick]);

  const loading = !catLoaded || !prodLoaded;

  return {
    profile,
    settingsStatus,
    settingsError,
    categories,
    products,
    loading,
    error,
    retry,
    retrySettings,
  };
}
