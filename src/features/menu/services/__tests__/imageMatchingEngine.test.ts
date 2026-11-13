import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  canonicalizeArmenianCulinaryTerms,
  normalizeArmenianText,
  stripPortionCountSuffix,
  stripTrailingDuplicateSuffix,
} from '../../../../../scripts/menu-images/normalize';
import type {
  ImageInventoryReport,
  OptimizationReport,
  ReviewDecisionsFile,
} from '../../../../../scripts/menu-images/types';
import type { ProductMatchingReport } from '../../../../../scripts/menu-images/matcher';

describe('Xutorok Menu Photo Inventory, Matching & Optimization Verification', () => {
  const reportsDir = path.resolve(process.cwd(), 'reports', 'xutorok-images');

  it('normalizes Armenian text, punctuation, dashes, and culinary spelling variants deterministically', () => {
    expect(normalizeArmenianText('Իքի–բիր')).toBe('իքի-բիր');
    expect(
      canonicalizeArmenianCulinaryTerms(normalizeArmenianText('Դեսերտ խուտորոկ')).canonical
    ).toBe('դեսերտ խուտոռոկ');
    expect(
      canonicalizeArmenianCulinaryTerms(normalizeArmenianText('Վարեննիկներ կաղամբով')).canonical
    ).toBe('վարենիկներ կաղամբով');
    expect(
      canonicalizeArmenianCulinaryTerms(normalizeArmenianText('Ճուտ տապակա')).canonical
    ).toBe('ճտի տապակա');
    expect(
      canonicalizeArmenianCulinaryTerms(normalizeArmenianText('Արցախյան ժառկո')).canonical
    ).toBe('արցախյան տապակա');
    expect(
      stripPortionCountSuffix(normalizeArmenianText('Դոլմա խաղողի թփով (7 հատ)')).baseName
    ).toBe('դոլմա խաղողի թփով');
    expect(
      stripTrailingDuplicateSuffix(normalizeArmenianText('Ձկան տեսականի-2'))
    ).toEqual({
      baseName: 'ձկան տեսականի',
      duplicateIndex: 2,
    });
  });

  it('verifies inventory report contains exactly 136 JPG images (128 food + 8 Restaurant) and 1 PDF', () => {
    const invPath = path.join(reportsDir, 'inventory.json');
    expect(fs.existsSync(invPath)).toBe(true);
    const inv = JSON.parse(fs.readFileSync(invPath, 'utf-8')) as ImageInventoryReport;

    expect(inv.tenantId).toBe('xutorok');
    expect(inv.projectId).toBe('ai-twin-conflicts');
    expect(inv.summary.totalJpgImages).toBe(136);
    expect(inv.summary.foodCategoryImages).toBe(128);
    expect(inv.summary.restaurantBrandingImages).toBe(8);
    expect(inv.summary.nonImageFilesCount).toBe(1);
    expect(inv.images).toHaveLength(136);
  });

  it('verifies matching report enforces category constraints, flags conflicts, and never auto-approves ambiguous items', () => {
    const matchPath = path.join(reportsDir, 'matching-report.json');
    const decPath = path.join(reportsDir, 'review-decisions.json');
    expect(fs.existsSync(matchPath)).toBe(true);
    expect(fs.existsSync(decPath)).toBe(true);

    const matching = JSON.parse(
      fs.readFileSync(matchPath, 'utf-8')
    ) as ProductMatchingReport;
    const decisions = JSON.parse(
      fs.readFileSync(decPath, 'utf-8')
    ) as ReviewDecisionsFile;

    expect(matching.metrics.totalCatalogProducts).toBe(297);
    expect(matching.metrics.exactMatches).toBe(104);
    expect(matching.metrics.highConfidenceMatches).toBe(9);
    expect(matching.metrics.unambiguousMatchesTotal).toBe(113);
    expect(matching.metrics.reviewAmbiguousMatches).toBe(6);
    expect(matching.metrics.unmatchedImages).toBe(9);
    expect(matching.metrics.restaurantReservedImages).toBe(8);

    // Ensure Pizza items (e.g. Կեսար.jpg, Մարգարիտա.jpg) were blocked from matching Salads or Cocktails
    const pizzaCaesar = matching.results.find(
      (r) => r.sourceCategory === 'Պիցցա' && r.normalizedFilename === 'կեսար'
    );
    expect(pizzaCaesar?.confidence).toBe('UNMATCHED');
    expect(pizzaCaesar?.blockedCrossCategoryMatches.length).toBeGreaterThan(0);

    // Ensure no REVIEW, UNMATCHED, or RESERVED item is auto-approved
    for (const r of matching.results) {
      const dec = decisions.decisions[r.imageId];
      expect(dec).toBeDefined();
      if (r.confidence === 'REVIEW' || r.confidence === 'UNMATCHED' || r.confidence === 'RESERVED') {
        expect(dec.status).not.toBe('approved');
      }
    }
  });

  it('verifies local WebP optimization report for all 113 unambiguous approved images', () => {
    const optPath = path.join(reportsDir, 'optimization-report.json');
    expect(fs.existsSync(optPath)).toBe(true);
    const opt = JSON.parse(fs.readFileSync(optPath, 'utf-8')) as OptimizationReport;

    expect(opt.summary.totalApprovedImages).toBe(113);
    expect(opt.summary.successfulConversions).toBe(113);
    expect(opt.summary.failedConversions).toBe(0);
    expect(opt.summary.reductionPercent).toBeGreaterThan(90);

    for (const item of opt.items) {
      expect(item.optimizedWidth).toBeLessThanOrEqual(1200);
      expect(item.proposedStoragePath).toMatch(
        /^restaurants\/xutorok\/products\/xutorok-item-\d{3}\/[a-f0-9]{12}\.webp$/
      );
      const localOptimizedPath = fs.existsSync(item.optimizedAbsolutePath)
        ? item.optimizedAbsolutePath
        : path.join(reportsDir, 'optimized', item.optimizedFilename);
      expect(fs.existsSync(localOptimizedPath)).toBe(true);
    }
  });
});

