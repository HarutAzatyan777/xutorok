import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  BookOpen,
  LayoutGrid,
  Phone,
  MapPin,
  Clock,
  UtensilsCrossed,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../../app/providers/themeContext';
import { getLocalizedText } from '../../lib/utils/format';
import type { Language, RestaurantProfile } from '../../types';

function InstagramIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

interface BurgerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: RestaurantProfile | null;
  onNavigateToCategories?: () => void;
  onFocusSearch?: () => void;
}

export function BurgerDrawer({
  isOpen,
  onClose,
  profile,
  onNavigateToCategories,
}: BurgerDrawerProps) {
  const { i18n, t } = useTranslation();
  const lang = (i18n.language?.slice(0, 2) as Language) || 'hy';
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const restaurantName = profile ? getLocalizedText(profile.name, lang) : '';
  const address = profile?.contact?.address
    ? getLocalizedText(profile.contact.address, lang)
    : '';
  const workingHours = profile?.contact?.workingHours
    ? getLocalizedText(profile.contact.workingHours, lang)
    : '';
  const phone = profile?.contact?.phone?.trim() || '+37495108090';
  const phone2 = profile?.contact?.phone2?.trim() || '+37411708090';
  const instagram =
    profile?.contact?.instagram?.trim() ||
    'https://www.instagram.com/xutorok.restaurant?obrf=b2thNHU2NW50MTQw';
  const facebook =
    profile?.contact?.facebook?.trim() ||
    'https://www.facebook.com/share/14tHT8aMoey/?mibextid=wwXIfr';

  // Manage body scroll lock and escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus close button on open for accessibility
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('nav.menu')}
      className="fixed inset-0 z-50 flex"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div
        ref={drawerRef}
        className={`relative ml-auto flex h-full w-full max-w-sm flex-col shadow-2xl transition-colors duration-200 sm:max-w-md ${
          isDark
            ? 'bg-[#302019] text-[#F8F1E9]'
            : 'bg-white text-app-text'
        }`}
      >
        {/* Drawer Header */}
        <div
          className={`flex items-center justify-between border-b px-5 py-4 ${
            isDark ? 'border-[#4A2C16]' : 'border-app-border'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                isDark
                  ? 'bg-[#3D261A] text-[#C5A47A]'
                  : 'bg-app-surface-muted text-brand-primary'
              }`}
            >
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-sm font-bold tracking-tight">
                {restaurantName || t('menu.title')}
              </span>
              <span
                className={`block text-xs ${
                  isDark ? 'text-[#D8CBBF]' : 'text-app-text-muted'
                }`}
              >
                {t('menu.subtitle')}
              </span>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t('nav.closeMenu')}
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#C5A47A] ${
              isDark
                ? 'bg-[#3D261A] text-[#F8F1E9] hover:bg-[#4A2C16]'
                : 'bg-app-surface-muted text-app-text hover:bg-stone-200'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <p className="mb-3 text-[11px] font-semibold tracking-wider text-[#C5A47A] uppercase">
            {t('nav.menu')}
          </p>

          <nav aria-label="Quick navigation" className="space-y-1.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-left text-sm font-medium transition-colors ${
                isDark
                  ? 'text-[#F8F1E9] hover:bg-[#3D261A]'
                  : 'text-app-text hover:bg-app-surface-muted'
              }`}
            >
              <BookOpen className="h-4 w-4 text-[#C5A47A]" />
              <span>{t('nav.menu')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToCategories?.();
              }}
              className={`flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-left text-sm font-medium transition-colors ${
                isDark
                  ? 'text-[#F8F1E9] hover:bg-[#3D261A]'
                  : 'text-app-text hover:bg-app-surface-muted'
              }`}
            >
              <LayoutGrid className="h-4 w-4 text-[#C5A47A]" />
              <span>{t('nav.categories')}</span>
            </button>

            {/* Dark / Light Mode Switch Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left text-sm font-medium transition-colors ${
                isDark
                  ? 'text-[#F8F1E9] hover:bg-[#3D261A]'
                  : 'text-app-text hover:bg-app-surface-muted'
              }`}
            >
              <div className="flex items-center gap-3.5">
                {isDark ? (
                  <Sun className="h-4 w-4 text-[#C5A47A]" />
                ) : (
                  <Moon className="h-4 w-4 text-brand-primary" />
                )}
                <span>{isDark ? t('nav.lightMode') : t('nav.darkMode')}</span>
              </div>
              <span className="rounded-lg border border-[#C5A47A]/40 px-2 py-0.5 text-xs text-[#C5A47A]">
                {isDark ? 'Dark' : 'Light'}
              </span>
            </button>
          </nav>

          {/* Contact Section */}
          <div
            className={`mt-8 border-t pt-6 ${
              isDark ? 'border-[#4A2C16]' : 'border-app-border'
            }`}
          >
            <p className="mb-3 text-[11px] font-semibold tracking-wider text-[#C5A47A] uppercase">
              {t('nav.contact')}
            </p>

            <div className="space-y-3.5 text-xs">
              {phone && (
                <a
                  href={`tel:${phone.replace(/\s+/g, '')}`}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-colors ${
                    isDark
                      ? 'bg-[#3D261A]/60 text-[#F8F1E9] hover:bg-[#3D261A]'
                      : 'bg-app-surface-muted text-app-text hover:bg-stone-200'
                  }`}
                >
                  <Phone className="h-4 w-4 shrink-0 text-[#C5A47A]" />
                  <div>
                    <span className="block font-medium">{phone}</span>
                    <span
                      className={`text-[11px] ${
                        isDark ? 'text-[#D8CBBF]' : 'text-app-text-muted'
                      }`}
                    >
                      {t('nav.phone')}
                    </span>
                  </div>
                </a>
              )}

              {phone2 && (
                <a
                  href={`tel:${phone2.replace(/\s+/g, '')}`}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-colors ${
                    isDark
                      ? 'bg-[#3D261A]/60 text-[#F8F1E9] hover:bg-[#3D261A]'
                      : 'bg-app-surface-muted text-app-text hover:bg-stone-200'
                  }`}
                >
                  <Phone className="h-4 w-4 shrink-0 text-[#C5A47A]" />
                  <div>
                    <span className="block font-medium">{phone2}</span>
                    <span
                      className={`text-[11px] ${
                        isDark ? 'text-[#D8CBBF]' : 'text-app-text-muted'
                      }`}
                    >
                      {t('nav.phone')}
                    </span>
                  </div>
                </a>
              )}

              {instagram && (
                <a
                  href={
                    instagram.startsWith('http')
                      ? instagram
                      : `https://instagram.com/${instagram.replace(/^@/, '')}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-colors ${
                    isDark
                      ? 'bg-[#3D261A]/60 text-[#F8F1E9] hover:bg-[#3D261A]'
                      : 'bg-app-surface-muted text-app-text hover:bg-stone-200'
                  }`}
                >
                  <InstagramIcon className="h-4 w-4 shrink-0 text-[#C5A47A]" />
                  <div>
                    <span className="block font-medium">{t('nav.instagram')}</span>
                    <span
                      className={`text-[11px] ${
                        isDark ? 'text-[#D8CBBF]' : 'text-app-text-muted'
                      }`}
                    >
                      @xutorok.restaurant
                    </span>
                  </div>
                </a>
              )}

              {facebook && (
                <a
                  href={facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-colors ${
                    isDark
                      ? 'bg-[#3D261A]/60 text-[#F8F1E9] hover:bg-[#3D261A]'
                      : 'bg-app-surface-muted text-app-text hover:bg-stone-200'
                  }`}
                >
                  <FacebookIcon className="h-4 w-4 shrink-0 text-[#C5A47A]" />
                  <div>
                    <span className="block font-medium">{t('nav.facebook')}</span>
                    <span
                      className={`text-[11px] ${
                        isDark ? 'text-[#D8CBBF]' : 'text-app-text-muted'
                      }`}
                    >
                      Xutorok Tavern
                    </span>
                  </div>
                </a>
              )}

              {address && (
                <div className="flex items-start gap-3 px-3.5 py-1">
                  <MapPin className="h-4 w-4 shrink-0 text-[#C5A47A] mt-0.5" />
                  <div>
                    <span className="block font-medium">{address}</span>
                    <span
                      className={`text-[11px] ${
                        isDark ? 'text-[#D8CBBF]' : 'text-app-text-muted'
                      }`}
                    >
                      {t('nav.address')}
                    </span>
                  </div>
                </div>
              )}

              {workingHours && (
                <div className="flex items-start gap-3 px-3.5 py-1">
                  <Clock className="h-4 w-4 shrink-0 text-[#C5A47A] mt-0.5" />
                  <div>
                    <span className="block font-medium">{workingHours}</span>
                    <span
                      className={`text-[11px] ${
                        isDark ? 'text-[#D8CBBF]' : 'text-app-text-muted'
                      }`}
                    >
                      {t('nav.workingHours')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div
          className={`border-t px-5 py-4 text-xs ${
            isDark
              ? 'border-[#4A2C16] text-[#D8CBBF]'
              : 'border-app-border text-app-text-muted'
          }`}
        >
          <span>
            © {new Date().getFullYear()}{' '}
            {restaurantName ? `${restaurantName}. ` : ''}
            {t('footer.rights')}.
          </span>
        </div>
      </div>
    </div>
  );
}
