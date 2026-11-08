import { useState } from 'react';
import { Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import {
  Lock,
  ArrowLeft,
  AlertCircle,
  Loader2,
  UtensilsCrossed,
} from 'lucide-react';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useRestaurantSettings } from '../../features/settings/hooks/useRestaurantSettings';
import { getLocalizedText } from '../../lib/utils/format';
import type { Language } from '../../types';

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function AdminLoginPage() {
  const { user, isAuthorizedAdmin, loading, restaurantId, login } = useAuth();
  const { profile, status: settingsStatus } = useRestaurantSettings(restaurantId);
  const { i18n } = useTranslation();
  const lang = (i18n.language?.slice(0, 2) as Language) || 'hy';

  const [authError, setAuthError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const restaurantName =
    settingsStatus === 'ready' && profile
      ? getLocalizedText(profile.name, lang)
      : '';
  const logoUrl =
    settingsStatus === 'ready' && profile
      ? profile.branding?.logoUrl?.trim() || ''
      : '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  if (!loading && user && isAuthorizedAdmin) {
    const redirectTo =
      (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ||
      '/admin';
    return <Navigate to={redirectTo} replace />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    setAuthError(null);
    try {
      const access = await login(values.email, values.password);
      if (access.isAuthorized) {
        navigate('/admin', { replace: true });
      } else {
        setAuthError(
          access.denialReason ||
            `Your account does not have administrator permissions for restaurant "${restaurantId}".`
        );
      }
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        setAuthError('Invalid email or password.');
      } else if (code === 'auth/too-many-requests') {
        setAuthError('Too many failed sign-in attempts. Please wait and try again.');
      } else {
        setAuthError(err instanceof Error ? err.message : 'Sign-in failed.');
      }
    }
  };

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-[#faf9f6] px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/menu"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Public Menu</span>
          </Link>
          <span className="rounded-full bg-stone-200/80 px-2.5 py-0.5 font-mono text-xs text-stone-700">
            tenant: {restaurantId}
          </span>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center text-center">
            {settingsStatus === 'loading' ? (
              <div className="h-12 w-12 animate-pulse rounded-2xl bg-stone-200/80" />
            ) : logoUrl ? (
              <img
                src={logoUrl}
                alt={restaurantName || 'Restaurant Admin'}
                className="h-12 w-auto max-w-[160px] object-contain"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-600">
                <UtensilsCrossed className="h-6 w-6" />
              </div>
            )}
            <h1 className="mt-4 text-xl font-bold text-stone-900">
              {restaurantName
                ? `${restaurantName} — Admin Sign In`
                : 'Restaurant Admin Sign In'}
            </h1>
            <p className="mt-1 text-xs text-stone-500">
              Authorized restaurant administrators only
            </p>
          </div>

          {authError && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-900"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <span className="leading-relaxed">{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-semibold text-stone-700 uppercase tracking-wider"
              >
                Email Address
              </label>
              <input
                id="admin-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                {...register('email')}
                className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-900/15"
                placeholder="admin@xutorok.am"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold text-stone-700 uppercase tracking-wider"
              >
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-900/15"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-950 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Sign In to Admin Panel</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
