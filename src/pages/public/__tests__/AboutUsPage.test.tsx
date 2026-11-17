import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import hyLocales from '../../../i18n/locales/hy.json';
import ruLocales from '../../../i18n/locales/ru.json';
import enLocales from '../../../i18n/locales/en.json';
import { AboutUsPage } from '../AboutUsPage';

describe('About Us Page & Restaurant Photography Integrity', () => {
  const publicAbouteDir = path.resolve(process.cwd(), 'public', 'aboute');
  const webpDir = path.resolve(publicAbouteDir, 'webp');

  const EXPECTED_IMAGES = [
    'DIN_0646.jpg',
    'DIN_3923-.jpg',
    'DIN_4241.JPG',
    'DIN_6196-2.jpg',
    'DIN_9667.jpg',
    'DIN_9709.jpg',
    'IMG_0529.JPG',
    'IMG_1905.JPG',
  ];

  it('verifies that all 8 original restaurant photographs are present in public/aboute with exact filenames', () => {
    expect(fs.existsSync(publicAbouteDir)).toBe(true);

    for (const filename of EXPECTED_IMAGES) {
      const fullPath = path.join(publicAbouteDir, filename);
      expect(fs.existsSync(fullPath), `Missing image: ${filename}`).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size).toBeGreaterThan(100_000); // Non-empty original photo
    }
  });

  it('verifies that optimized responsive WebP versions exist for all 8 photographs', () => {
    expect(fs.existsSync(webpDir)).toBe(true);

    for (const filename of EXPECTED_IMAGES) {
      const baseName = path.parse(filename).name;
      const webpPath = path.join(webpDir, `${baseName}.webp`);
      expect(fs.existsSync(webpPath), `Missing WebP: ${baseName}.webp`).toBe(true);
      const stat = fs.statSync(webpPath);
      expect(stat.size).toBeGreaterThan(10_000);
      expect(stat.size).toBeLessThan(3_000_000); // Optimized web delivery size
    }
  });

  it('verifies trilingual navigation and about us dictionary completeness in HY, RU, and EN', () => {
    const locales = [
      { code: 'hy', data: hyLocales },
      { code: 'ru', data: ruLocales },
      { code: 'en', data: enLocales },
    ];

    for (const { code, data } of locales) {
      expect(data.nav.about, `nav.about missing in ${code}`).toBeDefined();
      expect(typeof data.nav.about).toBe('string');
      expect(data.nav.about.length).toBeGreaterThan(0);

      const about = data.about;
      expect(about, `about dictionary missing in ${code}`).toBeDefined();
      expect(about.pageTitle).toBeDefined();
      expect(about.heroSubtitle).toBeDefined();
      expect(about.storyBadge).toBeDefined();
      expect(about.storyHeading).toBeDefined();
      expect(about.storyQuote).toBeDefined();
      expect(about.storyP1).toBeDefined();
      expect(about.storyP2).toBeDefined();
      expect(about.cuisineBadge).toBeDefined();
      expect(about.cuisineHeading).toBeDefined();
      expect(about.cuisineP1).toBeDefined();
      expect(about.cuisineP2).toBeDefined();
      expect(about.galleryBadge).toBeDefined();
      expect(about.galleryHeading).toBeDefined();
      expect(about.gallerySub).toBeDefined();
      expect(about.exteriorBadge).toBeDefined();
      expect(about.exteriorHeading).toBeDefined();
      expect(about.exteriorText).toBeDefined();
      expect(about.viewMenuCta).toBeDefined();
      expect(about.lightboxClose).toBeDefined();
      expect(about.lightboxPrev).toBeDefined();
      expect(about.lightboxNext).toBeDefined();
    }

    // Explicit Armenian check
    expect(hyLocales.about.pageTitle).toBe('Մեր մասին');
    expect(hyLocales.about.heroSubtitle).toBe('Ուկրաինական և Հայկական խոհանոց');
    expect(hyLocales.about.storyP1).toBe(
      '2019 թվականից Xutorok-ը միավորում է հայկական և ուկրաինական խոհանոցների հարուստ ավանդույթները։ Ավելին, քան պարզապես ռեստորան՝ Xutorok-ը մի վայր է, որտեղ ուկրաինական խոհանոցի ինքնատիպ համերը համադրվում են հայկական ջերմ հյուրընկալության հետ։ Այստեղ ներկայացված են ուկրաինական հայտնի ուտեստներ, ավանդական ըմպելիքներ և իսկական բաղադրատոմսեր։'
    );
    expect(hyLocales.about.storyP2).toBe(
      'Ռեստորանում գործում է մինչև 40 անձի համար նախատեսված ընդհանուր սրահ, ինչպես նաև 10 հարմարավետ առանձնասենյակ, որոնք նախատեսված են մտերմիկ հանդիպումների, ընտանեկան առիթների և տոնական միջոցառումների կազմակերպման, ինչպես նաև սիրելիների հետ հաճելի ժամանակ անցկացնելու համար։'
    );
    expect(hyLocales.about.viewMenuCta).toBe('Դիտել մենյուն');
    expect(hyLocales.nav.about).toBe('Մեր մասին');

    // Explicit Russian check
    expect(ruLocales.about.pageTitle).toBe('О нас');
    expect(ruLocales.about.heroSubtitle).toBe('Украинская и Армянская кухня');
    expect(ruLocales.about.storyP1).toBe(
      'С 2019 года Xutorok объединяет богатые кулинарные традиции армянской и украинской кухни. Xutorok — это больше, чем просто ресторан: здесь самобытные вкусы украинской кухни сочетаются с армянским теплом и гостеприимством. В меню представлены известные украинские блюда, традиционные напитки и аутентичные рецепты.'
    );
    expect(ruLocales.about.storyP2).toBe(
      'В ресторане имеется общий зал вместимостью до 40 гостей, а также 10 комфортабельных отдельных комнат, предназначенных для дружеских встреч, семейных торжеств, праздничных мероприятий и приятного времяпрепровождения в кругу близких.'
    );
    expect(ruLocales.about.viewMenuCta).toBe('Посмотреть меню');
    expect(ruLocales.nav.about).toBe('О нас');

    // Explicit English check
    expect(enLocales.about.pageTitle).toBe('About Us');
    expect(enLocales.about.heroSubtitle).toBe('Ukrainian & Armenian Cuisine');
    expect(enLocales.about.storyP1).toBe(
      'Since 2019, Xutorok has been bringing together the rich culinary traditions of Armenian and Ukrainian cuisine. More than just a restaurant, Xutorok is a place where the distinctive flavours of Ukrainian cuisine blend with Armenian warmth and hospitality. The menu features well-known Ukrainian dishes, traditional beverages, and authentic recipes.'
    );
    expect(enLocales.about.storyP2).toBe(
      'The restaurant features a main dining hall accommodating up to 40 guests, along with 10 comfortable private rooms, designed for intimate gatherings, family occasions, festive celebrations, and enjoyable moments with loved ones.'
    );
    expect(enLocales.about.viewMenuCta).toBe('View Menu');
    expect(enLocales.nav.about).toBe('About Us');

    // Ensure no placeholder Lorem ipsum remains in any locale
    for (const { code, data } of locales) {
      for (const [key, value] of Object.entries(data.about)) {
        expect(value.toLowerCase(), `Lorem ipsum found in ${code}.about.${key}`).not.toContain('lorem ipsum');
      }
    }
  });

  it('renders AboutUsPage with all expected sections, images, and CTA to static markup', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/about']}>
        <AboutUsPage />
      </MemoryRouter>
    );

    // Hero Image
    expect(html).toContain('DIN_4241.JPG');
    expect(html).toContain('DIN_4241.webp');

    // Story Image
    expect(html).toContain('IMG_1905.JPG');
    expect(html).toContain('IMG_1905.webp');

    // Cuisine Image
    expect(html).toContain('DIN_3923-.jpg');
    expect(html).toContain('DIN_3923-.webp');

    // Gallery Images
    expect(html).toContain('DIN_0646.jpg');
    expect(html).toContain('DIN_9667.jpg');
    expect(html).toContain('DIN_9709.jpg');
    expect(html).toContain('DIN_6196-2.jpg');

    // Exterior Image
    expect(html).toContain('IMG_0529.JPG');
    expect(html).toContain('IMG_0529.webp');

    // Menu CTA
    expect(html).toContain('href="/menu"');
  });

  it('verifies that router source contains /about path and AboutUsPage binding', () => {
    const routerSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/app/router.tsx'),
      'utf-8'
    );
    expect(routerSource).toContain("path: 'about'");
    expect(routerSource).toContain('element: <AboutUsPage />');
  });
});
