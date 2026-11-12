import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Download,
  Sparkles,
  SkipForward,
  Image as ImageIcon,
  FolderOpen,
  ArrowLeft,
  Eye,
  X,
  RefreshCw,
} from 'lucide-react';
import { formatAMD } from '../../lib/utils/format';
import type { MenuCategory, MenuProduct } from '../../types';

type MatchConfidence = 'EXACT' | 'HIGH' | 'REVIEW' | 'UNMATCHED' | 'RESERVED';

type ReviewDecisionStatus =
  | 'approved'
  | 'rejected'
  | 'skipped'
  | 'pending_review'
  | 'unmatched'
  | 'reserved_branding';

interface CandidateProductMatch {
  productId: string;
  sourceId?: number;
  categoryId: string;
  categoryNameHy: string;
  name: { hy: string; ru: string; en: string };
  price: number;
  secondPrice?: number | null;
  existingImageUrl?: string;
  existingImagePath?: string;
  score: number;
  matchType: string;
  reason: string;
}

interface ImageMatchResult {
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
  conflictType: string;
  conflictWarning: string | null;
  conflictingImageIds: string[];
  blockedCrossCategoryMatches: Array<{
    productId: string;
    nameHy: string;
    categoryNameHy: string;
    reason: string;
  }>;
}

interface ReviewDecisionRecord {
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

interface OptimizedImageRecord {
  imageId: string;
  productId: string;
  optimizedFilename: string;
  optimizedWidth: number;
  optimizedHeight: number;
  originalBytes: number;
  optimizedBytes: number;
  reductionPercent: number;
  proposedStoragePath: string;
}

interface ReviewApiPayload {
  matching: {
    generatedAt: string;
    catalogSource: string;
    metrics: Record<string, number>;
    results: ImageMatchResult[];
  } | null;
  decisions: {
    decisions: Record<string, ReviewDecisionRecord>;
  } | null;
  optimization: {
    summary: {
      totalApprovedImages: number;
      originalTotalFormatted: string;
      optimizedTotalFormatted: string;
      reductionPercent: number;
    };
    items: OptimizedImageRecord[];
  } | null;
  catalog: {
    categories: MenuCategory[];
    products: MenuProduct[];
  };
}

const LOCAL_STORAGE_KEY = 'xutorok_image_review_decisions_v1';

function escapeCsvCell(val: unknown): string {
  const s = val === null || val === undefined ? '' : String(val);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function AdminImageReviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const [results, setResults] = useState<ImageMatchResult[]>([]);
  const [decisions, setDecisions] = useState<Record<string, ReviewDecisionRecord>>({});
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [optimizedMap, setOptimizedMap] = useState<Map<string, OptimizedImageRecord>>(
    new Map()
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [folderFilter, setFolderFilter] = useState<string>('ALL');
  const [onlyConflicts, setOnlyConflicts] = useState(false);

  // Modal state for product picker & photo zoom
  const [pickerImageId, setPickerImageId] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategoryFilter, setPickerCategoryFilter] = useState<string>('ALL');
  const [previewModalItem, setPreviewModalItem] = useState<ImageMatchResult | null>(
    null
  );

  useEffect(() => {
    async function loadReviewData() {
      try {
        setLoading(true);
        const res = await fetch('/__xutorok_image_review/data');
        if (!res.ok) {
          throw new Error(`Failed to load local review data (${res.status})`);
        }
        const data = (await res.json()) as ReviewApiPayload;
        if (!data.matching) {
          throw new Error(
            'Matching report not found. Please run `npx tsx scripts/menu-images/matcher.ts` first.'
          );
        }

        setResults(data.matching.results);
        setProducts(data.catalog.products);
        setCategories(data.catalog.categories);

        const optMap = new Map<string, OptimizedImageRecord>();
        for (const item of data.optimization?.items ?? []) {
          optMap.set(item.imageId, item);
        }
        setOptimizedMap(optMap);

        // Merge server decisions with any newer localStorage backup
        const serverDecisions = data.decisions?.decisions ?? {};
        const mergedDecisions = { ...serverDecisions };
        try {
          const localRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (localRaw) {
            const localParsed = JSON.parse(localRaw) as Record<
              string,
              ReviewDecisionRecord
            >;
            for (const [k, v] of Object.entries(localParsed)) {
              const srv = mergedDecisions[k];
              if (!srv || (v.updatedAt && v.updatedAt > srv.updatedAt)) {
                mergedDecisions[k] = v;
              }
            }
          }
        } catch {
          // Ignore localStorage parse errors
        }

        setDecisions(mergedDecisions);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    void loadReviewData();
  }, []);

  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );
  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  // Detect any duplicate product assignments among currently approved decisions
  const approvedProductCounts = useMemo(() => {
    const counts = new Map<string, string[]>();
    for (const d of Object.values(decisions)) {
      if (d.status === 'approved' && d.selectedProductId) {
        const list = counts.get(d.selectedProductId) ?? [];
        list.push(d.imageId);
        counts.set(d.selectedProductId, list);
      }
    }
    return counts;
  }, [decisions]);

  const persistDecisions = async (
    nextDecisions: Record<string, ReviewDecisionRecord>
  ) => {
    setDecisions(nextDecisions);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextDecisions));
    } catch {
      // Ignore quota errors
    }

