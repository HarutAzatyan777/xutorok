import { getRestaurantId } from '../../config/app';

export type SettingDocId = 'general' | 'menu' | 'branding';
export type StorageMediaFolder = 'products' | 'categories' | 'branding';

/**
 * Centralized tenant-scoped Firestore and Storage path builders.
 * Prevents accidental access to root-level unscoped collections or other tenants.
 */
export const tenantPaths = {
  restaurantDoc: (restaurantId = getRestaurantId()) =>
    `restaurants/${restaurantId}` as const,

  categoriesCollection: (restaurantId = getRestaurantId()) =>
    `restaurants/${restaurantId}/categories` as const,

  categoryDoc: (categoryId: string, restaurantId = getRestaurantId()) =>
    `restaurants/${restaurantId}/categories/${categoryId}` as const,

  productsCollection: (restaurantId = getRestaurantId()) =>
    `restaurants/${restaurantId}/products` as const,

  productDoc: (productId: string, restaurantId = getRestaurantId()) =>
    `restaurants/${restaurantId}/products/${productId}` as const,

  membersCollection: (restaurantId = getRestaurantId()) =>
    `restaurants/${restaurantId}/members` as const,

  memberDoc: (uid: string, restaurantId = getRestaurantId()) =>
    `restaurants/${restaurantId}/members/${uid}` as const,

  settingsCollection: (restaurantId = getRestaurantId()) =>
    `restaurants/${restaurantId}/settings` as const,

  settingDoc: (settingId: SettingDocId, restaurantId = getRestaurantId()) =>
    `restaurants/${restaurantId}/settings/${settingId}` as const,

  platformAdminDoc: (uid: string) =>
    `platformAdmins/${uid}` as const,

  storageFolder: (folder: StorageMediaFolder, restaurantId = getRestaurantId()) =>
    `restaurants/${restaurantId}/${folder}` as const,

  storageFilePath: (
    folder: StorageMediaFolder,
    fileName: string,
    restaurantId = getRestaurantId()
  ) => `restaurants/${restaurantId}/${folder}/${fileName}` as const,
};

