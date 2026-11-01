import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  FolderKanban,
  ArrowRightLeft,
  Loader2,
} from 'lucide-react';
import { AdminLayout } from '../../features/admin/layouts/AdminLayout';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ImageUploader } from '../../components/common/ImageUploader';
import { useAuth } from '../../features/auth/hooks/useAuth';
import {
  categoryFormSchema,
  type CategoryFormValues,
} from '../../features/categories/schemas/categorySchema';
import {
  createCategory,
  deleteCategorySafely,
  reassignCategoryProducts,
  subscribeToAdminCategories,
  toggleCategoryVisibility,
  updateCategory,
} from '../../features/categories/services/categoryService';
import { subscribeToAdminProducts } from '../../features/products/services/productService';
import { slugify } from '../../lib/utils/format';
import { useToast } from '../../app/providers/ToastProvider';
import type { MenuCategory, MenuProduct } from '../../types';

export function AdminCategoriesPage() {
  const { restaurantId } = useAuth();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<MenuCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [reassignSource, setReassignSource] = useState<MenuCategory | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<string>('');
  const [reassigning, setReassigning] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(categoryFormSchema) as any,
    defaultValues: {
      name: { hy: '', ru: '', en: '' },
      description: { hy: '', ru: '', en: '' },
      slug: '',
      sortOrder: 10,
      isVisible: true,
      imageUrl: '',
      imagePath: '',
    },
  });

  const watchedNameEn = useWatch({ control, name: 'name.en' });
  const watchedImageUrl = useWatch({ control, name: 'imageUrl' });
  const watchedImagePath = useWatch({ control, name: 'imagePath' });

  useEffect(() => {
    const unsubCats = subscribeToAdminCategories(
      (cats) => {
        setCategories(cats);
        setLoading(false);
      },
      (err) => {
        showToast({
          variant: 'error',
          title: 'Could not load categories',
          description: err.message,
        });
        setLoading(false);
      },
      restaurantId
    );
    const unsubProds = subscribeToAdminProducts(
      (prods) => setProducts(prods),
      () => {},
      restaurantId
    );
    return () => {
      unsubCats();
      unsubProds();
    };
  }, [restaurantId, showToast]);

  const productCountsByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      counts[p.categoryId] = (counts[p.categoryId] ?? 0) + 1;
    }
    return counts;
  }, [products]);

  const startNewCategory = () => {
    setEditingCategory(null);
    const nextOrder =
      categories.length > 0
        ? Math.max(...categories.map((c) => c.sortOrder)) + 10
        : 10;
    reset({
      name: { hy: '', ru: '', en: '' },
      description: { hy: '', ru: '', en: '' },
      slug: '',
      sortOrder: nextOrder,
      isVisible: true,
      imageUrl: '',
      imagePath: '',
    });
  };

  const startEditCategory = (cat: MenuCategory) => {
    setEditingCategory(cat);
    reset({
      name: {
        hy: cat.name.hy,
        ru: cat.name.ru,
        en: cat.name.en,
      },
      description: {
        hy: cat.description?.hy ?? '',
        ru: cat.description?.ru ?? '',
        en: cat.description?.en ?? '',
      },
      slug: cat.slug,
      sortOrder: cat.sortOrder,
      isVisible: cat.isVisible,
      imageUrl: cat.imageUrl ?? '',
      imagePath: cat.imagePath ?? '',
    });
  };

  const onSubmit = async (values: CategoryFormValues) => {
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, values, restaurantId);
        showToast({
          variant: 'success',
          title: 'Category updated',
          description: `"${values.name.en}" saved.`,
        });
      } else {
        await createCategory(values, undefined, restaurantId);
        showToast({
          variant: 'success',
          title: 'Category created',
          description: `"${values.name.en}" added.`,
        });
      }
      startNewCategory();
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Could not save category.',
      });
    }
  };

  const handleToggleVisible = async (cat: MenuCategory) => {
    try {
      await toggleCategoryVisibility(cat, !cat.isVisible, restaurantId);
      showToast({
        variant: 'success',
        title: 'Visibility updated',
        description: `"${cat.name.en}" is now ${!cat.isVisible ? 'visible' : 'archived/hidden'}.`,
      });
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Could not update category.',
      });
    }
  };

  const handleReassignProducts = async () => {
    if (!reassignSource || !reassignTargetId) return;
    setReassigning(true);
    try {
      const movedCount = await reassignCategoryProducts(
        reassignSource.id,
        reassignTargetId,
        restaurantId
      );
      showToast({
        variant: 'success',
        title: 'Products reassigned',
        description: `Moved ${movedCount} product(s) from "${reassignSource.name.en}".`,
      });
      setReassignSource(null);
      setReassignTargetId('');
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Reassign failed',
        description: err instanceof Error ? err.message : 'Could not reassign products.',
      });
    } finally {
      setReassigning(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    setDeleting(true);
    try {
      await deleteCategorySafely(categoryToDelete.id, restaurantId);
      showToast({
        variant: 'success',
        title: 'Category deleted',
        description: `"${categoryToDelete.name.en}" removed.`,
      });
      if (editingCategory?.id === categoryToDelete.id) {
        startNewCategory();
      }
      setCategoryToDelete(null);
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Cannot delete category',
        description: err instanceof Error ? err.message : 'Delete failed.',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Categories</h1>
            <p className="mt-1 text-sm text-stone-500">
              Create, translate (HY / RU / EN), reorder, reassign products, and control visibility of menu categories.
            </p>
          </div>
          {editingCategory && (
            <button
              type="button"
              onClick={startNewCategory}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Category</span>
            </button>
          )}
        </div>

        {/* Optional Product Reassignment Banner */}
        {reassignSource && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-stone-800">
                <p className="font-bold text-sm text-amber-950">
                  Reassign products from "{reassignSource.name.hy} / {reassignSource.name.en}"
                </p>
                <p className="mt-0.5 text-stone-600">
                  Move all {productCountsByCategory[reassignSource.id] ?? 0} product(s) to another category before archiving or deleting.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={reassignTargetId}
                  onChange={(e) => setReassignTargetId(e.target.value)}
                  aria-label="Target category for reassignment"
                  className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900"
                >
                  <option value="">Select target category...</option>
                  {categories
                    .filter((c) => c.id !== reassignSource.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name.hy} ({c.name.en})
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={!reassignTargetId || reassigning}
                  onClick={() => void handleReassignProducts()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-950 disabled:opacity-50"
                >
                  {reassigning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Move Products</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReassignSource(null);
                    setReassignTargetId('');
                  }}
                  className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Category Editor Form */}
          <div className="lg:col-span-5">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4"
              noValidate
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-stone-900">
                  {editingCategory ? `Edit: ${editingCategory.name.en}` : 'Create Category'}
                </h2>
                {editingCategory && (
                  <button
                    type="button"
                    onClick={startNewCategory}
                    className="rounded-lg p-1 text-stone-400 hover:text-stone-700"
                    title="Cancel edit"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase">
                  Armenian Name (Հայերեն) *
                </label>
                <input
                  type="text"
                  {...register('name.hy')}
                  placeholder="Օր.՝ Ապուրներ"
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm"
                />
                {errors.name?.hy && (
                  <p className="mt-1 text-xs text-red-600">{errors.name.hy.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase">
                  Russian Name (Русский) *
                </label>
                <input
                  type="text"
                  {...register('name.ru')}
                  placeholder="Напр.: Супы"
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm"
                />
                {errors.name?.ru && (
                  <p className="mt-1 text-xs text-red-600">{errors.name.ru.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase">
                  English Name (English) *
                </label>
                <input
                  type="text"
                  {...register('name.en')}
                  onBlur={() => {
                    if (!editingCategory && watchedNameEn) {
                      setValue('slug', slugify(watchedNameEn), { shouldValidate: true });
                    }
                  }}
                  placeholder="e.g. Soups"
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm"
                />
                {errors.name?.en && (
                  <p className="mt-1 text-xs text-red-600">{errors.name.en.message}</p>
                )}
              </div>

              {/* Optional Trilingual Descriptions */}
              <div className="space-y-2 border-t border-stone-100 pt-3">
                <span className="block text-xs font-semibold text-stone-700 uppercase">
                  Category Descriptions (Optional)
                </span>
                <input
                  type="text"
                  {...register('description.hy')}
                  placeholder="Description (HY)"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs"
                />
                <input
                  type="text"
                  {...register('description.ru')}
                  placeholder="Description (RU)"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs"
                />
                <input
                  type="text"
                  {...register('description.en')}
                  placeholder="Description (EN)"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-stone-100 pt-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase">
                    Slug *
                  </label>
                  <input
                    type="text"
                    {...register('slug')}
                    placeholder="soups"
                    className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 font-mono text-xs"
                  />
                  {errors.slug && (
                    <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    {...register('sortOrder')}
                    className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm"
                  />
                  {errors.sortOrder && (
                    <p className="mt-1 text-xs text-red-600">{errors.sortOrder.message}</p>
                  )}
                </div>
              </div>

              {/* Optional Category Image */}
              <div className="border-t border-stone-100 pt-3">
                <ImageUploader
                  folder="categories"
                  itemId={editingCategory?.id}
                  imageUrl={watchedImageUrl || undefined}
                  imagePath={watchedImagePath || undefined}
                  onChange={({ imageUrl, imagePath }) => {
                    setValue('imageUrl', imageUrl, { shouldDirty: true });
                    setValue('imagePath', imagePath, { shouldDirty: true });
                  }}
                  label="Category Image (Optional)"
                />
              </div>

              <label className="inline-flex items-center gap-2.5 text-sm font-medium text-stone-800 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  {...register('isVisible')}
                  className="h-4 w-4 rounded border-stone-300 text-amber-900 focus:ring-amber-900"
                />
                <span>Visible on public menu</span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-950 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{editingCategory ? 'Update Category' : 'Create Category'}</span>
              </button>
            </form>
          </div>

          {/* Categories List */}
          <div className="lg:col-span-7">
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
              {loading ? (
                <div className="p-12 text-center text-sm text-stone-500">
                  Loading categories...
                </div>
              ) : categories.length === 0 ? (
                <div className="p-12 text-center">
                  <FolderKanban className="mx-auto h-8 w-8 text-stone-400" />
                  <p className="mt-2 text-sm font-semibold text-stone-800">
                    No categories yet
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    Create a category using the form on the left.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 bg-stone-50 text-xs font-semibold tracking-wider text-stone-500 uppercase">
                        <th className="py-3 pl-4 pr-3">Order</th>
                        <th className="px-3 py-3">Category (HY / RU / EN)</th>
                        <th className="px-3 py-3">Items</th>
                        <th className="px-3 py-3">Visibility</th>
                        <th className="py-3 pr-4 pl-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {categories.map((cat) => {
                        const itemCount = productCountsByCategory[cat.id] ?? 0;
                        return (
                          <tr key={cat.id} className="hover:bg-stone-50/80">
                            <td className="py-3 pl-4 pr-3 font-mono text-xs text-stone-500">
                              {cat.sortOrder}
                            </td>
                            <td className="px-3 py-3">
                              <p className="font-semibold text-stone-900">{cat.name.hy}</p>
                              <p className="text-xs text-stone-500">
                                {cat.name.ru} • {cat.name.en}
                              </p>
                              <span className="font-mono text-[11px] text-stone-400">
                                slug: {cat.slug}
                              </span>
                            </td>
                            <td className="px-3 py-3 font-mono text-xs text-stone-600">
                              {itemCount}
                            </td>
                            <td className="px-3 py-3">
                              <button
                                type="button"
                                onClick={() => void handleToggleVisible(cat)}
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                                  cat.isVisible
                                    ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                }`}
                              >
                                {cat.isVisible ? (
                                  <Eye className="h-3.5 w-3.5" />
                                ) : (
                                  <EyeOff className="h-3.5 w-3.5" />
                                )}
                                <span>{cat.isVisible ? 'Visible' : 'Archived'}</span>
                              </button>
                            </td>
                            <td className="py-3 pr-4 pl-3 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => startEditCategory(cat)}
                                  title="Edit category"
                                  className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                {itemCount > 0 && categories.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReassignSource(cat);
                                      setReassignTargetId('');
                                    }}
                                    title="Reassign products to another category"
                                    className="rounded-lg p-2 text-stone-500 hover:bg-amber-50 hover:text-amber-800"
                                  >
                                    <ArrowRightLeft className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setCategoryToDelete(cat)}
                                  title="Delete category"
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
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(categoryToDelete)}
        title="Delete Category?"
        description={
          categoryToDelete
            ? `Delete "${categoryToDelete.name.hy} / ${categoryToDelete.name.en}"? Categories that still contain products cannot be deleted until their products are reassigned or removed.`
            : ''
        }
        confirmLabel="Delete Category"
        isLoading={deleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setCategoryToDelete(null)}
      />
    </AdminLayout>
  );
}
