import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Utensils,
  FolderKanban,
  Plus,
  CheckCircle2,
  EyeOff,
  Settings,
} from 'lucide-react';
import { AdminLayout } from '../../features/admin/layouts/AdminLayout';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { subscribeToAdminCategories } from '../../features/categories/services/categoryService';
import { subscribeToAdminProducts } from '../../features/products/services/productService';
import type { MenuCategory, MenuProduct } from '../../types';

export function AdminDashboardPage() {
  const { restaurantId, role, user } = useAuth();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubCats = subscribeToAdminCategories(
      (cats) => {
        setCategories(cats);
        setLoading(false);
      },
      () => setLoading(false),
      restaurantId
    );
    const unsubProds = subscribeToAdminProducts(
      (prods) => {
        setProducts(prods);
        setLoading(false);
      },
      () => setLoading(false),
      restaurantId
    );

    return () => {
      unsubCats();
      unsubProds();
    };
  }, [restaurantId]);

  const availableCount = products.filter((p) => p.isAvailable).length;
  const hiddenCount = products.filter((p) => !p.isVisible).length;

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">
              Restaurant Overview
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              Managing tenant{' '}
              <code className="rounded bg-stone-200/80 px-1.5 py-0.5 font-mono text-xs font-semibold text-stone-800">
                restaurants/{restaurantId}
              </code>{' '}
              as <span className="font-semibold text-stone-700">{role}</span> ({user?.email})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/admin/products/new"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-950"
            >
              <Plus className="h-4 w-4" />
              <span>Add Product</span>
            </Link>
            <Link
              to="/admin/categories"
              className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              <FolderKanban className="h-4 w-4" />
              <span>Manage Categories</span>
            </Link>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-xs font-semibold tracking-wider uppercase">
                Categories
              </span>
              <FolderKanban className="h-5 w-5 text-amber-900" />
            </div>
            <p className="mt-3 text-3xl font-bold text-stone-900">
              {loading ? '—' : categories.length}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {categories.filter((c) => c.isVisible).length} visible on public menu
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-xs font-semibold tracking-wider uppercase">
                Total Products
              </span>
              <Utensils className="h-5 w-5 text-amber-900" />
            </div>
            <p className="mt-3 text-3xl font-bold text-stone-900">
              {loading ? '—' : products.length}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Live in <code className="font-mono">restaurants/{restaurantId}/products</code>
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-xs font-semibold tracking-wider uppercase">
                Available Now
              </span>
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-stone-900">
              {loading ? '—' : availableCount}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {products.length - availableCount} marked unavailable
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex items-center justify-between text-stone-400">
              <span className="text-xs font-semibold tracking-wider uppercase">
                Hidden / Archived
              </span>
              <EyeOff className="h-5 w-5 text-stone-500" />
            </div>
            <p className="mt-3 text-3xl font-bold text-stone-900">
              {loading ? '—' : hiddenCount}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Hidden from public visitors
            </p>
          </div>
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Link
            to="/admin/products"
            className="group rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-amber-900/40 hover:shadow-xs"
          >
            <Utensils className="h-6 w-6 text-amber-900" />
            <h3 className="mt-3 text-base font-bold text-stone-900 group-hover:text-amber-900">
              Products Catalog
            </h3>
            <p className="mt-1 text-xs text-stone-500 leading-relaxed">
              Manage dishes, 3-language names, AMD prices, portion variants, availability, and photos.
            </p>
          </Link>

          <Link
            to="/admin/categories"
            className="group rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-amber-900/40 hover:shadow-xs"
          >
            <FolderKanban className="h-6 w-6 text-amber-900" />
            <h3 className="mt-3 text-base font-bold text-stone-900 group-hover:text-amber-900">
              Menu Categories
            </h3>
            <p className="mt-1 text-xs text-stone-500 leading-relaxed">
              Create, reorder, translate (HY / RU / EN), reassign products, and control visibility of menu sections.
            </p>
          </Link>

          <Link
            to="/admin/settings"
            className="group rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-amber-900/40 hover:shadow-xs"
          >
            <Settings className="h-6 w-6 text-amber-900" />
            <h3 className="mt-3 text-base font-bold text-stone-900 group-hover:text-amber-900">
              Restaurant Settings
            </h3>
            <p className="mt-1 text-xs text-stone-500 leading-relaxed">
              Configure restaurant name, logo, contact information, and supported languages.
            </p>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
