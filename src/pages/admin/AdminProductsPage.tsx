import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Archive,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Sparkles,
  Utensils,
} from 'lucide-react';
import { AdminLayout } from '../../features/admin/layouts/AdminLayout';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { subscribeToAdminCategories } from '../../features/categories/services/categoryService';
import {
  archiveProduct,
  deleteProduct,
  subscribeToAdminProducts,
  toggleProductFlag,
} from '../../features/products/services/productService';
import { formatAMD } from '../../lib/utils/format';
import { useToast } from '../../app/providers/ToastProvider';
import type { MenuCategory, MenuProduct } from '../../types';

export function AdminProductsPage() {
  const { restaurantId } = useAuth();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [productToDelete, setProductToDelete] = useState<MenuProduct | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsubCats = subscribeToAdminCategories(
      (cats) => setCategories(cats),
      () => {},
      restaurantId
    );
    const unsubProds = subscribeToAdminProducts(
      (prods) => {
        setProducts(prods);
        setLoading(false);
      },
      (err) => {
        showToast({
          variant: 'error',
          title: 'Failed to load products',
          description: err.message,
        });
        setLoading(false);
      },
      restaurantId
    );

    return () => {
      unsubCats();
      unsubProds();
    };
  }, [restaurantId, showToast]);

  const categoryMap = useMemo(() => {
    const map: Record<string, MenuCategory> = {};
    for (const c of categories) {
      map[c.id] = c;
    }
    return map;
  }, [categories]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryFilter !== 'all' && p.categoryId !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        p.name.hy.toLowerCase().includes(q) ||
        p.name.ru.toLowerCase().includes(q) ||
        p.name.en.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    });
  }, [products, categoryFilter, searchQuery]);

  const handleToggle = async (
    product: MenuProduct,
    field: 'isAvailable' | 'isVisible' | 'isFeatured'
  ) => {
    const nextVal = !product[field];
    try {
      await toggleProductFlag(product.id, field, nextVal, restaurantId);
      showToast({
        variant: 'success',
        title: 'Product updated',
        description: `${product.name.en}: ${field} set to ${String(nextVal)}`,
      });
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Could not update product.',
      });
    }
  };

  const handleArchiveProduct = async (product: MenuProduct) => {
    try {
      await archiveProduct(product.id, restaurantId);
      showToast({
        variant: 'success',
        title: 'Product archived',
        description: `"${product.name.en}" was hidden and marked unavailable.`,
      });
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Archive failed',
        description: err instanceof Error ? err.message : 'Could not archive product.',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setDeleting(true);
    try {
      await deleteProduct(productToDelete, restaurantId);
      showToast({
        variant: 'success',
        title: 'Product deleted',
        description: `"${productToDelete.name.en}" was removed from Firestore.`,
      });
      setProductToDelete(null);
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Could not delete product.',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Products</h1>
            <p className="mt-1 text-sm text-stone-500">
              {filteredProducts.length} of {products.length} products shown
            </p>
          </div>

          <Link
            to="/admin/products/new"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-950"
          >
            <Plus className="h-4 w-4" />
            <span>Add Product</span>
          </Link>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Armenian, Russian, or English name..."
              aria-label="Search products"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pr-4 pl-10 text-sm text-stone-900 focus:border-amber-900 focus:bg-white focus:outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
            className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm text-stone-800 focus:border-amber-900 focus:bg-white focus:outline-none"
          >
            <option value="all">All Categories ({categories.length})</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name.hy} / {cat.name.en}
              </option>
            ))}
          </select>
        </div>

        {/* Products Table */}
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {loading ? (
            <div className="p-12 text-center text-sm text-stone-500">
              Loading products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center">
              <Utensils className="mx-auto h-8 w-8 text-stone-400" />
              <p className="mt-2 text-sm font-semibold text-stone-800">
                No products found
              </p>
              <p className="mt-1 text-xs text-stone-500">
                Add a new product or adjust your search/category filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-xs font-semibold tracking-wider text-stone-500 uppercase">
                    <th className="py-3.5 pl-4 pr-3">Product (HY / RU / EN)</th>
                    <th className="px-3 py-3.5">Category</th>
                    <th className="px-3 py-3.5">Price / Variants</th>
                    <th className="px-3 py-3.5">Order</th>
                    <th className="px-3 py-3.5">Status</th>
                    <th className="py-3.5 pr-4 pl-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {filteredProducts.map((product) => {
                    const cat = categoryMap[product.categoryId];
                    return (
                      <tr key={product.id} className="hover:bg-stone-50/80">
                        <td className="py-3.5 pl-4 pr-3">
                          <div className="flex items-center gap-3">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name.en}
                                className="h-11 w-14 shrink-0 rounded-lg object-cover bg-stone-100"
                              />
                            ) : (
                              <div className="flex h-11 w-14 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-400">
                                <Utensils className="h-4 w-4" />
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-stone-900">
                                {product.name.hy}
                              </p>
                              <p className="text-xs text-stone-500">
                                {product.name.ru} • {product.name.en}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3.5 text-xs text-stone-600">
                          {cat ? (
                            <div>
                              <span className="font-medium text-stone-800">
                                {cat.name.hy}
                              </span>
                              <span className="block text-stone-400">{cat.name.en}</span>
                            </div>
                          ) : (
                            <span className="font-mono text-stone-400">
                              {product.categoryId}
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3.5">
                          <span className="font-bold text-stone-900">
                            {formatAMD(product.price)}
                          </span>
                          {product.variants && product.variants.length > 0 && (
                            <span className="block text-xs text-stone-500">
                              {product.variants.map((v) => formatAMD(v.price)).join(' / ')}
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3.5 font-mono text-xs text-stone-500">
                          {product.sortOrder}
                        </td>

                        <td className="px-3 py-3.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => void handleToggle(product, 'isAvailable')}
                              title="Toggle availability"
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                                product.isAvailable
                                  ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                              }`}
                            >
                              {product.isAvailable ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-stone-400" />
                              )}
                              <span>
                                {product.isAvailable ? 'Available' : 'Unavailable'}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => void handleToggle(product, 'isVisible')}
                              title="Toggle public visibility"
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                                product.isVisible
                                  ? 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                              }`}
                            >
                              {product.isVisible ? (
                                <Eye className="h-3.5 w-3.5" />
                              ) : (
                                <EyeOff className="h-3.5 w-3.5" />
                              )}
                              <span>{product.isVisible ? 'Visible' : 'Hidden'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => void handleToggle(product, 'isFeatured')}
                              title="Toggle featured badge"
                              className={`inline-flex items-center rounded-full p-1 text-xs transition ${
                                product.isFeatured
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'text-stone-300 hover:text-stone-500'
                              }`}
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>

                        <td className="py-3.5 pr-4 pl-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Link
                              to={`/admin/products/${product.id}/edit`}
                              title="Edit product"
                              className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                            {(product.isVisible || product.isAvailable) && (
                              <button
                                type="button"
                                onClick={() => void handleArchiveProduct(product)}
                                title="Archive product (hide & mark unavailable)"
                                className="rounded-lg p-2 text-stone-500 hover:bg-amber-50 hover:text-amber-800"
                              >
                                <Archive className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setProductToDelete(product)}
                              title="Delete product"
                              className="rounded-lg p-2 text-stone-500 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(productToDelete)}
        title="Delete Product?"
        description={
          productToDelete
            ? `Are you sure you want to permanently delete "${productToDelete.name.hy} / ${productToDelete.name.en}" from restaurants/${restaurantId}? Associated Storage files will not be deleted.`
            : ''
        }
        confirmLabel="Delete Product"
        isLoading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setProductToDelete(null)}
      />
    </AdminLayout>
  );
}
