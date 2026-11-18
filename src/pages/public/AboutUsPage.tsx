import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Quote,
} from 'lucide-react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { useRestaurantSettings } from '../../features/settings/hooks/useRestaurantSettings';
import { useTheme } from '../../app/providers/themeContext';
import { getRestaurantId } from '../../config/app';
import { getLocalizedText } from '../../lib/utils/format';
import type { Language } from '../../types';

interface GalleryItem {
  id: string;
  jpg: string;
  webp: string;
  titleKey: string;
}

const GALLERY_IMAGES: GalleryItem[] = [
  {
    id: 'decor',
    jpg: '/aboute/DIN_0646.jpg',
    webp: '/aboute/webp/DIN_0646.webp',
    titleKey: 'about.galleryImg1',
  },
  {
    id: 'private-room',
    jpg: '/aboute/DIN_9667.jpg',
    webp: '/aboute/webp/DIN_9667.webp',
    titleKey: 'about.galleryImg2',
  },
  {
    id: 'fireplace',
    jpg: '/aboute/DIN_9709.jpg',
    webp: '/aboute/webp/DIN_9709.webp',
    titleKey: 'about.galleryImg3',
  },
  {
    id: 'cottage',
    jpg: '/aboute/DIN_6196-2.jpg',
    webp: '/aboute/webp/DIN_6196-2.webp',
    titleKey: 'about.galleryImg4',
  },
];

function ResponsivePhoto({
  jpg,
  webp,
  alt,
  className = '',
  imgClassName = '',
  priority = false,
}: {
  jpg: string;
  webp: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
}) {
  return (
    <picture className={`block ${className}`}>
      <source srcSet={webp} type="image/webp" />
      <img
        src={jpg}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        className={`w-full h-full object-cover ${imgClassName}`}
      />
    </picture>
  );
}

