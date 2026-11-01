import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { getRestaurantId } from '../../config/app';
import { storage } from '../../config/firebase';
import { tenantPaths, type StorageMediaFolder } from './paths';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/svg+xml',
]);

export interface UploadedImageResult {
  imagePath: string;
  imageUrl: string;
}

export function validateImageFile(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error(
      'Unsupported file format. Please upload a JPG, PNG, WebP, AVIF, or SVG image.'
    );
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('Image size exceeds the 5 MB maximum limit.');
  }
}

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Uploads an image to a restaurant-scoped Storage path (`restaurants/{restaurantId}/{folder}/...`).
 * Does not automatically delete existing Storage files when replacing an image.
 */
export async function uploadRestaurantImage(
  file: File,
  folder: StorageMediaFolder,
  options?: {
    restaurantId?: string;
    previousImagePath?: string;
    itemId?: string;
  }
): Promise<UploadedImageResult> {
  validateImageFile(file);

  const restaurantId = getRestaurantId(options?.restaurantId);
  const safeName = sanitizeFileName(file.name) || 'image.jpg';
  const prefix = options?.itemId ? `${options.itemId}-${Date.now()}` : `${Date.now()}`;
  const fileName = `${prefix}-${safeName}`;
  const imagePath = tenantPaths.storageFilePath(folder, fileName, restaurantId);

  const storageRef = ref(storage, imagePath);
  await uploadBytes(storageRef, file, {
    contentType: file.type,
    cacheControl: 'public, max-age=31536000',
    customMetadata: {
      restaurantId,
      folder,
      ...(options?.previousImagePath ? { replacedPath: options.previousImagePath } : {}),
    },
  });

  const imageUrl = await getDownloadURL(storageRef);

  return { imagePath, imageUrl };
}

/**
 * Explicitly deletes an image from Firebase Storage when authorized,
 * enforcing that the path belongs to the current restaurant tenant.
 */
export async function deleteRestaurantImage(
  imagePath: string,
  restaurantId = getRestaurantId()
): Promise<void> {
  if (!imagePath) return;
  const expectedPrefix = `restaurants/${restaurantId}/`;
  if (!imagePath.startsWith(expectedPrefix)) {
    throw new Error(
      `Security violation: Cannot delete storage object outside tenant prefix "${expectedPrefix}".`
    );
  }
  const storageRef = ref(storage, imagePath);
  await deleteObject(storageRef);
}
