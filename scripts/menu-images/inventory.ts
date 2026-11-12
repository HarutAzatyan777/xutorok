import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import sharp from 'sharp';
import {
  escapeCsvCell,
  formatBytes,
  normalizeArmenianText,
  SOURCE_FOLDER_MAPPINGS,
  SOURCE_IMAGES_ROOT,
  stripExtension,
  WSL_SOURCE_IMAGES_ROOT,
} from './normalize';
import type {
  FolderSummary,
  ImageInventoryItem,
  ImageInventoryReport,
  NonImageInventoryItem,
} from './types';

const PROJECT_ID = 'ai-twin-conflicts';
const TENANT_ID = 'xutorok';

export function resolveSourceImagesRoot(): string {
  if (fs.existsSync(SOURCE_IMAGES_ROOT)) {
    return SOURCE_IMAGES_ROOT;
  }
  if (fs.existsSync(WSL_SOURCE_IMAGES_ROOT)) {
    return WSL_SOURCE_IMAGES_ROOT;
  }
  throw new Error(
    `Source image directory is not accessible at "${SOURCE_IMAGES_ROOT}" or "${WSL_SOURCE_IMAGES_ROOT}".`
  );
}

function computeFileSha256(filePath: string): string {
  const hash = crypto.createHash('sha256');
  const buffer = fs.readFileSync(filePath);
  hash.update(buffer);
  return hash.digest('hex');
}

