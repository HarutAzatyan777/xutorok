import { useCallback, useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { AdminLayout } from '../../features/admin/layouts/AdminLayout';
import { ImageUploader } from '../../components/common/ImageUploader';
import { useAuth } from '../../features/auth/hooks/useAuth';
import {
  fetchRestaurantProfile,
  saveRestaurantSettings,
} from '../../features/settings/services/settingsService';
import { localizedNameSchema } from '../../features/categories/schemas/categorySchema';
import { useToast } from '../../app/providers/ToastProvider';
import type { Language } from '../../types';

const settingsFormSchema = z.object({
  name: localizedNameSchema,
  defaultLanguage: z.enum(['hy', 'ru', 'en']),
  supportHy: z.boolean(),
  supportRu: z.boolean(),
  supportEn: z.boolean(),
  logoUrl: z.string().trim().optional().or(z.literal('')),
  logoPath: z.string().trim().optional().or(z.literal('')),
  primaryColor: z.string().trim().min(4),
  secondaryColor: z.string().trim().min(4),
  phone: z.string().trim().max(60).optional().or(z.literal('')),
  address: z.object({
    hy: z.string().trim().max(250).optional().or(z.literal('')),
    ru: z.string().trim().max(250).optional().or(z.literal('')),
    en: z.string().trim().max(250).optional().or(z.literal('')),
  }),
  workingHours: z.object({
    hy: z.string().trim().max(160).optional().or(z.literal('')),
    ru: z.string().trim().max(160).optional().or(z.literal('')),
    en: z.string().trim().max(160).optional().or(z.literal('')),
  }),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export function AdminSettingsPage() {
  const { restaurantId } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      name: { hy: '', ru: '', en: '' },
      defaultLanguage: 'hy',
      supportHy: true,
      supportRu: true,
      supportEn: true,
      logoUrl: '',
      logoPath: '',
      primaryColor: '#5c3a1e',
      secondaryColor: '#8c6239',
      phone: '',
      address: { hy: '', ru: '', en: '' },
      workingHours: { hy: '', ru: '', en: '' },
    },
  });

  const watchedLogoUrl = useWatch({ control, name: 'logoUrl' });
  const watchedLogoPath = useWatch({ control, name: 'logoPath' });

  const handleRetryLoad = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    setReloadTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let active = true;

    fetchRestaurantProfile(restaurantId)
      .then((profile) => {
        if (!active) return;
        const langs = new Set(profile.supportedLanguages);
        reset({
          name: profile.name,
          defaultLanguage: profile.defaultLanguage,
          supportHy: langs.has('hy'),
          supportRu: langs.has('ru'),
          supportEn: langs.has('en'),
          logoUrl: profile.branding?.logoUrl ?? '',
          logoPath: profile.branding?.logoPath ?? '',
          primaryColor: profile.branding?.primaryColor ?? '#5c3a1e',
          secondaryColor: profile.branding?.secondaryColor ?? '#8c6239',
          phone: profile.contact?.phone ?? '',
          address: {
            hy: profile.contact?.address?.hy ?? '',
            ru: profile.contact?.address?.ru ?? '',
            en: profile.contact?.address?.en ?? '',
          },
          workingHours: {
            hy: profile.contact?.workingHours?.hy ?? '',
            ru: profile.contact?.workingHours?.ru ?? '',
            en: profile.contact?.workingHours?.en ?? '',
          },
        });
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(
          err instanceof Error
            ? err.message
            : 'Unable to load restaurant settings from Firestore.'
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadTick, reset, restaurantId]);

  const onSubmit = async (values: SettingsFormValues) => {
    const supportedLanguages: Language[] = [];
    if (values.supportHy) supportedLanguages.push('hy');
    if (values.supportRu) supportedLanguages.push('ru');
    if (values.supportEn) supportedLanguages.push('en');
    if (supportedLanguages.length === 0) {
      supportedLanguages.push('hy');
    }

    try {
      await saveRestaurantSettings(
        {
          name: values.name,
          defaultLanguage: values.defaultLanguage,
          supportedLanguages,
          branding: {
            logoUrl: values.logoUrl?.trim() || '',
            logoPath: values.logoPath?.trim() || '',
            primaryColor: values.primaryColor,
            secondaryColor: values.secondaryColor,
          },
          contact: {
            phone: values.phone || '',
            address: values.address,
            workingHours: values.workingHours,
          },
        },
        restaurantId
      );
      showToast({
        variant: 'success',
        title: 'Settings saved',
        description: `Updated settings for restaurants/${restaurantId}/settings.`,
      });
    } catch (err) {
      showToast({
        variant: 'error',
        title: 'Could not save settings',
        description: err instanceof Error ? err.message : 'Error saving settings.',
      });
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20 text-sm text-stone-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading restaurant settings...
        </div>
      </AdminLayout>
    );
  }

  if (loadError) {
    return (
      <AdminLayout>
        <div
          role="alert"
          className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center"
        >
          <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
          <h2 className="mt-3 text-lg font-bold text-stone-900">
            Could not load restaurant settings
          </h2>
          <p className="mt-1.5 text-xs text-stone-600">{loadError}</p>
          <button
            type="button"
            onClick={handleRetryLoad}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-950"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            Restaurant Settings
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Configure identity, languages, contact information, and branding for{' '}
            <code className="font-mono text-xs">{restaurantId}</code>.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          {/* Restaurant Name & Languages */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-5">
            <h2 className="text-base font-bold text-stone-900">
              Restaurant Name & Supported Languages
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase">
                  Name (Armenian) *
                </label>
                <input
                  type="text"
                  {...register('name.hy')}
                  className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm"
                />
                {errors.name?.hy && (
                  <p className="mt-1 text-xs text-red-600">{errors.name.hy.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase">
                  Name (Russian) *
                </label>
                <input
                  type="text"
                  {...register('name.ru')}
                  className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm"
                />
                {errors.name?.ru && (
                  <p className="mt-1 text-xs text-red-600">{errors.name.ru.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase">
                  Name (English) *
                </label>
                <input
                  type="text"
                  {...register('name.en')}
                  className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm"
                />
                {errors.name?.en && (
                  <p className="mt-1 text-xs text-red-600">{errors.name.en.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-stone-100 pt-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase">
                  Default Menu Language
                </label>
                <select
                  {...register('defaultLanguage')}
                  className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm"
                >
                  <option value="hy">Armenian (Հայերեն — HY)</option>
                  <option value="ru">Russian (Русский — RU)</option>
                  <option value="en">English (EN)</option>
                </select>
              </div>

              <div>
                <span className="block text-xs font-semibold text-stone-700 uppercase">
                  Enabled Public Languages
                </span>
                <div className="mt-3 flex flex-wrap gap-4">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" {...register('supportHy')} />
                    <span>HY (Հայերեն)</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" {...register('supportRu')} />
                    <span>RU (Русский)</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" {...register('supportEn')} />
                    <span>EN (English)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Branding & Logo */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-5">
            <h2 className="text-base font-bold text-stone-900">
              Logo & Visual Brand Tokens
            </h2>

            <ImageUploader
              folder="branding"
              itemId="logo"
              imageUrl={watchedLogoUrl || undefined}
              imagePath={watchedLogoPath || undefined}
              onChange={({ imageUrl, imagePath }) => {
                setValue('logoUrl', imageUrl, { shouldDirty: true });
                setValue('logoPath', imagePath, { shouldDirty: true });
              }}
              label="Restaurant Logo"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase">
                  Primary Brand Color
                </label>
                <input
                  type="text"
                  {...register('primaryColor')}
                  className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase">
                  Secondary Brand Color
                </label>
                <input
                  type="text"
                  {...register('secondaryColor')}
                  className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-5">
            <h2 className="text-base font-bold text-stone-900">
              Contact Information
            </h2>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase">
                Phone Number
              </label>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                {...register('phone')}
                placeholder="+374 ..."
                className="mt-1.5 w-full max-w-sm rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase">
                  Address (HY)
                </label>
                <input
                  type="text"
                  {...register('address.hy')}
                  className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase">
                  Address (RU)
                </label>
                <input
                  type="text"
                  {...register('address.ru')}
                  className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase">
                  Address (EN)
                </label>
                <input
                  type="text"
                  {...register('address.en')}
                  className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase">
                  Working Hours (HY)
                </label>
                <input
                  type="text"
                  {...register('workingHours.hy')}
                  placeholder="10:00 - 24:00"
                  className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase">
                  Working Hours (RU)
                </label>
                <input
                  type="text"
                  {...register('workingHours.ru')}
                  placeholder="10:00 - 24:00"
                  className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase">
                  Working Hours (EN)
                </label>
                <input
                  type="text"
                  {...register('workingHours.en')}
                  placeholder="10:00 - 24:00"
                  className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
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
              <span>Save Settings</span>
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
