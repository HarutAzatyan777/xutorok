import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import sharp from 'sharp';
import { escapeCsvCell, formatBytes } from './normalize';
import type { ProductMatchingReport } from './matcher';
import type {
  OptimizationReport,
  OptimizedImageRecord,
  ReviewDecisionsFile,
} from './types';

const PROJECT_ID = 'ai-twin-conflicts';
const TENANT_ID = 'xutorok';
const MAX_WIDTH = 1200;
const WEBP_QUALITY = 82;

function computeBufferSha256(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export async function runImageOptimization(
  projectRoot = process.cwd()
): Promise<OptimizationReport> {
  const reportsDir = path.join(projectRoot, 'reports', 'xutorok-images');
  const matchingPath = path.join(reportsDir, 'matching-report.json');
  const decisionsPath = path.join(reportsDir, 'review-decisions.json');
  const optimizedDir = path.join(reportsDir, 'optimized');

  if (!fs.existsSync(matchingPath)) {
    throw new Error(
      `Matching report not found at "${matchingPath}". Run matcher.ts first.`
    );
  }
  if (!fs.existsSync(decisionsPath)) {
    throw new Error(
      `Review decisions not found at "${decisionsPath}". Run matcher.ts first.`
    );
  }

  const matchingReport = JSON.parse(
    fs.readFileSync(matchingPath, 'utf-8')
  ) as ProductMatchingReport;
  const decisionsFile = JSON.parse(
    fs.readFileSync(decisionsPath, 'utf-8')
  ) as ReviewDecisionsFile;

  fs.mkdirSync(optimizedDir, { recursive: true });

  const matchById = new Map(matchingReport.results.map((r) => [r.imageId, r]));

  // Collect all approved decisions with a valid selectedProductId
  const approvedEntries = Object.values(decisionsFile.decisions)
    .filter((d) => d.status === 'approved' && Boolean(d.selectedProductId))
    .sort((a, b) =>
      (a.selectedProductId ?? '').localeCompare(b.selectedProductId ?? '')
    );

  // Guard against two approved images targeting the same productId
  const seenProducts = new Map<string, string>();
  for (const decision of approvedEntries) {
    const pid = decision.selectedProductId!;
    const existingImgId = seenProducts.get(pid);
    if (existingImgId) {
      throw new Error(
        `Conflict in approved decisions: both "${existingImgId}" and "${decision.imageId}" are approved for product "${pid}". Resolve conflict before optimizing.`
      );
    }
    seenProducts.set(pid, decision.imageId);
  }

  const items: OptimizedImageRecord[] = [];
  const failures: OptimizationReport['failures'] = [];

  let originalTotalBytes = 0;
  let optimizedTotalBytes = 0;

  // Process with bounded concurrency of 4
  const concurrency = 4;
  for (let i = 0; i < approvedEntries.length; i += concurrency) {
    const batch = approvedEntries.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (decision) => {
        const match = matchById.get(decision.imageId);
        const productId = decision.selectedProductId!;
        if (!match) {
          failures.push({
            imageId: decision.imageId,
            productId,
            sourceRelativePath: decision.relativePath,
            error: `Image ID "${decision.imageId}" not found in matching report.`,
          });
          return;
        }

        const candidate =
          match.candidates.find((c) => c.productId === productId) ??
          match.suggestedProduct;
        const productNameHy = candidate?.name.hy ?? productId;

        const shortHash = match.shortHash;
        const optimizedFilename = `${productId}-${shortHash}.webp`;
        const optimizedAbsolutePath = path.join(optimizedDir, optimizedFilename);
        const optimizedRelativePath = path.relative(
          projectRoot,
          optimizedAbsolutePath
        );
        const proposedStoragePath = `restaurants/${TENANT_ID}/products/${productId}/${shortHash}.webp`;

        try {
          // Idempotent reuse if already generated from the same source hash
          let outputBuffer: Buffer;
          let outMeta: sharp.Metadata;

          if (fs.existsSync(optimizedAbsolutePath)) {
            outputBuffer = fs.readFileSync(optimizedAbsolutePath);
            outMeta = await sharp(outputBuffer).metadata();
          } else {
            outputBuffer = await sharp(match.absoluteSourcePath)
              .rotate() // Auto-orient from EXIF and strip EXIF orientation tag
              .resize({
                width: MAX_WIDTH,
                withoutEnlargement: true,
                fit: 'inside',
              })
              .webp({
                quality: WEBP_QUALITY,
                effort: 5,
                smartSubsample: true,
              })
              .toBuffer();

            fs.writeFileSync(optimizedAbsolutePath, outputBuffer);
            outMeta = await sharp(outputBuffer).metadata();
          }

          const optimizedSha256 = computeBufferSha256(outputBuffer);
          const originalBytes = match.fileSizeBytes;
          const optimizedBytes = outputBuffer.length;
          const reductionBytes = originalBytes - optimizedBytes;
          const reductionPercent =
            originalBytes > 0
              ? Number(((reductionBytes / originalBytes) * 100).toFixed(2))
              : 0;

          originalTotalBytes += originalBytes;
          optimizedTotalBytes += optimizedBytes;

          items.push({
            imageId: match.imageId,
            productId,
            productNameHy,
            sourceRelativePath: match.relativePath,
            sourceAbsolutePath: match.absoluteSourcePath,
            optimizedFilename,
            optimizedRelativePath,
            optimizedAbsolutePath,
            proposedStoragePath,
            originalWidth: match.width,
            originalHeight: match.height,
            optimizedWidth: outMeta.width ?? 0,
            optimizedHeight: outMeta.height ?? 0,
            originalBytes,
            optimizedBytes,
            reductionBytes,
            reductionPercent,
            originalSha256: match.sha256,
            optimizedSha256,
            shortHash,
            quality: WEBP_QUALITY,
            status: 'optimized',
          });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          failures.push({
            imageId: match.imageId,
            productId,
            sourceRelativePath: match.relativePath,
            error: errorMsg,
          });
        }
      })
    );
  }

  items.sort((a, b) => a.productId.localeCompare(b.productId));

  const savedBytes = originalTotalBytes - optimizedTotalBytes;
  const reductionPercent =
    originalTotalBytes > 0
      ? Number(((savedBytes / originalTotalBytes) * 100).toFixed(2))
      : 0;

  const report: OptimizationReport = {
    generatedAt: new Date().toISOString(),
    tenantId: TENANT_ID,
    projectId: PROJECT_ID,
    settings: {
      format: 'webp',
      maxWidth: MAX_WIDTH,
      quality: WEBP_QUALITY,
      preserveAspectRatio: true,
      withoutEnlargement: true,
      stripMetadata: true,
      autoOrientExif: true,
    },
    summary: {
      totalApprovedImages: approvedEntries.length,
      successfulConversions: items.length,
      failedConversions: failures.length,
      originalTotalBytes,
      originalTotalFormatted: formatBytes(originalTotalBytes),
      optimizedTotalBytes,
      optimizedTotalFormatted: formatBytes(optimizedTotalBytes),
      savedBytes,
      savedFormatted: formatBytes(savedBytes),
      reductionPercent,
    },
    items,
    failures,
  };

  const jsonPath = path.join(reportsDir, 'optimization-report.json');
  const csvPath = path.join(reportsDir, 'optimization-report.csv');
  const mdPath = path.join(reportsDir, 'optimization-report.md');

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');

  const csvHeader = [
    'productId',
    'productNameHy',
    'imageId',
    'sourceRelativePath',
    'optimizedFilename',
    'proposedStoragePath',
    'originalDimensions',
    'optimizedDimensions',
    'originalBytes',
    'optimizedBytes',
    'reductionPercent',
    'originalSha256',
    'optimizedSha256',
  ];
  const csvRows = [csvHeader.join(',')];
  for (const item of items) {
    csvRows.push(
      [
        item.productId,
        item.productNameHy,
        item.imageId,
        item.sourceRelativePath,
        item.optimizedFilename,
        item.proposedStoragePath,
        `${item.originalWidth}x${item.originalHeight}`,
        `${item.optimizedWidth}x${item.optimizedHeight}`,
        item.originalBytes,
        item.optimizedBytes,
        `${item.reductionPercent}%`,
        item.originalSha256,
        item.optimizedSha256,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }
  fs.writeFileSync(csvPath, '\uFEFF' + csvRows.join('\n') + '\n', 'utf-8');

  const mdLines = [
    '# Xutorok Menu Image Optimization Report',
    '',
    `- **Generated At:** \`${report.generatedAt}\``,
    `- **Target Tenant:** \`${report.tenantId}\` (\`restaurants/${report.tenantId}\`)`,
    `- **Format / Quality:** WebP (quality: ${WEBP_QUALITY}, max width: ${MAX_WIDTH}px, aspect ratio preserved, EXIF auto-oriented & stripped)`,
    '',
    '## 1. Measured Size Reduction Summary',
    '',
    '| Metric | Value |',
    '| :--- | :--- |',
    `| Approved Images Processed | **${report.summary.totalApprovedImages}** |`,
    `| Successful Conversions | **${report.summary.successfulConversions}** |`,
    `| Failed Conversions | **${report.summary.failedConversions}** |`,
    `| Original Total Size | **${report.summary.originalTotalFormatted}** (${report.summary.originalTotalBytes.toLocaleString()} bytes) |`,
    `| Optimized Total Size | **${report.summary.optimizedTotalFormatted}** (${report.summary.optimizedTotalBytes.toLocaleString()} bytes) |`,
    `| Total Storage Saved | **${report.summary.savedFormatted}** (${report.summary.savedBytes.toLocaleString()} bytes) |`,
    `| Measured Size Reduction | **${report.summary.reductionPercent}%** |`,
    '',
  ];
  fs.writeFileSync(mdPath, mdLines.join('\n'), 'utf-8');

  return report;
}

if (
  import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}` ||
  process.argv[1]?.endsWith('optimize.ts')
) {
  runImageOptimization()
    .then((report) => {
      console.log('==============================================================');
      console.log(' XUTOROK IMAGE OPTIMIZATION COMPLETE');
      console.log('==============================================================');
      console.log(`Approved Images Processed  : ${report.summary.totalApprovedImages}`);
      console.log(`Successful Conversions     : ${report.summary.successfulConversions}`);
      console.log(`Failed Conversions         : ${report.summary.failedConversions}`);
      console.log(`Original Total Size        : ${report.summary.originalTotalFormatted} (${report.summary.originalTotalBytes} bytes)`);
      console.log(`Optimized Total Size       : ${report.summary.optimizedTotalFormatted} (${report.summary.optimizedTotalBytes} bytes)`);
      console.log(`Storage Saved              : ${report.summary.savedFormatted} (${report.summary.savedBytes} bytes)`);
      console.log(`Measured Reduction         : ${report.summary.reductionPercent}%`);
      console.log('--------------------------------------------------------------');
      console.log('Saved: reports/xutorok-images/optimized/*.webp');
      console.log('Saved: reports/xutorok-images/optimization-report.json');
      console.log('Saved: reports/xutorok-images/optimization-report.csv');
      console.log('Saved: reports/xutorok-images/optimization-report.md');
      console.log('==============================================================');
    })
    .catch((err) => {
      console.error('[Optimization Error]', err);
      process.exit(1);
    });
}