    try {
      setSaving(true);
      const res = await fetch('/__xutorok_image_review/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisions: nextDecisions }),
      });
      if (res.ok) {
        const body = (await res.json()) as { updatedAt?: string };
        setLastSavedAt(body.updatedAt ?? new Date().toISOString());
      }
    } finally {
      setSaving(false);
    }
  };

  const updateSingleDecision = (
    imageId: string,
    patch: Partial<ReviewDecisionRecord>
  ) => {
    const match = results.find((r) => r.imageId === imageId);
    if (!match) return;
    const current: ReviewDecisionRecord = decisions[imageId] ?? {
      imageId: match.imageId,
      relativePath: match.relativePath,
      originalFilename: match.originalFilename,
      sourceCategory: match.sourceCategory,
      confidence: match.confidence,
      status: 'pending_review',
      selectedProductId: match.suggestedProductId,
      autoApprovedUnambiguous: false,
      notes: match.reason,
      updatedAt: new Date().toISOString(),
    };

    const updated: ReviewDecisionRecord = {
      ...current,
      ...patch,
      autoApprovedUnambiguous: false,
      updatedAt: new Date().toISOString(),
    };

    void persistDecisions({
      ...decisions,
      [imageId]: updated,
    });
  };

  const handleBulkApproveUnambiguous = () => {
    const nowIso = new Date().toISOString();
    const next = { ...decisions };
    for (const r of results) {
      // Strictly approve ONLY unambiguous matches (EXACT and HIGH without conflicts)
      if (
        (r.confidence === 'EXACT' || r.confidence === 'HIGH') &&
        r.conflictType === 'none' &&
        r.suggestedProductId
      ) {
        next[r.imageId] = {
          imageId: r.imageId,
          relativePath: r.relativePath,
          originalFilename: r.originalFilename,
          sourceCategory: r.sourceCategory,
          confidence: r.confidence,
          status: 'approved',
          selectedProductId: r.suggestedProductId,
          autoApprovedUnambiguous: true,
          notes: r.reason,
          updatedAt: nowIso,
        };
      }
    }
    void persistDecisions(next);
  };

  const handleExportJson = () => {
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      tenantId: 'xutorok',
      projectId: 'ai-twin-conflicts',
      decisions,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xutorok-reviewed-image-mapping-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const header = [
      'imageId',
      'relativePath',
      'originalFilename',
      'sourceCategory',
      'confidence',
      'status',
      'selectedProductId',
      'productNameHy',
      'productNameRu',
      'productNameEn',
      'priceAmd',
      'notes',
      'updatedAt',
    ];
    const rows = [header.join(',')];
    for (const r of results) {
      const d = decisions[r.imageId];
      const pid = d?.selectedProductId ?? r.suggestedProductId ?? '';
      const prod = pid ? productById.get(pid) : undefined;
      rows.push(
        [
          r.imageId,
          r.relativePath,
          r.originalFilename,
          r.sourceCategory,
          r.confidence,
          d?.status ?? 'pending_review',
          pid,
          prod?.name.hy ?? '',
          prod?.name.ru ?? '',
          prod?.name.en ?? '',
          prod?.price ?? '',
          d?.notes ?? r.reason,
          d?.updatedAt ?? '',
        ]
          .map(escapeCsvCell)
          .join(',')
      );
    }
    const blob = new Blob(['\uFEFF' + rows.join('\n') + '\n'], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xutorok-reviewed-image-mapping-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const folders = useMemo(() => {
    const set = new Set<string>();
    for (const r of results) set.add(r.sourceCategory);
    return Array.from(set);
  }, [results]);

  const filteredResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return results.filter((r) => {
      const d = decisions[r.imageId];
      const status = d?.status ?? 'pending_review';
      const selectedPid = d?.selectedProductId ?? r.suggestedProductId;
      const selectedProd = selectedPid ? productById.get(selectedPid) : undefined;

      if (confidenceFilter !== 'ALL' && r.confidence !== confidenceFilter) {
        return false;
      }
      if (statusFilter !== 'ALL' && status !== statusFilter) {
        return false;
      }
      if (folderFilter !== 'ALL' && r.sourceCategory !== folderFilter) {
        return false;
      }
      if (onlyConflicts) {
        const hasDupApproval =
          status === 'approved' &&
          selectedPid &&
          (approvedProductCounts.get(selectedPid)?.length ?? 0) > 1;
        if (
          r.conflictType === 'none' &&
          r.confidence !== 'REVIEW' &&
          !hasDupApproval
        ) {
          return false;
        }
      }

      if (q) {
        const hay = [
          r.imageId,
          r.originalFilename,
          r.relativePath,
          r.sourceCategory,
          selectedPid ?? '',
          selectedProd?.name.hy ?? '',
          selectedProd?.name.ru ?? '',
          selectedProd?.name.en ?? '',
          r.reason,
          r.conflictWarning ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [
    results,
    decisions,
    searchQuery,
    confidenceFilter,
    statusFilter,
    folderFilter,
    onlyConflicts,
    productById,
    approvedProductCounts,
  ]);

  const stats = useMemo(() => {
    let approved = 0;
    let pending = 0;
    let rejected = 0;
    let skipped = 0;
    let unmatched = 0;
    let reserved = 0;
    for (const r of results) {
      const st = decisions[r.imageId]?.status;
      if (st === 'approved') approved++;
      else if (st === 'pending_review') pending++;
      else if (st === 'rejected') rejected++;
      else if (st === 'skipped') skipped++;
      else if (st === 'unmatched') unmatched++;
      else if (st === 'reserved_branding') reserved++;
    }
    return { approved, pending, rejected, skipped, unmatched, reserved };
  }, [results, decisions]);

  const pickerProducts = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (pickerCategoryFilter !== 'ALL' && p.categoryId !== pickerCategoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        p.id.toLowerCase().includes(q) ||
        p.name.hy.toLowerCase().includes(q) ||
        p.name.ru.toLowerCase().includes(q) ||
        p.name.en.toLowerCase().includes(q)
      );
    });
  }, [products, pickerSearch, pickerCategoryFilter]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 p-8 text-stone-600">
        <RefreshCw className="mr-2.5 h-5 w-5 animate-spin text-amber-900" />
        <span className="text-sm font-semibold">
          Loading Xutorok local image review workspace...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">
          <h1 className="text-lg font-bold">Failed to Load Image Review Tool</h1>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      {/* Top Header */}
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/menu"
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Public Menu</span>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-stone-900 sm:text-lg">
                  Xutorok Menu Photo Match Review (Local Dev Tool)
                </h1>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-amber-900">
                  tenant: xutorok
                </span>
              </div>
              <p className="text-xs text-stone-500">
                136 total photos (128 food + 8 reserved Restaurant) • 297 Firestore
                catalog products • Local persistence active
                {saving
                  ? ' • Saving...'
                  : lastSavedAt
                    ? ` • Saved ${new Date(lastSavedAt).toLocaleTimeString()}`
                    : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleBulkApproveUnambiguous}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              title="Bulk-approve only unambiguous EXACT and HIGH confidence matches"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Bulk Approve Unambiguous (113)</span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export JSON</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {/* Metrics Bar */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <button
            type="button"
            onClick={() => {
              setStatusFilter(statusFilter === 'approved' ? 'ALL' : 'approved');
              setOnlyConflicts(false);
            }}
            className={`rounded-2xl border p-3.5 text-left transition ${
              statusFilter === 'approved'
                ? 'border-emerald-600 bg-emerald-50/70'
                : 'border-stone-200 bg-white hover:border-stone-300'
            }`}
          >
            <div className="text-xs font-semibold text-stone-500">Approved</div>
            <div className="mt-1 text-2xl font-bold text-emerald-700">
              {stats.approved}
            </div>
            <div className="text-[11px] text-stone-500">Ready for WebP import</div>
          </button>

          <button
            type="button"
            onClick={() => {
              setOnlyConflicts(!onlyConflicts);
              setConfidenceFilter('ALL');
              setStatusFilter('ALL');
            }}
            className={`rounded-2xl border p-3.5 text-left transition ${
              onlyConflicts
                ? 'border-amber-600 bg-amber-50/70'
                : 'border-stone-200 bg-white hover:border-stone-300'
            }`}
          >
            <div className="text-xs font-semibold text-stone-500">
              Conflicts / Review
            </div>
            <div className="mt-1 text-2xl font-bold text-amber-700">
              {stats.pending}
            </div>
            <div className="text-[11px] text-stone-500">
              Click to review conflicts
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setConfidenceFilter(
                confidenceFilter === 'UNMATCHED' ? 'ALL' : 'UNMATCHED'
              );
              setOnlyConflicts(false);
            }}
            className={`rounded-2xl border p-3.5 text-left transition ${
              confidenceFilter === 'UNMATCHED'
                ? 'border-rose-600 bg-rose-50/70'
                : 'border-stone-200 bg-white hover:border-stone-300'
            }`}
          >
            <div className="text-xs font-semibold text-stone-500">Unmatched</div>
            <div className="mt-1 text-2xl font-bold text-rose-700">
              {stats.unmatched}
            </div>
            <div className="text-[11px] text-stone-500">
              8 Pizza + 1 Spinach Vareniki
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter(statusFilter === 'rejected' ? 'ALL' : 'rejected');
              setOnlyConflicts(false);
            }}
            className={`rounded-2xl border p-3.5 text-left transition ${
              statusFilter === 'rejected'
                ? 'border-red-600 bg-red-50/70'
                : 'border-stone-200 bg-white hover:border-stone-300'
            }`}
          >
            <div className="text-xs font-semibold text-stone-500">Rejected</div>
            <div className="mt-1 text-2xl font-bold text-stone-800">
              {stats.rejected}
            </div>
            <div className="text-[11px] text-stone-500">Excluded by reviewer</div>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter(statusFilter === 'skipped' ? 'ALL' : 'skipped');
              setOnlyConflicts(false);
            }}
            className={`rounded-2xl border p-3.5 text-left transition ${
              statusFilter === 'skipped'
                ? 'border-stone-600 bg-stone-200/60'
                : 'border-stone-200 bg-white hover:border-stone-300'
            }`}
          >
            <div className="text-xs font-semibold text-stone-500">Skipped</div>
            <div className="mt-1 text-2xl font-bold text-stone-700">
              {stats.skipped}
            </div>
            <div className="text-[11px] text-stone-500">Deferred items</div>
          </button>

          <button
            type="button"
            onClick={() => {
              setConfidenceFilter(
                confidenceFilter === 'RESERVED' ? 'ALL' : 'RESERVED'
              );
              setOnlyConflicts(false);
            }}
            className={`rounded-2xl border p-3.5 text-left transition ${
              confidenceFilter === 'RESERVED'
                ? 'border-indigo-600 bg-indigo-50/70'
                : 'border-stone-200 bg-white hover:border-stone-300'
            }`}
          >
            <div className="text-xs font-semibold text-stone-500">
              Reserved Branding
            </div>
            <div className="mt-1 text-2xl font-bold text-indigo-700">
              {stats.reserved}
            </div>
            <div className="text-[11px] text-stone-500">Restaurant folder (8)</div>
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Armenian/Russian/English name, filename, or product ID..."
                className="w-full rounded-xl border border-stone-300 bg-stone-50 py-2 pr-3.5 pl-9 text-xs text-stone-900 focus:border-amber-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <select
                value={folderFilter}
                onChange={(e) => setFolderFilter(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-800"
              >
                <option value="ALL">All Source Folders (9)</option>
                {folders.map((f) => (
                  <option key={f} value={f}>
                    Folder: {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={confidenceFilter}
                onChange={(e) => setConfidenceFilter(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-800"
              >
                <option value="ALL">All Confidence Levels</option>
                <option value="EXACT">EXACT (104)</option>
                <option value="HIGH">HIGH (9)</option>
                <option value="REVIEW">REVIEW / Ambiguous (6)</option>
                <option value="UNMATCHED">UNMATCHED (9)</option>
                <option value="RESERVED">RESERVED Restaurant (8)</option>
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-800"
              >
                <option value="ALL">All Decision Statuses</option>
                <option value="approved">Approved</option>
                <option value="pending_review">Pending Review</option>
                <option value="rejected">Rejected</option>
                <option value="skipped">Skipped</option>
                <option value="unmatched">Unmatched</option>
                <option value="reserved_branding">Reserved Branding</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3 text-xs text-stone-600">
            <div className="flex flex-wrap items-center gap-3">
              <span>
                Showing <strong>{filteredResults.length}</strong> of{' '}
                <strong>{results.length}</strong> source images
              </span>
              <label className="inline-flex cursor-pointer items-center gap-1.5 font-medium text-amber-900">
                <input
                  type="checkbox"
                  checked={onlyConflicts}
                  onChange={(e) => setOnlyConflicts(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-stone-300 text-amber-900"
                />
                <span>Only show conflicts & review items</span>
              </label>
            </div>

            {(searchQuery ||
              confidenceFilter !== 'ALL' ||
              statusFilter !== 'ALL' ||
              folderFilter !== 'ALL' ||
              onlyConflicts) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setConfidenceFilter('ALL');
                  setStatusFilter('ALL');
                  setFolderFilter('ALL');
                  setOnlyConflicts(false);
                }}
                className="text-xs font-semibold text-amber-900 hover:underline"
              >
                Reset all filters
              </button>
            )}
          </div>
        </div>

        {/* Image Review Cards List */}
        <div className="space-y-4">
          {filteredResults.map((item) => {
            const decision = decisions[item.imageId];
            const status = decision?.status ?? 'pending_review';
            const selectedPid =
              decision?.selectedProductId !== undefined
                ? decision.selectedProductId
                : item.suggestedProductId;
            const selectedProduct = selectedPid
              ? productById.get(selectedPid)
              : undefined;
            const selectedCategory = selectedProduct
              ? categoryById.get(selectedProduct.categoryId)
              : undefined;
            const optRecord = optimizedMap.get(item.imageId);

            const duplicateApprovalIds =
              status === 'approved' && selectedPid
                ? (approvedProductCounts.get(selectedPid) ?? []).filter(
                    (id) => id !== item.imageId
                  )
                : [];

            const confidenceBadgeClass =
              item.confidence === 'EXACT'
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : item.confidence === 'HIGH'
                  ? 'bg-teal-100 text-teal-900 border-teal-300'
                  : item.confidence === 'REVIEW'
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : item.confidence === 'UNMATCHED'
                      ? 'bg-rose-100 text-rose-900 border-rose-300'
                      : 'bg-indigo-100 text-indigo-900 border-indigo-300';

            const statusBadgeClass =
              status === 'approved'
                ? 'bg-emerald-600 text-white'
                : status === 'pending_review'
                  ? 'bg-amber-500 text-white'
                  : status === 'rejected'
                    ? 'bg-red-600 text-white'
                    : status === 'skipped'
                      ? 'bg-stone-600 text-white'
                      : 'bg-stone-200 text-stone-700';

            return (
              <div
                key={item.imageId}
                className={`rounded-2xl border bg-white p-4 shadow-xs transition ${
                  duplicateApprovalIds.length > 0 || item.conflictType !== 'none'
                    ? 'border-amber-300'
                    : status === 'approved'
                      ? 'border-emerald-200'
                      : 'border-stone-200'
                }`}
              >
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                  {/* Column 1: Photo Thumbnail & Image Information (4 cols) */}
                  <div className="flex flex-col gap-3 sm:flex-row lg:col-span-4">
                    <div className="group relative h-36 w-44 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                      <img
                        src={`/__xutorok_image_review/photo?imageId=${encodeURIComponent(
                          item.imageId
                        )}`}
                        alt={item.originalFilename}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setPreviewModalItem(item)}
                        className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-lg bg-stone-900/80 px-2 py-1 text-[11px] font-semibold text-white opacity-90 hover:bg-stone-900"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Inspect</span>
                      </button>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-stone-600">
                          {item.imageId}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${confidenceBadgeClass}`}
                        >
                          {item.confidence}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadgeClass}`}
                        >
                          {status.replace('_', ' ')}
                        </span>
                      </div>

                      <p
                        className="truncate text-sm font-bold text-stone-900"
                        title={item.originalFilename}
                      >
                        {item.originalFilename}
                      </p>

                      <div className="flex items-center gap-1 text-stone-600">
                        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                        <span className="truncate font-medium">
                          {item.sourceCategory}
                        </span>
                      </div>

                      <p className="text-stone-500">
                        Dimensions:{' '}
                        <strong className="text-stone-700">
                          {item.width} × {item.height}
                        </strong>
                      </p>
                      <p className="text-stone-500">
                        Source JPG:{' '}
                        <strong className="text-stone-700">
                          {item.fileSizeFormatted}
                        </strong>
                      </p>
                      {optRecord && (
                        <p className="text-emerald-700 font-medium">
                          WebP: {(optRecord.optimizedBytes / 1024).toFixed(0)} KB (-
                          {optRecord.reductionPercent}%)
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Column 2: Matched Product Information (5 cols) */}
                  <div className="flex flex-col justify-between rounded-xl border border-stone-100 bg-stone-50/70 p-3.5 lg:col-span-5">
                    {selectedProduct ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded bg-amber-100/80 px-2 py-0.5 font-mono text-xs font-bold text-amber-950">
                            {selectedProduct.id}
                          </span>
                          <span className="text-xs font-semibold text-stone-500">
                            Category: {selectedCategory?.name.hy ?? selectedProduct.categoryId}
                          </span>
                        </div>

                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-stone-900">
                            HY: {selectedProduct.name.hy}
                          </p>
                          <p className="text-xs text-stone-600">
                            RU: {selectedProduct.name.ru}
                          </p>
                          <p className="text-xs text-stone-600">
                            EN: {selectedProduct.name.en}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200/70 pt-2 text-xs">
                          <span className="font-bold text-amber-900">
                            Price: {formatAMD(selectedProduct.price)}
                            {selectedProduct.secondPrice
                              ? ` / ${formatAMD(selectedProduct.secondPrice)}`
                              : ''}
                          </span>
                          <span className="text-stone-500">
                            Current Image:{' '}
                            {selectedProduct.imageUrl ? (
                              <a
                                href={selectedProduct.imageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-amber-900 underline"
                              >
                                View current
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-stone-400">
                                <ImageIcon className="h-3 w-3" /> None
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center py-4 text-center text-xs text-stone-500">
                        <p className="font-semibold text-stone-700">
                          No Product Assigned
                        </p>
                        <p className="mt-1 max-w-xs">{item.reason}</p>
                      </div>
                    )}

                    {/* Match Reason & Conflict Warnings */}
                    <div className="mt-3 space-y-1.5 border-t border-stone-200/70 pt-2.5 text-xs">
                      <p className="text-stone-600">
                        <span className="font-semibold text-stone-700">
                          Match Info:
                        </span>{' '}
                        {item.reason}
                      </p>

                      {item.conflictWarning && (
                        <div className="flex items-start gap-1.5 rounded-lg border border-amber-300 bg-amber-50 p-2 text-amber-900">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
                          <span>{item.conflictWarning}</span>
                        </div>
                      )}

                      {duplicateApprovalIds.length > 0 && (
                        <div className="flex items-start gap-1.5 rounded-lg border border-red-300 bg-red-50 p-2 text-red-900 font-medium">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-700" />
                          <span>
                            Duplicate approval warning: Product {selectedPid} is also
                            approved on {duplicateApprovalIds.join(', ')}!
                          </span>
                        </div>
                      )}

                      {item.blockedCrossCategoryMatches.length > 0 && (
                        <div className="rounded-lg border border-stone-200 bg-white p-2 text-[11px] text-stone-600">
                          <strong>Category Guard:</strong>{' '}
                          {item.blockedCrossCategoryMatches[0].reason}
                        </div>
                      )}

                      {/* Quick candidate switcher when multiple candidates exist */}
                      {item.candidates.length > 1 && (
                        <div className="pt-1">
                          <span className="block text-[11px] font-semibold text-stone-500 uppercase">
                            Suggested Candidates ({item.candidates.length}):
                          </span>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {item.candidates.map((cand) => (
                              <button
                                key={cand.productId}
                                type="button"
                                onClick={() =>
                                  updateSingleDecision(item.imageId, {
                                    selectedProductId: cand.productId,
                                  })
                                }
                                className={`rounded-lg border px-2 py-1 text-[11px] font-medium transition ${
                                  selectedPid === cand.productId
                                    ? 'border-amber-900 bg-amber-900 text-white'
                                    : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100'
                                }`}
                              >
                                {cand.name.hy} ({cand.productId})
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Column 3: Review Actions (3 cols) */}
                  <div className="flex flex-col justify-between gap-2 lg:col-span-3">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                      <button
                        type="button"
                        disabled={!selectedPid}
                        onClick={() =>
                          updateSingleDecision(item.imageId, {
                            status: 'approved',
                            selectedProductId: selectedPid,
                          })
                        }
                        className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-40 ${
                          status === 'approved'
                            ? 'bg-emerald-700 text-white'
                            : 'border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Approve</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateSingleDecision(item.imageId, {
                            status: 'rejected',
                          })
                        }
                        className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                          status === 'rejected'
                            ? 'bg-red-700 text-white'
                            : 'border border-red-200 bg-red-50 text-red-800 hover:bg-red-100'
                        }`}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateSingleDecision(item.imageId, {
                            status: 'skipped',
                          })
                        }
                        className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                          status === 'skipped'
                            ? 'bg-stone-700 text-white'
                            : 'border border-stone-300 bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        <SkipForward className="h-3.5 w-3.5" />
                        <span>Skip</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPickerImageId(item.imageId);
                          setPickerCategoryFilter(item.mappedCategoryId ?? 'ALL');
                          setPickerSearch('');
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50"
                      >
                        <Search className="h-3.5 w-3.5" />
                        <span>Select Product</span>
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-stone-500">
                        Reviewer Note
                      </label>
                      <input
                        type="text"
                        value={decision?.notes ?? ''}
                        onChange={(e) =>
                          updateSingleDecision(item.imageId, {
                            notes: e.target.value,
                          })
                        }
                        placeholder="Add review note..."
                        className="w-full rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs text-stone-800 focus:border-amber-900 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Product Selector Modal */}
      {pickerImageId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  Select Existing Xutorok Product for {pickerImageId}
                </h2>
                <p className="text-xs text-stone-500">
                  Search across all 297 products in restaurants/xutorok/products
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerImageId(null)}
                className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 border-b border-stone-100 bg-stone-50 p-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  autoFocus
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Search by HY / RU / EN product name or ID..."
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs"
                />
              </div>
              <div>
                <select
                  value={pickerCategoryFilter}
                  onChange={(e) => setPickerCategoryFilter(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs"
                >
                  <option value="ALL">All 29 Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name.hy} ({c.name.en})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 divide-y divide-stone-100 overflow-y-auto p-2">
              {pickerProducts.map((prod) => {
                const cat = categoryById.get(prod.categoryId);
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => {
                      updateSingleDecision(pickerImageId, {
                        selectedProductId: prod.id,
                        status: 'approved',
                        notes: `Manually assigned to ${prod.id} (${prod.name.hy})`,
                      });
                      setPickerImageId(null);
                    }}
                    className="flex w-full items-center justify-between gap-4 rounded-xl px-3.5 py-2.5 text-left hover:bg-amber-50/70"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-900">
                          {prod.id}
                        </span>
                        <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] text-stone-600">
                          {cat?.name.hy ?? prod.categoryId}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm font-bold text-stone-900">
                        {prod.name.hy}
                      </p>
                      <p className="text-xs text-stone-500">
                        {prod.name.ru} • {prod.name.en}
                      </p>
                    </div>
                    <div className="text-right text-xs font-bold text-stone-800">
                      {formatAMD(prod.price)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Photo Zoom Modal */}
      {previewModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-4"
          onClick={() => setPreviewModalItem(null)}
        >
          <div
            className="max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  {previewModalItem.originalFilename} ({previewModalItem.imageId})
                </h3>
                <p className="text-xs text-stone-500">
                  {previewModalItem.relativePath} • {previewModalItem.width}×
                  {previewModalItem.height} • {previewModalItem.fileSizeFormatted}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalItem(null)}
                className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-stone-900 p-2">
              <img
                src={`/__xutorok_image_review/photo?imageId=${encodeURIComponent(
                  previewModalItem.imageId
                )}`}
                alt={previewModalItem.originalFilename}
                className="max-h-[75vh] w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
