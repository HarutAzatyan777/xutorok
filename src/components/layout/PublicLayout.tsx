import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Phone, Clock, Lock } from 'lucide-react';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { getLocalizedText } from '../../lib/utils/format';
import type { Language, RestaurantProfile } from '../../types';

interface PublicLayoutProps {
  profile: RestaurantProfile;
  children: ReactNode;
}

export function PublicLayout({ profile, children }: PublicLayoutProps) {
  const { i18n, t } = useTranslation();
  const lang = (i18n.language?.slice(0, 2) as Language) || 'hy';

  const restaurantName = getLocalizedText(profile.name, lang, 'Xutorok');
  const address = getLocalizedText(profile.contact?.address, lang);
  const workingHours = getLocalizedText(profile.contact?.workingHours, lang);
  const logoUrl = profile.branding?.logoUrl || '/logo.svg';

  return (
    <div className="flex min-h-dvh flex-col bg-[#faf9f6] text-stone-900">
      {/* Top Header */}
      <header className="sticky top-0 z-30 h-[69px] border-b border-stone-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-4">
          <Link
            to="/menu"
            className="flex items-center gap-3 focus:outline-none"
            aria-label={restaurantName}
          >
            <img
              src={logoUrl}
              alt={restaurantName}
              className="h-10 w-auto max-w-[140px] object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/logo.svg';
              }}
            />
            <div className="hidden sm:block">
              <span className="block text-base font-bold text-stone-900 leading-tight">
                {restaurantName}
              </span>
              <span className="block text-xs text-stone-500">
                {t('menu.title')}
              </span>
            </div>
          </Link>

          <LanguageSwitcher allowedLanguages={profile.supportedLanguages} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="mt-12 border-t border-stone-200 bg-white py-8 text-stone-600">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-base font-bold text-stone-900">{restaurantName}</p>
              <p className="mt-1 text-xs text-stone-500">{t('menu.subtitle')}</p>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-stone-600">
              {profile.contact?.phone && (
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

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-stone-100 pt-4 text-xs text-stone-400">
            <span>
              © {new Date().getFullYear()} {restaurantName}. {t('footer.rights')}.
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

