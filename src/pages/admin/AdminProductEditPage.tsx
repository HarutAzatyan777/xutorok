import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { AdminLayout } from '../../features/admin/layouts/AdminLayout';
import { ImageUploader } from '../../components/common/ImageUploader';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { fetchAdminCategories } from '../../features/categories/services/categoryService';
import {
  productFormSchema,
  type ProductFormValues,
} from '../../features/products/schemas/productSchema';
import {
  createProduct,
  fetchProductById,
  updateProduct,
} from '../../features/products/services/productService';
import { useToast } from '../../app/providers/ToastProvider';
import type { MenuCategory } from '../../types';

export function AdminProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const { restaurantId } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(productFormSchema) as any,
    defaultValues: {
      categoryId: '',
      name: { hy: '', ru: '', en: '' },
      description: { hy: '', ru: '', en: '' },
      price: 0,
      currency: 'AMD',
      variants: [],
      imageUrl: '',
      imagePath: '',
      isAvailable: true,
      isVisible: true,
      isFeatured: false,
      sortOrder: 100,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'variants',
  });

  const watchedImageUrl = useWatch({ control, name: 'imageUrl' });
  const watchedImagePath = useWatch({ control, name: 'imagePath' });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const cats = await fetchAdminCategories(restaurantId);
        if (!active) return;
        setCategories(cats);

        if (isEditMode && id) {
          const existing = await fetchProductById(id, restaurantId);
          if (!active) return;
          if (!existing) {
            showToast({
              variant: 'error',
              title: 'Product not found',
              description: `Could not find product "${id}".`,
            });
            navigate('/admin/products', { replace: true });
            return;
          }

          reset({
            categoryId: existing.categoryId,
            name: {
              hy: existing.name.hy,
              ru: existing.name.ru,
              en: existing.name.en,
            },
            description: {
              hy: existing.description?.hy ?? '',
              ru: existing.description?.ru ?? '',
              en: existing.description?.en ?? '',
            },
            price: existing.price,
            currency: 'AMD',
            variants: (existing.variants ?? []).map((v, idx) => ({
              id: v.id || `v-${idx + 1}`,
              label: {
                hy: v.label.hy ?? '',
                ru: v.label.ru ?? '',
                en: v.label.en ?? '',
              },
              price: v.price,
              sortOrder: v.sortOrder ?? idx,
            })),
            imageUrl: existing.imageUrl ?? '',
            imagePath: existing.imagePath ?? '',
            isAvailable: existing.isAvailable,
            isVisible: existing.isVisible,
            isFeatured: existing.isFeatured,
            sortOrder: existing.sortOrder,
          });
        } else if (cats.length > 0) {
          setValue('categoryId', cats[0].id);
        }
      } catch (err) {
        showToast({
          variant: 'error',
          title: 'Error loading product form',
          description: err instanceof Error ? err.message : 'Failed to load data.',
        });
      } finally {
        if (active) setLoadingInitial(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [id, isEditMode, navigate, reset, restaurantId, setValue, showToast]);

  const onSubmit = async (values: ProductFormValues) => {
    try {
      if (isEditMode && id) {
        await updateProduct(id, values, restaurantId);
        showToast({
          variant: 'success',
          title: 'Product updated',
          description: `"${values.name.en}" saved successfully.`,
        });
      } else {
        await createProduct(values, undefined, restaurantId);
        showToast({
          variant: 'success',
          title: 'Product created',
          description: `"${values.name.en}" added to the menu.`,
        });
      }
      navigate('/admin/products');
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Could not save product.',
      });
    }
  };

  if (loadingInitial) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20 text-sm text-stone-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading product editor...
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              to="/admin/products"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Products</span>
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-stone-900">
              {isEditMode ? 'Edit Product' : 'Add New Product'}
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          {/* Category & Pricing */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-5">
            <h2 className="text-base font-bold text-stone-900">
              Category & Pricing
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-stone-700 uppercase">
                  Category *
                </label>
                <select
                  {...register('categoryId')}
                  className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-amber-900 focus:outline-none"
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name.hy} ({cat.name.en})
                    </option>
                  ))}
                </select>
                {errors.categoryId && (
                  <p className="mt-1 text-xs text-red-600">{errors.categoryId.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase">
                  Base Price (AMD) *
                </label>
                <input
                  type="number"
                  min={0}
                  step={50}
                  {...register('price')}
                  className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-amber-900 focus:outline-none"
                />
                {errors.price && (
                  <p className="mt-1 text-xs text-red-600">{errors.price.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase">
                  Sort Order
                </label>
                <input
                  type="number"
                  {...register('sortOrder')}
                  className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-amber-900 focus:outline-none"
                />
                {errors.sortOrder && (
                  <p className="mt-1 text-xs text-red-600">{errors.sortOrder.message}</p>
                )}
              </div>
            </div>

            {/* Availability & Visibility Toggles */}
            <div className="flex flex-wrap gap-6 border-t border-stone-100 pt-4">
              <label className="inline-flex items-center gap-2.5 text-sm font-medium text-stone-800 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('isAvailable')}
                  className="h-4 w-4 rounded border-stone-300 text-amber-900 focus:ring-amber-900"
                />
                <span>Available for ordering</span>
              </label>

              <label className="inline-flex items-center gap-2.5 text-sm font-medium text-stone-800 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('isVisible')}
                  className="h-4 w-4 rounded border-stone-300 text-amber-900 focus:ring-amber-900"
                />
                <span>Visible on public menu</span>
              </label>

              <label className="inline-flex items-center gap-2.5 text-sm font-medium text-stone-800 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('isFeatured')}
                  className="h-4 w-4 rounded border-stone-300 text-amber-900 focus:ring-amber-900"
                />
                <span>Featured signature dish</span>
              </label>
            </div>
          </div>

          {/* Trilingual Names & Descriptions */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-5">
            <h2 className="text-base font-bold text-stone-900">
              Localized Names & Descriptions (HY / RU / EN)
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase">
                  Armenian Name (Հայերեն) *
                </label>
                <input
                  type="text"
                  {...register('name.hy')}
                  placeholder="Օր.՝ Բորշչ թագավորական"
                  className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-amber-900 focus:outline-none"
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
                  placeholder="Напр.: Борщ королевский"
                  className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-amber-900 focus:outline-none"
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
                  placeholder="e.g. Royal borsch"
                  className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-amber-900 focus:outline-none"
                />
                {errors.name?.en && (
                  <p className="mt-1 text-xs text-red-600">{errors.name.en.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase">
                  Armenian Description
                </label>
                <textarea
                  rows={3}
                  {...register('description.hy')}
                  className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-900 focus:border-amber-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase">
                  Russian Description
                </label>
                <textarea
                  rows={3}
                  {...register('description.ru')}
                  className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-900 focus:border-amber-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase">
                  English Description
                </label>
                <textarea
                  rows={3}
                  {...register('description.en')}
                  className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-900 focus:border-amber-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Product Variants (Portions / Volumes / Multi-price) */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  Portion / Volume Variants (Optional)
                </h2>
                <p className="text-xs text-stone-500">
                  Use variants for items with multiple sizes, volumes (0.5 L / 50 ml), or half/full portions.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  append({
                    id: `var-${Date.now()}`,
                    label: { hy: '', ru: '', en: '' },
                    price: 0,
                    sortOrder: fields.length + 1,
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Variant</span>
              </button>
            </div>

            {fields.length > 0 && (
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-1 gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3.5 sm:grid-cols-5 sm:items-end"
                  >
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 uppercase">
                        Label (HY)
                      </label>
                      <input
                        type="text"
                        placeholder="0.5 լ / Մեծ"
                        {...register(`variants.${index}.label.hy`)}
                        className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 uppercase">
                        Label (RU)
                      </label>
                      <input
                        type="text"
                        placeholder="0.5 л / Большая"
                        {...register(`variants.${index}.label.ru`)}
                        className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 uppercase">
                        Label (EN)
                      </label>
                      <input
                        type="text"
                        placeholder="0.5 L / Large"
                        {...register(`variants.${index}.label.en`)}
                        className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 uppercase">
                        Price (AMD)
                      </label>
                      <input
                        type="number"
                        min={0}
                        {...register(`variants.${index}.price`)}
                        className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-semibold"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Image Upload & URL */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-4">
            <ImageUploader
              folder="products"
              itemId={id}
              imageUrl={watchedImageUrl || undefined}
              imagePath={watchedImagePath || undefined}
              onChange={({ imageUrl, imagePath }) => {
                setValue('imageUrl', imageUrl, { shouldDirty: true });
                setValue('imagePath', imagePath, { shouldDirty: true });
              }}
              label="Product Photography"
            />

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase">
                Or Direct Image URL
              </label>
              <input
                type="url"
                {...register('imageUrl')}
                placeholder="https://..."
                className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm text-stone-900 focus:border-amber-900 focus:outline-none"
              />
              {errors.imageUrl && (
                <p className="mt-1 text-xs text-red-600">{errors.imageUrl.message}</p>
              )}
            </div>
          </div>

          {/* Submit Controls */}
          <div className="flex items-center justify-end gap-3">
            <Link
              to="/admin/products"
              className="rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-950 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isEditMode ? 'Save Changes' : 'Create Product'}</span>
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

