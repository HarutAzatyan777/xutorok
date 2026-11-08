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
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { getRestaurantId } from '../../../config/app';
import { db } from '../../../config/firebase';
import { categoryConverter } from '../../../lib/firebase/converters';
import { tenantPaths } from '../../../lib/firebase/paths';
import { normalizeOptionalLocalizedText, slugify } from '../../../lib/utils/format';
import type { MenuCategory } from '../../../types';
import type { CategoryFormValues } from '../schemas/categorySchema';

export function getCategoriesCollectionRef(restaurantId = getRestaurantId()) {
  return collection(db, tenantPaths.categoriesCollection(restaurantId)).withConverter(
    categoryConverter
  );
}

export function getCategoryDocRef(categoryId: string, restaurantId = getRestaurantId()) {
  return doc(db, tenantPaths.categoryDoc(categoryId, restaurantId)).withConverter(
    categoryConverter
  );
}

/**
 * Fetches visible categories for the public menu, sorted by sortOrder.
 */
export async function fetchPublicCategories(
  restaurantId = getRestaurantId()
): Promise<MenuCategory[]> {
  const q = query(
    getCategoriesCollectionRef(restaurantId),
    where('isVisible', '==', true),
    orderBy('sortOrder', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data());
}

/**
 * Real-time subscription to visible categories for the public menu.
 */
export function subscribeToPublicCategories(
  onData: (categories: MenuCategory[]) => void,
  onError: (err: Error) => void,
  restaurantId = getRestaurantId()
): Unsubscribe {
  const q = query(
    getCategoriesCollectionRef(restaurantId),
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
 * Fetches all categories (including hidden ones) for the admin dashboard.
 */
export async function fetchAdminCategories(
  restaurantId = getRestaurantId()
): Promise<MenuCategory[]> {
  const q = query(getCategoriesCollectionRef(restaurantId), orderBy('sortOrder', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data());
}

/**
 * Real-time subscription to all categories for the admin panel.
 */
export function subscribeToAdminCategories(
  onData: (categories: MenuCategory[]) => void,
  onError: (err: Error) => void,
  restaurantId = getRestaurantId()
): Unsubscribe {
  return onSnapshot(
    getCategoriesCollectionRef(restaurantId),
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => d.data())
        .sort((a, b) => a.sortOrder - b.sortOrder);
      onData(items);
    },
    (err) => onError(err)
  );
}

export async function createCategory(
  values: CategoryFormValues,
  customId?: string,
  restaurantId = getRestaurantId()
): Promise<MenuCategory> {
  const colRef = collection(db, tenantPaths.categoriesCollection(restaurantId));
  const slug = values.slug.trim() || slugify(values.name.en || values.name.hy);
  const docRef = customId ? doc(colRef, customId) : doc(colRef);

  const payload: Record<string, unknown> = {
    id: docRef.id,
    restaurantId,
    name: {
      hy: values.name.hy.trim(),
      ru: values.name.ru.trim(),
      en: values.name.en.trim(),
    },
    slug,
    sortOrder: Number(values.sortOrder) || 0,
    isVisible: Boolean(values.isVisible),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const desc = normalizeOptionalLocalizedText(values.description);
  if (desc) payload.description = desc;
  if (values.imageUrl) payload.imageUrl = values.imageUrl.trim();
  if (values.imagePath) payload.imagePath = values.imagePath.trim();

  await setDoc(docRef, payload);

  return {
    id: docRef.id,
    restaurantId,
    name: {
      hy: values.name.hy.trim(),
      ru: values.name.ru.trim(),
      en: values.name.en.trim(),
    },
    ...(desc ? { description: desc } : {}),
    slug,
    sortOrder: Number(values.sortOrder) || 0,
    isVisible: Boolean(values.isVisible),
    ...(values.imageUrl?.trim() ? { imageUrl: values.imageUrl.trim() } : {}),
    ...(values.imagePath?.trim() ? { imagePath: values.imagePath.trim() } : {}),
  };
}

export async function updateCategory(
  categoryId: string,
  values: CategoryFormValues,
  restaurantId = getRestaurantId()
): Promise<void> {
  const docRef = doc(db, tenantPaths.categoryDoc(categoryId, restaurantId));
  const slug = values.slug.trim() || slugify(values.name.en || values.name.hy);

  const payload: Record<string, unknown> = {
    id: categoryId,
    restaurantId,
    name: {
      hy: values.name.hy.trim(),
      ru: values.name.ru.trim(),
      en: values.name.en.trim(),
    },
    slug,
    sortOrder: Number(values.sortOrder) || 0,
    isVisible: Boolean(values.isVisible),
    updatedAt: serverTimestamp(),
  };

  const desc = normalizeOptionalLocalizedText(values.description);
  payload.description = desc ?? null;
  payload.imageUrl = values.imageUrl ? values.imageUrl.trim() : null;
  payload.imagePath = values.imagePath ? values.imagePath.trim() : null;

  await updateDoc(docRef, payload);
}

export async function toggleCategoryVisibility(
  category: MenuCategory,
  isVisible: boolean,
  restaurantId = getRestaurantId()
): Promise<void> {
  const docRef = doc(db, tenantPaths.categoryDoc(category.id, restaurantId));
  await updateDoc(docRef, {
    isVisible,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Reassigns all products from one category to another while preserving referential integrity.
 */
export async function reassignCategoryProducts(
  fromCategoryId: string,
  toCategoryId: string,
  restaurantId = getRestaurantId()
): Promise<number> {
  if (!fromCategoryId || !toCategoryId || fromCategoryId === toCategoryId) {
    throw new Error('Please choose a different target category.');
  }

  const targetCatRef = doc(db, tenantPaths.categoryDoc(toCategoryId, restaurantId));
  const targetSnap = await getDoc(targetCatRef);
  if (!targetSnap.exists()) {
    throw new Error('Target category does not exist.');
  }

  const productsCol = collection(db, tenantPaths.productsCollection(restaurantId));
  const q = query(productsCol, where('categoryId', '==', fromCategoryId));
  const linkedProducts = await getDocs(q);

  if (linkedProducts.empty) {
    return 0;
  }

  let batch = writeBatch(db);
  let opCount = 0;

  for (const prodDoc of linkedProducts.docs) {
    batch.update(prodDoc.ref, {
      categoryId: toCategoryId,
      updatedAt: serverTimestamp(),
    });
    opCount++;
    if (opCount >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      opCount = 0;
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }

  return linkedProducts.size;
}

/**
 * Safely deletes a category after verifying no products are still assigned to it.
 */
export async function deleteCategorySafely(
  categoryId: string,
  restaurantId = getRestaurantId()
): Promise<void> {
  const productsCol = collection(db, tenantPaths.productsCollection(restaurantId));
  const q = query(productsCol, where('categoryId', '==', categoryId));
  const linkedProducts = await getDocs(q);

  if (!linkedProducts.empty) {
    throw new Error(
      `Cannot delete category while it still contains ${linkedProducts.size} product(s). Reassign those products to another category first.`
    );
  }

  const docRef = doc(db, tenantPaths.categoryDoc(categoryId, restaurantId));
  await deleteDoc(docRef);
}
