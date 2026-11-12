import type { LocalizedText } from '../../src/types';

export type MatchConfidence = 'EXACT' | 'HIGH' | 'REVIEW' | 'UNMATCHED' | 'RESERVED';

export type ReviewDecisionStatus =
  | 'approved'
  | 'rejected'
  | 'skipped'
  | 'pending_review'
  | 'unmatched'
  | 'reserved_branding';

export type ConflictType =
  | 'none'
  | 'multiple_images_to_one_product'
  | 'one_image_to_multiple_products'
  | 'ambiguous_candidates'
  | 'missing_category_in_catalog';

export interface ImageInventoryItem {
  id: string;
  originalFilename: string;
  filenameWithoutExt: string;
  normalizedFilename: string;
  absoluteSourcePath: string;
  relativePath: string;
  sourceCategory: string;
  mappedCategoryId: string | null;
  mappedCategoryNameHy: string | null;
  isFoodCategory: boolean;
  extension: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  width: number;
  height: number;
  aspectRatio: number;
  orientation: number | null;
  format: string;
  colorSpace: string;
  sha256: string;
  shortHash: string;
}

export interface NonImageInventoryItem {
  originalFilename: string;
  absoluteSourcePath: string;
  relativePath: string;
  sourceCategory: string;
  extension: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  sha256: string;
  note: string;
}

export interface FolderSummary {
  folderName: string;
  mappedCategoryId: string | null;
  mappedCategoryNameHy: string | null;
  isFoodCategory: boolean;
  jpgCount: number;
  otherFilesCount: number;
  totalBytes: number;
  totalFormatted: string;
}

export interface ImageInventoryReport {
  generatedAt: string;
  sourceRootPath: string;
  projectId: string;
  tenantId: string;
  summary: {
    totalFilesScanned: number;
    totalJpgImages: number;
    foodCategoryImages: number;
    restaurantBrandingImages: number;
    nonImageFilesCount: number;
    totalImageBytes: number;
    totalImageSizeFormatted: string;
    foodImageBytes: number;
    foodImageSizeFormatted: string;
    restaurantImageBytes: number;
    restaurantImageSizeFormatted: string;
    uniqueSha256Count: number;
    duplicateHashFiles: Array<{ sha256: string; files: string[] }>;
  };
  folders: FolderSummary[];
  images: ImageInventoryItem[];
  nonImageFiles: NonImageInventoryItem[];
}

export interface CandidateProductMatch {
  productId: string;
  sourceId?: number;
  categoryId: string;
  categoryNameHy: string;
  name: LocalizedText;
  price: number;
  secondPrice?: number | null;
  existingImageUrl?: string;
  existingImagePath?: string;
  score: number;
  matchType: string;
  reason: string;
}

export interface ImageMatchResult {
  imageId: string;
  originalFilename: string;
  relativePath: string;
  absoluteSourcePath: string;
  sourceCategory: string;
  mappedCategoryId: string | null;
  mappedCategoryNameHy: string | null;
  isFoodCategory: boolean;
  width: number;
  height: number;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  sha256: string;
  shortHash: string;
  normalizedFilename: string;
  confidence: MatchConfidence;
  suggestedProductId: string | null;
  suggestedProduct: CandidateProductMatch | null;
  candidates: CandidateProductMatch[];
  reason: string;
  conflictType: ConflictType;
  conflictWarning: string | null;
  conflictingImageIds: string[];
  blockedCrossCategoryMatches: Array<{
    productId: string;
    nameHy: string;
    categoryNameHy: string;
    reason: string;
  }>;
}

export interface ReviewDecisionRecord {
  imageId: string;
  relativePath: string;
  originalFilename: string;
  sourceCategory: string;
  confidence: MatchConfidence;
  status: ReviewDecisionStatus;
  selectedProductId: string | null;
  autoApprovedUnambiguous: boolean;
  notes: string;
  updatedAt: string;
}

export interface ReviewDecisionsFile {
  version: number;
  tenantId: string;
  projectId: string;
  generatedAt: string;
  updatedAt: string;
  decisions: Record<string, ReviewDecisionRecord>;
}

export interface OptimizedImageRecord {
  imageId: string;
  productId: string;
  productNameHy: string;
  sourceRelativePath: string;
  sourceAbsolutePath: string;
  optimizedFilename: string;
  optimizedRelativePath: string;
  optimizedAbsolutePath: string;
  proposedStoragePath: string;
  originalWidth: number;
  originalHeight: number;
  optimizedWidth: number;
  optimizedHeight: number;
  originalBytes: number;
  optimizedBytes: number;
  reductionBytes: number;
  reductionPercent: number;
  originalSha256: string;
  optimizedSha256: string;
  shortHash: string;
  quality: number;
  status: 'optimized' | 'failed';
  error?: string;
}

export interface OptimizationReport {
  generatedAt: string;
  tenantId: string;
  projectId: string;
  settings: {
    format: 'webp';
    maxWidth: number;
    quality: number;
    preserveAspectRatio: boolean;
    withoutEnlargement: boolean;
    stripMetadata: boolean;
    autoOrientExif: boolean;
  };
  summary: {
    totalApprovedImages: number;
    successfulConversions: number;
    failedConversions: number;
    originalTotalBytes: number;
    originalTotalFormatted: string;
    optimizedTotalBytes: number;
    optimizedTotalFormatted: string;
    savedBytes: number;
    savedFormatted: string;
    reductionPercent: number;
  };
  items: OptimizedImageRecord[];
  failures: Array<{
    imageId: string;
    productId: string;
    sourceRelativePath: string;
    error: string;
  }>;
}

