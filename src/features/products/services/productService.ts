import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { getRestaurantId } from '../../../config/app';
import { db } from '../../../config/firebase';
import { productConverter } from '../../../lib/firebase/converters';
import { tenantPaths } from '../../../lib/firebase/paths';
import { normalizeOptionalLocalizedText } from '../../../lib/utils/format';
import type { MenuProduct } from '../../../types';
import type { ProductFormValues } from '../schemas/productSchema';

export function getProductsCollectionRef(restaurantId = getRestaurantId()) {
  return collection(db, tenantPaths.productsCollection(restaurantId)).withConverter(
    productConverter
  );
}

export function getProductDocRef(productId: string, restaurantId = getRestaurantId()) {
  return doc(db, tenantPaths.productDoc(productId, restaurantId)).withConverter(
    productConverter
  );
}

/**
 * Fetches visible products for the public menu.
 */
export async function fetchPublicProducts(
  restaurantId = getRestaurantId()
): Promise<MenuProduct[]> {
  const q = query(
    getProductsCollectionRef(restaurantId),
    where('isVisible', '==', true),
    orderBy('sortOrder', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data());
}

/**
 * Real-time subscription to visible products for the public menu.
 */
export function subscribeToPublicProducts(
  onData: (products: MenuProduct[]) => void,
  onError: (err: Error) => void,
  restaurantId = getRestaurantId()
): Unsubscribe {
  const q = query(
    getProductsCollectionRef(restaurantId),
    where('isVisible', '==', true)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => d.data())
        .sort((a, b) => a.sortOrder - b.sortOrder);
      onData(items);
    },
    (err) => onError(err)
  );
}

/**
 * Fetches all products (including hidden ones) for the admin dashboard.
 */
export async function fetchAdminProducts(
  restaurantId = getRestaurantId()
): Promise<MenuProduct[]> {
  const q = query(getProductsCollectionRef(restaurantId), orderBy('sortOrder', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data());
}

/**
 * Real-time subscription to all products for the admin dashboard.
 */
export function subscribeToAdminProducts(
  onData: (products: MenuProduct[]) => void,
  onError: (err: Error) => void,
  restaurantId = getRestaurantId()
): Unsubscribe {
  return onSnapshot(
    getProductsCollectionRef(restaurantId),
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => d.data())
        .sort((a, b) => a.sortOrder - b.sortOrder);
      onData(items);
    },
    (err) => onError(err)
  );
}

export async function fetchProductById(
  productId: string,
  restaurantId = getRestaurantId()
): Promise<MenuProduct | null> {
  const snap = await getDoc(getProductDocRef(productId, restaurantId));
  return snap.exists() ? snap.data() : null;
}

function buildProductWritePayload(
  id: string,
  values: ProductFormValues,
  restaurantId: string,
  isNew: boolean
): Record<string, unknown> {
  const variants = (values.variants ?? []).map((v, idx) => ({
    id: v.id || `v-${idx + 1}`,
    label: {
      hy: v.label.hy?.trim() ?? '',
      ru: v.label.ru?.trim() ?? '',
      en: v.label.en?.trim() ?? '',
    },
    price: Number(v.price) || 0,
    sortOrder: typeof v.sortOrder === 'number' ? v.sortOrder : idx,
  }));

  const payload: Record<string, unknown> = {
    id,
    restaurantId,
    categoryId: values.categoryId.trim(),
    name: {
      hy: values.name.hy.trim(),
      ru: values.name.ru.trim(),
      en: values.name.en.trim(),
    },
    price: Number(values.price) || 0,
    currency: 'AMD',
    variants,
    isAvailable: Boolean(values.isAvailable),
    isVisible: Boolean(values.isVisible),
    isFeatured: Boolean(values.isFeatured),
    sortOrder: Number(values.sortOrder) || 0,
    updatedAt: serverTimestamp(),
  };

  if (isNew) {
    payload.createdAt = serverTimestamp();
  }

  const desc = normalizeOptionalLocalizedText(values.description);
  if (desc) {
    payload.description = desc;
  } else {
    payload.description = null;
  }

  payload.imageUrl = values.imageUrl ? values.imageUrl.trim() : null;
  payload.imagePath = values.imagePath ? values.imagePath.trim() : null;

  return payload;
}

export async function createProduct(
  values: ProductFormValues,
  customId?: string,
  restaurantId = getRestaurantId()
): Promise<MenuProduct> {
  const colRef = collection(db, tenantPaths.productsCollection(restaurantId));
  const docRef = customId ? doc(colRef, customId) : doc(colRef);
  const payload = buildProductWritePayload(docRef.id, values, restaurantId, true);

  await setDoc(docRef, payload);

  const desc = normalizeOptionalLocalizedText(values.description);
  const variants = (values.variants ?? []).map((v, idx) => ({
    id: v.id || `v-${idx + 1}`,
    label: {
      hy: v.label.hy?.trim() ?? '',
      ru: v.label.ru?.trim() ?? '',
      en: v.label.en?.trim() ?? '',
    },
    price: Number(v.price) || 0,
    sortOrder: typeof v.sortOrder === 'number' ? v.sortOrder : idx,
  }));

  return {
    id: docRef.id,
    restaurantId,
    categoryId: values.categoryId.trim(),
    name: {
      hy: values.name.hy.trim(),
      ru: values.name.ru.trim(),
      en: values.name.en.trim(),
    },
    ...(desc ? { description: desc } : {}),
    price: Number(values.price) || 0,
    currency: 'AMD',
    ...(variants.length > 0 ? { variants } : {}),
    ...(values.imageUrl?.trim() ? { imageUrl: values.imageUrl.trim() } : {}),
    ...(values.imagePath?.trim() ? { imagePath: values.imagePath.trim() } : {}),
    isAvailable: Boolean(values.isAvailable),
    isVisible: Boolean(values.isVisible),
    isFeatured: Boolean(values.isFeatured),
    sortOrder: Number(values.sortOrder) || 0,
  };
}

export async function updateProduct(
  productId: string,
  values: ProductFormValues,
  restaurantId = getRestaurantId()
): Promise<void> {
  const docRef = doc(db, tenantPaths.productDoc(productId, restaurantId));
  const payload = buildProductWritePayload(productId, values, restaurantId, false);
  await updateDoc(docRef, payload);
}

export async function toggleProductFlag(
  productId: string,
  field: 'isAvailable' | 'isVisible' | 'isFeatured',
  value: boolean,
  restaurantId = getRestaurantId()
): Promise<void> {
  const docRef = doc(db, tenantPaths.productDoc(productId, restaurantId));
  await updateDoc(docRef, {
    [field]: value,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Safely archives a product by hiding it from the public menu and marking it unavailable
 * without deleting its Firestore document or associated Storage files.
 */
export async function archiveProduct(
  productId: string,
  restaurantId = getRestaurantId()
): Promise<void> {
  const docRef = doc(db, tenantPaths.productDoc(productId, restaurantId));
  await updateDoc(docRef, {
    isVisible: false,
    isAvailable: false,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes a product document from Firestore after confirmation.
 * Does NOT automatically delete associated Storage files.
 */
export async function deleteProduct(
  product: MenuProduct,
  restaurantId = getRestaurantId()
): Promise<void> {
  const docRef = doc(db, tenantPaths.productDoc(product.id, restaurantId));
  await deleteDoc(docRef);
}
