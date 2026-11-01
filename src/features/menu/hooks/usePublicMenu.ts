import { useCallback, useEffect, useState } from 'react';
import { getRestaurantId } from '../../../config/app';
import { subscribeToPublicCategories } from '../../categories/services/categoryService';
import { subscribeToPublicProducts } from '../../products/services/productService';
import {
  fetchRestaurantProfile,
  getDefaultRestaurantProfile,
} from '../../settings/services/settingsService';
import type { MenuCategory, MenuProduct, RestaurantProfile } from '../../../types';

export interface PublicMenuState {
  profile: RestaurantProfile;
  categories: MenuCategory[];
  products: MenuProduct[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * Connects live real-time Firestore queries (`restaurants/{restaurantId}/categories`
 * and `restaurants/{restaurantId}/products`) as the single authoritative source of truth.
 * Never falls back to static JSON or hardcoded product arrays.
 */
export function usePublicMenu(): PublicMenuState {
  const restaurantId = getRestaurantId();
  const [profile, setProfile] = useState<RestaurantProfile>(() =>
    getDefaultRestaurantProfile(restaurantId)
  );
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
  }, []);

  useEffect(() => {
    let active = true;

    fetchRestaurantProfile(restaurantId)
      .then((res) => {
        if (active) setProfile(res);
      })
      .catch(() => {
        // Keep default profile header if restaurant root doc is not yet created
      });

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
    categories,
    products,
    loading,
    error,
    retry,
  };
}