export function AboutUsPage() {
  const { i18n, t } = useTranslation();
  const lang = (i18n.language?.slice(0, 2) as Language) || 'hy';
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const restaurantId = getRestaurantId();
  const { profile, status: settingsStatus, retry: retrySettings } = useRestaurantSettings(restaurantId);

  const restaurantName =
    (profile ? getLocalizedText(profile.name, lang) : '') ||
    getLocalizedText({ hy: 'Խուտոռոկ', ru: 'Хуторок', en: 'Xutorok' }, lang);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Set document title
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const base = t('about.pageTitle');
    document.title = restaurantName ? `${restaurantName} — ${base}` : `Xutorok — ${base}`;
  }, [restaurantName, t]);

  // Lightbox keyboard navigation & body scroll lock
  useEffect(() => {
    if (lightboxIndex === null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev !== null ? (prev - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length : 0));
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev !== null ? (prev + 1) % GALLERY_IMAGES.length : 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxIndex]);

  return (
    <PublicLayout
      profile={profile}
      settingsStatus={settingsStatus}
      onRetrySettings={retrySettings}
    >
      <div className="relative overflow-hidden">
        {/* ============================================================== */}
        {/* 1. HERO SECTION                                                */}
        {/* ============================================================== */}
        <section
          aria-label={t('about.pageTitle')}
          className="relative min-h-[520px] sm:min-h-[580px] md:min-h-[640px] h-[72vh] max-h-[760px] w-full flex items-center justify-center overflow-hidden"
        >
          {/* Background Photo */}
          <div className="absolute inset-0 z-0">
            <ResponsivePhoto
              jpg="/aboute/DIN_4241.JPG"
              webp="/aboute/webp/DIN_4241.webp"
              alt={t('about.pageTitle')}
              priority
              className="w-full h-full"
              imgClassName="scale-105 transform-gpu transition-transform duration-1000 ease-out"
            />
            {/* Elegant multi-stop dark gradient overlay for storytelling ambiance */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/35"
              aria-hidden="true"
            />
            {/* Subtle warm vignette */}
            <div
              className="absolute inset-0 bg-radial from-transparent via-transparent to-black/40"
              aria-hidden="true"
            />
          </div>

          {/* Hero Content with Subtle Entrance Animation */}
          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center animate-fade-in-hero">
            {/* Top Ornamental Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C5A47A]/50 bg-black/40 px-4 py-1.5 backdrop-blur-md mb-6">
              <Sparkles className="h-3.5 w-3.5 text-[#C5A47A]" />
              <span className="text-[11px] sm:text-xs font-semibold tracking-widest text-[#F8F1E9] uppercase">
                {restaurantName || 'Xutorok'}
              </span>
            </div>

            {/* Main Title */}
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#F8F1E9] drop-shadow-md">
              {t('about.pageTitle')}
            </h1>

            {/* Restrained Gold Divider */}
            <div className="mx-auto my-5 flex items-center justify-center gap-3">
              <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#C5A47A]" />
              <span className="h-1.5 w-1.5 rotate-45 bg-[#C5A47A]" />
              <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#C5A47A]" />
            </div>

            {/* Subtitle */}
            <p className="mx-auto max-w-2xl font-serif text-lg sm:text-xl md:text-2xl text-[#E8DDD1] font-normal leading-relaxed drop-shadow-sm">
              {t('about.heroSubtitle')}
            </p>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 2. OUR STORY SECTION                                           */}
        {/* ============================================================== */}
        <section
          aria-labelledby="story-heading"
          className={`py-16 sm:py-24 transition-colors duration-200 ${
            isDark ? 'bg-[#302019]' : 'bg-[#FBF7F2]'
          }`}
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
              {/* Left Column: Editorial Text */}
              <div className="lg:col-span-7">
                <span className="inline-block text-xs font-bold tracking-widest text-[#C5A47A] uppercase mb-3">
                  {t('about.storyBadge')}
                </span>

                <h2
                  id="story-heading"
                  className={`font-serif text-2xl sm:text-3xl md:text-4xl font-bold leading-tight tracking-tight ${
                    isDark ? 'text-[#F8F1E9]' : 'text-[#241B17]'
                  }`}
                >
                  {t('about.storyHeading')}
                </h2>

                <div className="my-5 h-0.5 w-16 bg-[#C5A47A]/70" />

                {/* Editorial Pull-Quote */}
                <div
                  className={`relative my-6 rounded-2xl border-l-4 border-[#C5A47A] p-5 sm:p-6 transition-colors ${
                    isDark ? 'bg-[#3D261A]/70 text-[#F8F1E9]' : 'bg-white/90 text-[#302019]'
                  } shadow-sm`}
                >
                  <Quote className="absolute right-4 top-4 h-8 w-8 text-[#C5A47A]/20" />
                  <p className="font-serif text-base sm:text-lg italic leading-relaxed text-[#C5A47A]">
                    «{t('about.storyQuote')}»
                  </p>
                </div>

                {/* Paragraphs */}
                <div
                  className={`space-y-4 text-sm sm:text-base leading-relaxed ${
                    isDark ? 'text-[#D8CBBF]' : 'text-[#575049]'
                  }`}
                >
                  <p>{t('about.storyP1')}</p>
                  <p>{t('about.storyP2')}</p>
                </div>
              </div>

              {/* Right Column: Restaurant Photograph */}
              <div className="lg:col-span-5">
                <div className="relative mx-auto max-w-md lg:max-w-none">
                  {/* Decorative Frame Border Accent */}
                  <div
                    className="absolute -inset-2.5 rounded-3xl border border-[#C5A47A]/35 -rotate-1 pointer-events-none"
                    aria-hidden="true"
                  />
                  <div
                    className={`relative overflow-hidden rounded-2xl border shadow-xl transition-all duration-300 ${
                      isDark ? 'border-[#4A2C16] bg-[#3D261A]' : 'border-app-border bg-white'
                    }`}
                  >
                    <div className="aspect-[4/5] w-full overflow-hidden">
                      <ResponsivePhoto
                        jpg="/aboute/IMG_1905.JPG"
                        webp="/aboute/webp/IMG_1905.webp"
                        alt={t('about.storyBadge')}
                        className="w-full h-full"
                        imgClassName="transition-transform duration-700 ease-out hover:scale-105"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 3. OUR CUISINE SECTION                                         */}
        {/* ============================================================== */}
        <section
          aria-labelledby="cuisine-heading"
          className={`py-16 sm:py-24 border-y transition-colors duration-200 ${
            isDark ? 'border-[#4A2C16] bg-[#271810]' : 'border-app-border/60 bg-[#F5EDE4]/60'
          }`}
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
              {/* Food Photograph (7 Columns) */}
              <div className="lg:col-span-7 order-2 lg:order-1">
                <div className="relative">
                  {/* Backdrop Offset Element */}
                  <div
                    className="absolute -bottom-3 -right-3 sm:-bottom-4 sm:-right-4 h-full w-full rounded-3xl bg-[#C5A47A]/20 pointer-events-none"
                    aria-hidden="true"
                  />
                  <div
                    className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border shadow-2xl ${
                      isDark ? 'border-[#4A2C16]' : 'border-stone-300/80'
                    }`}
                  >
                    <div className="aspect-[4/3] sm:aspect-[16/11] w-full overflow-hidden">
                      <ResponsivePhoto
                        jpg="/aboute/DIN_3923-.jpg"
                        webp="/aboute/webp/DIN_3923-.webp"
                        alt={t('about.cuisineHeading')}
                        className="w-full h-full"
                        imgClassName="transition-transform duration-700 ease-out hover:scale-105"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Text & Features (5 Columns) */}
              <div className="lg:col-span-5 order-1 lg:order-2">
                <span className="inline-block text-xs font-bold tracking-widest text-[#C5A47A] uppercase mb-3">
                  {t('about.cuisineBadge')}
                </span>

                <h2
                  id="cuisine-heading"
                  className={`font-serif text-2xl sm:text-3xl md:text-4xl font-bold leading-tight tracking-tight ${
                    isDark ? 'text-[#F8F1E9]' : 'text-[#241B17]'
                  }`}
                >
                  {t('about.cuisineHeading')}
                </h2>

                <div className="my-5 h-0.5 w-16 bg-[#C5A47A]/70" />

                <div
                  className={`space-y-4 text-sm sm:text-base leading-relaxed ${
                    isDark ? 'text-[#D8CBBF]' : 'text-[#575049]'
                  }`}
                >
                  <p>{t('about.cuisineP1')}</p>
                  <p>{t('about.cuisineP2')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 4. RESTAURANT GALLERY (ATMOSPHERE)                            */}
        {/* ============================================================== */}
        <section
          aria-labelledby="gallery-heading"
          className={`py-16 sm:py-24 transition-colors duration-200 ${
            isDark ? 'bg-[#302019]' : 'bg-[#FBF7F2]'
          }`}
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mx-auto max-w-2xl text-center mb-12 sm:mb-16">
              <span className="inline-block text-xs font-bold tracking-widest text-[#C5A47A] uppercase mb-2">
                {t('about.galleryBadge')}
              </span>
              <h2
                id="gallery-heading"
                className={`font-serif text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight ${
                  isDark ? 'text-[#F8F1E9]' : 'text-[#241B17]'
                }`}
              >
                {t('about.galleryHeading')}
              </h2>
              <div className="mx-auto my-4 h-0.5 w-16 bg-[#C5A47A]/70" />
              <p
                className={`text-sm sm:text-base ${
                  isDark ? 'text-[#D8CBBF]' : 'text-[#6D4029]'
                }`}
              >
                {t('about.gallerySub')}
              </p>
            </div>

            {/* Masonry-Style Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              {GALLERY_IMAGES.map((item, index) => {
                const itemTitle = t(item.titleKey);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    aria-label={`${itemTitle} (${t('menu.viewDetails')})`}
                    className={`group relative overflow-hidden rounded-2xl border text-left cursor-pointer transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#C5A47A] ${
                      isDark
                        ? 'border-[#4A2C16] bg-[#3D261A] shadow-lg hover:border-[#C5A47A]/70'
                        : 'border-app-border bg-white shadow-md hover:border-[#C5A47A]'
                    }`}
                  >
                    {/* Image Container with Consistent Aspect Ratio */}
                    <div className="aspect-[4/5] w-full overflow-hidden">
                      <ResponsivePhoto
                        jpg={item.jpg}
                        webp={item.webp}
                        alt={itemTitle}
                        className="w-full h-full"
                        imgClassName="transition-transform duration-700 ease-out group-hover:scale-108"
                      />
                    </div>

                    {/* Gradient Overlay & Hover Caption */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-300" />

                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex items-end justify-between gap-2 text-white">
                      <div>
                        <span className="block text-[11px] font-medium tracking-wider uppercase text-[#C5A47A]">
                          0{index + 1}
                        </span>
                        <h3 className="font-serif text-sm sm:text-base font-semibold leading-snug drop-shadow-sm text-[#F8F1E9]">
                          {itemTitle}
                        </h3>
                      </div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-xs text-white opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0 transition-all duration-200">
                        <Maximize2 className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* FULLSCREEN LIGHTBOX MODAL                                      */}
        {/* ============================================================== */}
        {lightboxIndex !== null && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t(GALLERY_IMAGES[lightboxIndex].titleKey)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 sm:p-6"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              aria-label={t('about.lightboxClose')}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors focus:outline-none focus:ring-2 focus:ring-[#C5A47A]"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Counter */}
            <div className="absolute top-5 left-5 z-10 rounded-full bg-black/60 px-3.5 py-1 text-xs font-semibold tracking-wider text-[#C5A47A] border border-[#C5A47A]/30">
              {lightboxIndex + 1} / {GALLERY_IMAGES.length}
            </div>

            {/* Previous Button */}
            <button
              type="button"
              onClick={() =>
                setLightboxIndex((prev) => (prev !== null ? (prev - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length : 0))
              }
              aria-label={t('about.lightboxPrev')}
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/60 border border-white/10 text-white hover:bg-white/20 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-[#C5A47A]"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            {/* Next Button */}
            <button
              type="button"
              onClick={() =>
                setLightboxIndex((prev) => (prev !== null ? (prev + 1) % GALLERY_IMAGES.length : 0))
              }
              aria-label={t('about.lightboxNext')}
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/60 border border-white/10 text-white hover:bg-white/20 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-[#C5A47A]"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            {/* Lightbox Image Stage */}
            <div className="relative max-h-[85vh] max-w-5xl w-full flex flex-col items-center">
              <div className="relative max-h-[75vh] w-auto overflow-hidden rounded-2xl shadow-2xl">
                <ResponsivePhoto
                  jpg={GALLERY_IMAGES[lightboxIndex].jpg}
                  webp={GALLERY_IMAGES[lightboxIndex].webp}
                  alt={t(GALLERY_IMAGES[lightboxIndex].titleKey)}
                  priority
                  className="max-h-[75vh] w-auto"
                  imgClassName="max-h-[75vh] w-auto object-contain rounded-2xl"
                />
              </div>

              {/* Caption */}
              <div className="mt-4 text-center">
                <p className="font-serif text-base sm:text-lg font-medium text-[#F8F1E9]">
                  {t(GALLERY_IMAGES[lightboxIndex].titleKey)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

export default AboutUsPage;
