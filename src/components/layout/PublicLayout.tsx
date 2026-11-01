import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Phone,
  Clock,
  Lock,
  UtensilsCrossed,
  RefreshCw,
} from 'lucide-react';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { getLocalizedText } from '../../lib/utils/format';
import type {
  Language,
  RestaurantProfile,
  SettingsLoadStatus,
} from '../../types';

interface PublicLayoutProps {
  profile: RestaurantProfile | null;
  settingsStatus?: SettingsLoadStatus;
  onRetrySettings?: () => void;
  children: ReactNode;
}

export function PublicLayout({
  profile,
  settingsStatus = profile ? 'ready' : 'loading',
  onRetrySettings,
  children,
}: PublicLayoutProps) {
  const { i18n, t } = useTranslation();
  const lang = (i18n.language?.slice(0, 2) as Language) || 'hy';

  const isLoading = settingsStatus === 'loading';
  const isError = settingsStatus === 'error';

  const restaurantName =
    settingsStatus === 'ready' && profile
      ? getLocalizedText(profile.name, lang)
      : '';
  const address =
    settingsStatus === 'ready' && profile
      ? getLocalizedText(profile.contact?.address, lang)
      : '';
  const workingHours =
    settingsStatus === 'ready' && profile
      ? getLocalizedText(profile.contact?.workingHours, lang)
      : '';
  const rawLogoUrl =
    settingsStatus === 'ready' && profile
      ? profile.branding?.logoUrl?.trim() || ''
      : '';

  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const hasValidLogo = Boolean(rawLogoUrl && failedLogoUrl !== rawLogoUrl);

  useEffect(() => {
    if ( typeof document === 'undefined') return;
    if (settingsStatus === 'ready') {
      document.title = restaurantName
        ? `${restaurantName} — ${t('menu.title')}`
        : t('menu.title');
    }
  }, [restaurantName, settingsStatus, t]);

  return (
    <div className="flex min-h-dvh flex-col bg-[#faf9f6] text-stone-900">
      {/* Top Header — fixed 69px height to prevent layout shifts */}
      <header className="sticky top-0 z-30 h-[69px] border-b border-stone-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-4">
          {isLoading ? (
            <div
              data-testid="header-branding-skeleton"
              aria-busy="true"
              aria-label="Loading restaurant branding"
              className="flex items-center gap-3"
            >
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-stone-200/80" />
              <div className="hidden sm:flex sm:flex-col sm:gap-1.5">
                <div className="h-4 w-28 animate-pulse rounded bg-stone-200/80" />
                <div className="h-3 w-20 animate-pulse rounded bg-stone-200/60" />
              </div>
            </div>
          ) : isError ? (
            <div
              data-testid="header-branding-error"
              className="flex items-center gap-2.5 text-xs text-stone-600"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-500">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              {onRetrySettings && (
                <button
                  type="button"
                  data-testid="header-settings-retry"
                  onClick={onRetrySettings}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>{t('menu.retry')}</span>
                </button>
              )}
            </div>
          ) : (
            <Link
              to="/menu"
              className="flex items-center gap-3 focus:outline-none"
              aria-label={restaurantName || t('menu.title')}
            >
              {hasValidLogo ? (
                <img
                  src={rawLogoUrl}
                  alt={restaurantName || t('menu.title')}
                  className="h-10 w-auto max-w-[140px] object-contain transition-opacity duration-200"
                  onError={() => setFailedLogoUrl(rawLogoUrl)}
                />
              ) : (
                <div
                  data-testid="header-logo-fallback"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-600"
                >
                  <UtensilsCrossed className="h-5 w-5" />
                </div>
              )}
              <div className="hidden sm:block">
                {restaurantName && (
                  <span className="block text-base font-bold text-stone-900 leading-tight">
                    {restaurantName}
                  </span>
                )}
                <span className="block text-xs text-stone-500">
                  {t('menu.title')}
                </span>
              </div>
            </Link>
          )}

          <LanguageSwitcher allowedLanguages={profile?.supportedLanguages} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="mt-12 border-t border-stone-200 bg-white py-8 text-stone-600">
        <div className="mx-auto max-w-6xl px-4">
          {isLoading ? (
            <div
              data-testid="footer-branding-skeleton"
              className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center"
            >
              <div className="space-y-2">
                <div className="h-5 w-32 animate-pulse rounded bg-stone-200/80" />
                <div className="h-3.5 w-48 animate-pulse rounded bg-stone-200/60" />
              </div>
              <div className="flex gap-4">
                <div className="h-4 w-28 animate-pulse rounded bg-stone-200/60" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                {restaurantName && (
                  <p className="text-base font-bold text-stone-900">
                    {restaurantName}
                  </p>
                )}
                <p className="mt-1 text-xs text-stone-500">{t('menu.subtitle')}</p>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-stone-600">
                {profile?.contact?.phone && (
                  <a
                    href={`tel:${profile.contact.phone}`}
                    className="inline-flex items-center gap-1.5 hover:text-amber-900"
                  >
                    <Phone className="h-3.5 w-3.5 text-amber-900" />
                    <span>{profile.contact.phone}</span>
                  </a>
                )}
                {address && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-amber-900" />
                    <span>{address}</span>
                  </span>
                )}
                {workingHours && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-900" />
                    <span>{workingHours}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-stone-100 pt-4 text-xs text-stone-400">
            <span>
              © {new Date().getFullYear()}{' '}
              {restaurantName ? `${restaurantName}. ` : ''}
              {t('footer.rights')}.
            </span>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1 text-stone-400 hover:text-stone-700 transition-colors"
            >
              <Lock className="h-3 w-3" />
              <span>{t('footer.adminLink')}</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
