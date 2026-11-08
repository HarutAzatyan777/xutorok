import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Phone,
  Clock,
  Lock,
  Menu as MenuIcon,
} from 'lucide-react';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { BurgerDrawer } from './BurgerDrawer';
import { useTheme } from '../../app/providers/themeContext';
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
  onNavigateToCategories?: () => void;
  onFocusSearch?: () => void;
}

export function PublicLayout({
  profile,
  settingsStatus = profile ? 'ready' : 'loading',
  children,
  onNavigateToCategories,
  onFocusSearch,
}: PublicLayoutProps) {
  const { i18n, t } = useTranslation();
  const lang = (i18n.language?.slice(0, 2) as Language) || 'hy';
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const isLoading = settingsStatus === 'loading';

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
  const phone = profile?.contact?.phone?.trim() || '+37495108090';
  const phone2 = profile?.contact?.phone2?.trim() || '+37411708090';
  const instagram =
    profile?.contact?.instagram?.trim() ||
    'https://www.instagram.com/xutorok.restaurant?obrf=b2thNHU2NW50MTQw';
  const facebook =
    profile?.contact?.facebook?.trim() ||
    'https://www.facebook.com/share/14tHT8aMoey/?mibextid=wwXIfr';

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
      className="flex min-h-dvh flex-col bg-app-bg text-app-text transition-colors duration-200"
    >
      {/* Top Header Bar — Clean header with Burger on left, Lang switcher on right (~56-64px) */}
      <header
        className={`sticky top-0 z-30 h-14 sm:h-16 border-b backdrop-blur-md transition-colors duration-200 ${
          isDark
            ? 'border-[#4A2C16] bg-[#302019]/95 text-[#F8F1E9]'
            : 'border-app-border bg-[#FBF7F2]/95 text-app-text'
        }`}
      >
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-4">
          {/* Left: Burger Navigation Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              aria-label={t('nav.openMenu')}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-[#C5A47A] ${
                isDark
                  ? 'border-[#4A2C16] bg-[#3D261A] text-[#F8F1E9] hover:border-[#C5A47A]/60 hover:bg-[#4A2C16]'
                  : 'border-app-border bg-white text-app-text hover:bg-app-surface-muted'
              }`}
            >
              <MenuIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Right: Language Switcher */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <LanguageSwitcher
              variant={isDark ? 'dark' : 'light'}
              allowedLanguages={profile?.supportedLanguages}
            />
          </div>
        </div>
      </header>

      {/* Burger Drawer Navigation */}
      <BurgerDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        profile={profile}
        onNavigateToCategories={onNavigateToCategories}
        onFocusSearch={onFocusSearch}
      />

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer
        className={`mt-12 border-t py-8 transition-colors duration-200 ${
          isDark
            ? 'border-[#4A2C16] bg-[#271810] text-[#C8B9AD]'
            : 'border-app-border bg-white text-app-text-secondary'
        }`}
      >
        <div className="mx-auto max-w-6xl px-4">
          {isLoading ? (
            <div
              data-testid="footer-branding-skeleton"
              className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center"
            >
              <div className="space-y-2">
                <div className="h-5 w-32 animate-pulse rounded bg-stone-700/50" />
                <div className="h-3.5 w-48 animate-pulse rounded bg-stone-700/30" />
              </div>
              <div className="flex gap-4">
                <div className="h-4 w-28 animate-pulse rounded bg-stone-700/30" />
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
                {phone && (
                  <a
                    href={`tel:${phone.replace(/\s+/g, '')}`}
                    className="inline-flex items-center gap-1.5 hover:text-brand-primary"
                  >
                    <Phone className="h-3.5 w-3.5 text-brand-primary" />
                    <span>{phone}</span>
                  </a>
                )}
                {phone2 && (
                  <a
                    href={`tel:${phone2.replace(/\s+/g, '')}`}
                    className="inline-flex items-center gap-1.5 hover:text-brand-primary"
                  >
                    <Phone className="h-3.5 w-3.5 text-brand-primary" />
                    <span>{phone2}</span>
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
                {instagram && (
                  <a
                    href={instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-brand-primary font-medium"
                  >
                    <span>Instagram</span>
                  </a>
                )}
                {facebook && (
                  <a
                    href={facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-brand-primary font-medium"
                  >
                    <span>Facebook</span>
                  </a>
                )}
              </div>
            </div>
          )}

          <div
            className={`mt-6 flex flex-wrap items-center justify-between gap-4 border-t pt-4 text-xs text-app-text-muted ${
              isDark ? 'border-[#4A2C16]' : 'border-app-border/70'
            }`}
          >
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
