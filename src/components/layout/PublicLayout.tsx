import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
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

  // Preserve dynamic branding colors stored in Firestore Admin Settings when configured
  const dynamicThemeVars: CSSProperties = {};
  const primaryColor = profile?.branding?.primaryColor?.trim();
  const secondaryColor = profile?.branding?.secondaryColor?.trim();
  if (primaryColor) {
    (dynamicThemeVars as Record<string, string>)['--color-primary'] = primaryColor;
  }
  if (secondaryColor) {
    (dynamicThemeVars as Record<string, string>)['--color-secondary'] = secondaryColor;
  }

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (settingsStatus === 'ready') {
      document.title = restaurantName
        ? `${restaurantName} — ${t('menu.title')}`
        : t('menu.title');
    }
  }, [restaurantName, settingsStatus, t]);

  return (
    <div
      style={dynamicThemeVars}
      className="flex min-h-dvh flex-col bg-app-bg text-app-text"
    >
      {/* Top Header — fixed 69px height, displays only the official logo on the left */}
      <header className="sticky top-0 z-30 h-[69px] border-b border-app-border bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-4">
          {isLoading ? (
            <div
              data-testid="header-branding-skeleton"
              aria-busy="true"
              aria-label="Loading restaurant branding"
              className="flex items-center"
            >
              <div className="h-10 w-24 shrink-0 animate-pulse rounded-xl bg-stone-200/75" />
            </div>
          ) : isError ? (
            <div
              data-testid="header-branding-error"
              className="flex items-center gap-2.5 text-xs text-app-text-muted"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-surface-muted text-app-text-muted">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              {onRetrySettings && (
                <button
                  type="button"
                  data-testid="header-settings-retry"
                  onClick={onRetrySettings}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-app-border bg-white px-2.5 py-1.5 text-xs font-semibold text-app-text hover:bg-app-surface-muted"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>{t('menu.retry')}</span>
                </button>
              )}
            </div>
          ) : (
            <Link
              to="/menu"
              data-testid="header-logo-link"
              className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 rounded-lg"
              aria-label={restaurantName || t('menu.title')}
            >
              {hasValidLogo ? (
                <img
                  src={rawLogoUrl}
                  alt={restaurantName || t('menu.title')}
                  className="h-10 w-auto max-w-[150px] object-contain transition-opacity duration-200"
                  onError={() => setFailedLogoUrl(rawLogoUrl)}
                />
              ) : (
                <div
                  data-testid="header-logo-fallback"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-surface-muted text-app-text-secondary"
                >
                  <UtensilsCrossed className="h-5 w-5" />
                </div>
              )}
            </Link>
          )}

          <LanguageSwitcher allowedLanguages={profile?.supportedLanguages} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="mt-12 border-t border-app-border bg-white py-8 text-app-text-secondary">
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
                  <p className="text-base font-bold text-app-text">
                    {restaurantName}
                  </p>
                )}
                <p className="mt-1 text-xs text-app-text-muted">{t('menu.subtitle')}</p>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-app-text-secondary">
                {profile?.contact?.phone && (
                  <a
                    href={`tel:${profile.contact.phone}`}
                    className="inline-flex items-center gap-1.5 hover:text-brand-primary"
                  >
                    <Phone className="h-3.5 w-3.5 text-brand-primary" />
                    <span>{profile.contact.phone}</span>
                  </a>
                )}
                {address && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-brand-primary" />
                    <span>{address}</span>
                  </span>
                )}
                {workingHours && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-brand-primary" />
                    <span>{workingHours}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-app-border/70 pt-4 text-xs text-app-text-muted">
            <span>
              © {new Date().getFullYear()}{' '}
              {restaurantName ? `${restaurantName}. ` : ''}
              {t('footer.rights')}.
            </span>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1 text-app-text-muted hover:text-app-text transition-colors"
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