export async function runImageInventory(projectRoot = process.cwd()): Promise<ImageInventoryReport> {
  const sourceRoot = resolveSourceImagesRoot();
  const topEntries = fs
    .readdirSync(sourceRoot, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name, 'hy'));

  const images: ImageInventoryItem[] = [];
  const nonImageFiles: NonImageInventoryItem[] = [];
  const folders: FolderSummary[] = [];

  let imgCounter = 0;

  async function scanFolder(folderPath: string, sourceCategory: string) {
    const entries = fs
      .readdirSync(folderPath, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name, 'hy'));

    const mapping = SOURCE_FOLDER_MAPPINGS[sourceCategory];
    const mappedCategoryId = mapping?.categoryId ?? null;
    const mappedCategoryNameHy = mapping?.categoryNameHy ?? null;
    const isFoodCategory = mapping ? mapping.isFoodCategory : sourceCategory !== 'Restaurant';

    let folderJpgCount = 0;
    let folderOtherCount = 0;
    let folderTotalBytes = 0;

    for (const entry of entries) {
      const fullPath = path.join(folderPath, entry.name);
      if (entry.isDirectory()) {
        await scanFolder(fullPath, `${sourceCategory}/${entry.name}`);
        continue;
      }

      if (!entry.isFile()) continue;

      const stat = fs.statSync(fullPath);
      const ext = path.extname(entry.name);
      const lowerExt = ext.toLowerCase();
      const relPath = path.relative(sourceRoot, fullPath);
      const sha256 = computeFileSha256(fullPath);

      if (lowerExt === '.jpg' || lowerExt === '.jpeg') {
        imgCounter++;
        folderJpgCount++;
        folderTotalBytes += stat.size;

        const metadata = await sharp(fullPath).metadata();
        const rawWidth = metadata.width ?? 0;
        const rawHeight = metadata.height ?? 0;
        const orientation = metadata.orientation ?? null;
        // Orientations 5, 6, 7, 8 swap width and height when displayed
        const width =
          orientation && orientation >= 5 && orientation <= 8 ? rawHeight : rawWidth;
        const height =
          orientation && orientation >= 5 && orientation <= 8 ? rawWidth : rawHeight;

        const filenameWithoutExt = stripExtension(entry.name);
        const normalizedFilename = normalizeArmenianText(filenameWithoutExt);

        images.push({
          id: `img-${String(imgCounter).padStart(3, '0')}`,
          originalFilename: entry.name.normalize('NFC'),
          filenameWithoutExt: filenameWithoutExt.normalize('NFC'),
          normalizedFilename,
          absoluteSourcePath: fullPath,
          relativePath: relPath,
          sourceCategory,
          mappedCategoryId,
          mappedCategoryNameHy,
          isFoodCategory,
          extension: ext,
          fileSizeBytes: stat.size,
          fileSizeFormatted: formatBytes(stat.size),
          width,
          height,
          aspectRatio: height > 0 ? Number((width / height).toFixed(4)) : 0,
          orientation,
          format: metadata.format ?? 'jpeg',
          colorSpace: metadata.space ?? 'srgb',
          sha256,
          shortHash: sha256.slice(0, 12),
        });
      } else {
        folderOtherCount++;
        nonImageFiles.push({
          originalFilename: entry.name.normalize('NFC'),
          absoluteSourcePath: fullPath,
          relativePath: relPath,
          sourceCategory,
          extension: ext,
          fileSizeBytes: stat.size,
          fileSizeFormatted: formatBytes(stat.size),
          sha256,
          note:
            lowerExt === '.pdf'
              ? 'PDF reference document in source folder; ignored during image processing as instructed.'
              : 'Non-JPG file; ignored during image processing.',
        });
      }
    }

    folders.push({
      folderName: sourceCategory,
      mappedCategoryId,
      mappedCategoryNameHy,
      isFoodCategory,
      jpgCount: folderJpgCount,
      otherFilesCount: folderOtherCount,
      totalBytes: folderTotalBytes,
      totalFormatted: formatBytes(folderTotalBytes),
    });
  }

  for (const topEntry of topEntries) {
    if (topEntry.isDirectory()) {
      await scanFolder(path.join(sourceRoot, topEntry.name), topEntry.name);
    }
  }

  // Verify folder counts against expected client-verified numbers
  for (const [folderName, expected] of Object.entries(SOURCE_FOLDER_MAPPINGS)) {
    const found = folders.find((f) => f.folderName === folderName);
    if (!found) {
      throw new Error(`Expected source folder "${folderName}" was not found in "${sourceRoot}".`);
    }
    if (found.jpgCount !== expected.expectedJpgCount) {
      throw new Error(
        `Discrepancy in folder "${folderName}": expected ${expected.expectedJpgCount} JPG files, found ${found.jpgCount}.`
      );
    }
  }

  if (images.length !== 136) {
    throw new Error(
      `Inventory count discrepancy: expected exactly 136 JPG files, found ${images.length}.`
    );
  }

  const foodImages = images.filter((i) => i.isFoodCategory);
  const restaurantImages = images.filter((i) => !i.isFoodCategory);

  if (foodImages.length !== 128 || restaurantImages.length !== 8) {
    throw new Error(
      `Category split discrepancy: expected 128 food images and 8 Restaurant images, found ${foodImages.length} and ${restaurantImages.length}.`
    );
  }

  const totalImageBytes = images.reduce((acc, i) => acc + i.fileSizeBytes, 0);
  const foodImageBytes = foodImages.reduce((acc, i) => acc + i.fileSizeBytes, 0);
  const restaurantImageBytes = restaurantImages.reduce((acc, i) => acc + i.fileSizeBytes, 0);

  // Check duplicate SHA-256 hashes
  const hashGroups = new Map<string, string[]>();
  for (const img of images) {
    const list = hashGroups.get(img.sha256) ?? [];
    list.push(img.relativePath);
    hashGroups.set(img.sha256, list);
  }
  const duplicateHashFiles = Array.from(hashGroups.entries())
    .filter(([, files]) => files.length > 1)
    .map(([sha256, files]) => ({ sha256, files }));

  const report: ImageInventoryReport = {
    generatedAt: new Date().toISOString(),
    sourceRootPath: sourceRoot,
    projectId: PROJECT_ID,
    tenantId: TENANT_ID,
    summary: {
      totalFilesScanned: images.length + nonImageFiles.length,
      totalJpgImages: images.length,
      foodCategoryImages: foodImages.length,
      restaurantBrandingImages: restaurantImages.length,
      nonImageFilesCount: nonImageFiles.length,
      totalImageBytes,
      totalImageSizeFormatted: formatBytes(totalImageBytes),
      foodImageBytes,
      foodImageSizeFormatted: formatBytes(foodImageBytes),
      restaurantImageBytes,
      restaurantImageSizeFormatted: formatBytes(restaurantImageBytes),
      uniqueSha256Count: hashGroups.size,
      duplicateHashFiles,
    },
    folders,
    images,
    nonImageFiles,
  };

  const outDir = path.join(projectRoot, 'reports', 'xutorok-images');
  fs.mkdirSync(outDir, { recursive: true });

  const jsonPath = path.join(outDir, 'inventory.json');
  const csvPath = path.join(outDir, 'inventory.csv');

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');

  const csvHeader = [
    'id',
    'originalFilename',
    'normalizedFilename',
    'sourceCategory',
    'mappedCategoryId',
    'mappedCategoryNameHy',
    'isFoodCategory',
    'extension',
    'fileSizeBytes',
    'fileSizeFormatted',
    'width',
    'height',
    'orientation',
    'sha256',
    'relativePath',
    'absoluteSourcePath',
  ];

  const csvRows: string[] = [csvHeader.join(',')];
  for (const img of images) {
    csvRows.push(
      [
        img.id,
        img.originalFilename,
        img.normalizedFilename,
        img.sourceCategory,
        img.mappedCategoryId ?? '',
        img.mappedCategoryNameHy ?? '',
        img.isFoodCategory ? 'true' : 'false',
        img.extension,
        img.fileSizeBytes,
        img.fileSizeFormatted,
        img.width,
        img.height,
        img.orientation ?? '',
        img.sha256,
        img.relativePath,
        img.absoluteSourcePath,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }

  // Write UTF-8 with BOM so Armenian Unicode displays cleanly in spreadsheet viewers
  fs.writeFileSync(csvPath, '\uFEFF' + csvRows.join('\n') + '\n', 'utf-8');

  return report;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('inventory.ts')) {
  runImageInventory()
    .then((report) => {
      console.log('==============================================================');
      console.log(' XUTOROK IMAGE INVENTORY COMPLETE');
      console.log('==============================================================');
      console.log(`Source Directory         : ${report.sourceRootPath}`);
      console.log(`Total JPG Images         : ${report.summary.totalJpgImages}`);
      console.log(`Food Category Images     : ${report.summary.foodCategoryImages}`);
      console.log(`Restaurant Images        : ${report.summary.restaurantBrandingImages}`);
      console.log(`Non-Image Files (PDF)    : ${report.summary.nonImageFilesCount}`);
      console.log(`Total Image Size         : ${report.summary.totalImageSizeFormatted} (${report.summary.totalImageBytes} bytes)`);
      console.log(`Food Images Size         : ${report.summary.foodImageSizeFormatted} (${report.summary.foodImageBytes} bytes)`);
      console.log(`Unique SHA-256 Hashes    : ${report.summary.uniqueSha256Count}`);
      console.log(`Duplicate Hash Groups    : ${report.summary.duplicateHashFiles.length}`);
      console.log('--------------------------------------------------------------');
      for (const f of report.folders) {
        console.log(
          `  ${f.folderName.padEnd(18)} : ${String(f.jpgCount).padStart(3)} JPGs (${f.totalFormatted})${
            f.otherFilesCount > 0 ? ` + ${f.otherFilesCount} non-image` : ''
          }`
        );
      }
      console.log('--------------------------------------------------------------');
      console.log('Saved: reports/xutorok-images/inventory.json');
      console.log('Saved: reports/xutorok-images/inventory.csv');
      console.log('==============================================================');
    })
    .catch((err) => {
      console.error('[Inventory Error]', err);
      process.exit(1);
    });
}

