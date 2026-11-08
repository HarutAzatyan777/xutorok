import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockSetDoc = vi.fn();
const mockOnSnapshot = vi.fn();

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    collection: (_db: unknown, path: string) => ({
      path,
      withConverter: () => ({ path }),
    }),
    doc: (parent: { path?: string }, id?: string) => {
      const basePath = parent?.path
        ? `${parent.path}/${id ?? 'auto-id'}`
        : String(id ?? 'doc-path');
      return {
        id: id ?? 'auto-id',
        path: basePath,
        withConverter: () => ({ id: id ?? 'auto-id', path: basePath }),
      };
    },
    getDoc: (...args: unknown[]) => mockGetDoc(...args),
    getDocs: (...args: unknown[]) => mockGetDocs(...args),
    setDoc: (...args: unknown[]) => mockSetDoc(...args),
    onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  };
});

import {
  assembleRestaurantProfile,
  clearRestaurantSettingsCache,
  createEmptyRestaurantProfile,
  fetchRestaurantProfile,
  getCachedRestaurantProfile,
  saveRestaurantSettings,
  subscribeToRestaurantSettings,
} from '../settingsService';
import { getLocalizedText } from '../../../../lib/utils/format';
import i18n, { setAppLanguage, syncLanguageWithSettings } from '../../../../i18n';
import type { RestaurantProfile } from '../../../../types';

describe('Restaurant Branding & Settings Single Source of Truth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRestaurantSettingsCache();
  });

  it('1. Initial settings loading starts with null cached profile and neutral empty structure', () => {
    expect(getCachedRestaurantProfile('xutorok')).toBeNull();

    const emptyProfile = createEmptyRestaurantProfile('xutorok');
    expect(emptyProfile.name).toEqual({ hy: '', ru: '', en: '' });
    expect(emptyProfile.branding?.logoUrl).toBe('');
    expect(emptyProfile.branding?.logoUrl).not.toBe('/logo.svg');
  });

  it('2. No default branding flash while loading and ignores empty cached snapshots before server response', () => {
    let emittedProfile: RestaurantProfile | null = null;
    let snapshotCallback: ((snap: unknown) => void) | null = null;

    mockOnSnapshot.mockImplementation(
      (_ref: { path: string }, onNext: (snap: unknown) => void) => {
        snapshotCallback = onNext;
        return () => {};
      }
    );

    const unsub = subscribeToRestaurantSettings(
      (profile) => {
        emittedProfile = profile;
      },
      () => {},
      'xutorok'
    );

    // Before Firestore responds, no default profile is emitted
    expect(emittedProfile).toBeNull();

    // Simulate an empty initial local cache snapshot (fromCache: true) -> must NOT flash empty/default branding
    snapshotCallback!({
      empty: true,
      metadata: { fromCache: true },
      docs: [],
    });
    expect(emittedProfile).toBeNull();
    expect(mockGetDoc).not.toHaveBeenCalled();

    // Now simulate authoritative server response from restaurants/xutorok/settings
    snapshotCallback!({
      empty: false,
      metadata: { fromCache: false },
      docs: [
        {
          id: 'general',
          data: () => ({
            restaurantId: 'xutorok',
            name: { hy: 'Խուտոռոկ Պանդոկ', ru: 'Хуторок Трактир', en: 'Xutorok Tavern' },
            defaultLanguage: 'ru',
            supportedLanguages: ['hy', 'ru', 'en'],
            contact: { phone: '+374 10 000000' },
          }),
        },
        {
          id: 'branding',
          data: () => ({
            restaurantId: 'xutorok',
            logoUrl: 'https://firebasestorage.googleapis.com/v0/b/ai-twin-conflicts/o/custom-logo.svg',
            logoPath: 'restaurants/xutorok/branding/custom-logo.svg',
            primaryColor: '#5c3a1e',
            secondaryColor: '#8c6239',
          }),
        },
      ],
    });

    expect(emittedProfile).not.toBeNull();
    expect(emittedProfile!.name.ru).toBe('Хуторок Трактир');
    expect(emittedProfile!.branding?.logoUrl).toBe(
      'https://firebasestorage.googleapis.com/v0/b/ai-twin-conflicts/o/custom-logo.svg'
    );
    // When both general and branding settings docs exist, no extra root doc getDoc read is performed
    expect(mockGetDoc).not.toHaveBeenCalled();

    unsub();
  });

  it('3. Retrieves authoritative Firestore settings from restaurants/xutorok/settings/{general,branding,menu}', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        {
          id: 'general',
          data: () => ({
            restaurantId: 'xutorok',
            name: { hy: 'Хуторок', ru: 'Хуторок', en: 'Хуторок' },
            defaultLanguage: 'hy',
            supportedLanguages: ['hy', 'ru', 'en'],
            contact: {
              phone: '+374 99 123456',
              address: { hy: 'Երևան', ru: 'Ереван', en: 'Yerevan' },
              workingHours: { hy: '10:00 - 24:00', ru: '10:00 - 24:00', en: '10:00 - 24:00' },
            },
          }),
        },
        {
          id: 'branding',
          data: () => ({
            restaurantId: 'xutorok',
            logoUrl: 'https://firebasestorage.googleapis.com/v0/b/ai-twin-conflicts.firebasestorage.app/o/logo.svg',
            logoPath: 'restaurants/xutorok/branding/logo.svg',
            primaryColor: '#5c3a1e',
            secondaryColor: '#8c6239',
          }),
        },
        {
          id: 'menu',
          data: () => ({
            restaurantId: 'xutorok',
            currency: 'AMD',
            showUnavailableItems: false,
            showFeaturedSection: true,
          }),
        },
      ],
    });

    const profile = await fetchRestaurantProfile('xutorok');
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
    expect(mockGetDoc).not.toHaveBeenCalled();
    expect(profile.name).toEqual({ hy: 'Хуторок', ru: 'Хуторок', en: 'Хуторок' });
    expect(profile.branding?.logoUrl).toBe(
      'https://firebasestorage.googleapis.com/v0/b/ai-twin-conflicts.firebasestorage.app/o/logo.svg'
    );
    expect(profile.contact?.phone).toBe('+374 99 123456');
    expect(profile.menuSettings?.showUnavailableItems).toBe(false);
  });

  it('4. Handles missing branding settings gracefully without injecting hardcoded logo or name', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });

    const profile = await fetchRestaurantProfile('xutorok');
    expect(profile.name).toEqual({ hy: '', ru: '', en: '' });
    expect(profile.branding?.logoUrl).toBe('');
    expect(profile.branding?.logoUrl).not.toBe('/logo.svg');
  });

  it('5. Propagates Firestore request errors cleanly instead of silently showing default branding', async () => {
    mockOnSnapshot.mockImplementation(
      (_ref: { path: string }, _onNext: unknown, onErr: (err: Error) => void) => {
        onErr(new Error('Permission denied or network offline'));
        return () => {};
      }
    );

    let receivedProfile: RestaurantProfile | null = null;
    let receivedError: Error | null = null;

    const unsub = subscribeToRestaurantSettings(
      (profile) => {
        receivedProfile = profile;
      },
      (err) => {
        receivedError = err;
      },
      'xutorok'
    );

    expect(receivedProfile).toBeNull();
    expect(receivedError).not.toBeNull();
    expect(receivedError!.message).toContain('Permission denied or network offline');
    unsub();
  });

  it('6. Displays corresponding saved restaurant name across HY / RU / EN language switching', () => {
    const profile = assembleRestaurantProfile('xutorok', {
      general: {
        name: {
          hy: 'Խուտոռոկ',
          ru: 'Хуторок',
          en: 'Xutorok',
        },
        defaultLanguage: 'ru',
        supportedLanguages: ['hy', 'ru', 'en'],
      },
      branding: {
        logoUrl: 'https://example.com/logo.svg',
      },
    });

    expect(getLocalizedText(profile.name, 'hy')).toBe('Խուտոռոկ');
    expect(getLocalizedText(profile.name, 'ru')).toBe('Хуторок');
    expect(getLocalizedText(profile.name, 'en')).toBe('Xutorok');

    syncLanguageWithSettings(profile.defaultLanguage, profile.supportedLanguages);
    expect(i18n.language.slice(0, 2)).toBe('ru');

    setAppLanguage('en');
    expect(i18n.language.slice(0, 2)).toBe('en');
    expect(getLocalizedText(profile.name, i18n.language.slice(0, 2) as 'en')).toBe('Xutorok');
  });

  it('7. Propagates Admin branding updates immediately to active subscribers and Firestore settings docs', async () => {
    const writtenPaths: string[] = [];
    mockSetDoc.mockImplementation(async (ref: { path: string }) => {
      writtenPaths.push(ref.path);
    });
    mockOnSnapshot.mockImplementation(() => () => {});

    let liveSubscriberProfile: RestaurantProfile | null = null;
    const unsub = subscribeToRestaurantSettings(
      (p) => {
        liveSubscriberProfile = p;
      },
      () => {},
      'xutorok'
    );

    const saved = await saveRestaurantSettings(
      {
        name: { hy: 'Նոր Անուն', ru: 'Новое Имя', en: 'New Name' },
        defaultLanguage: 'hy',
        supportedLanguages: ['hy', 'ru', 'en'],
        branding: {
          logoUrl: 'https://firebasestorage.googleapis.com/v0/b/ai-twin-conflicts/o/new-logo.webp',
          logoPath: 'restaurants/xutorok/branding/new-logo.webp',
          primaryColor: '#5c3a1e',
          secondaryColor: '#8c6239',
        },
        contact: {
          phone: '+374 11 223344',
          address: { hy: '', ru: '', en: '' },
          workingHours: { hy: '', ru: '', en: '' },
        },
      },
      'xutorok'
    );

    expect(writtenPaths).toEqual([
      'restaurants/xutorok',
      'restaurants/xutorok/settings/general',
      'restaurants/xutorok/settings/branding',
      'restaurants/xutorok/settings/menu',
    ]);
    expect(saved.branding?.logoUrl).toBe(
      'https://firebasestorage.googleapis.com/v0/b/ai-twin-conflicts/o/new-logo.webp'
    );
    expect(liveSubscriberProfile).not.toBeNull();
    expect(liveSubscriberProfile!.name.en).toBe('New Name');
    expect(liveSubscriberProfile!.branding?.logoUrl).toBe(
      'https://firebasestorage.googleapis.com/v0/b/ai-twin-conflicts/o/new-logo.webp'
    );

    unsub();
  });

  it('8. Enforces strict tenant isolation between restaurants', async () => {
    mockSetDoc.mockResolvedValue(undefined);

    await saveRestaurantSettings(
      {
        name: { hy: 'Տենանտ Ա', ru: 'Тенант А', en: 'Tenant A' },
        defaultLanguage: 'hy',
        supportedLanguages: ['hy', 'ru', 'en'],
        branding: { logoUrl: 'https://example.com/a.svg' },
        contact: {},
      },
      'xutorok'
    );

    await saveRestaurantSettings(
      {
        name: { hy: 'Տենանտ Բ', ru: 'Тенант Б', en: 'Tenant B' },
        defaultLanguage: 'en',
        supportedLanguages: ['en'],
        branding: { logoUrl: 'https://example.com/b.svg' },
        contact: {},
      },
      'other-bistro'
    );

    expect(getCachedRestaurantProfile('xutorok')?.name.en).toBe('Tenant A');
    expect(getCachedRestaurantProfile('xutorok')?.branding?.logoUrl).toBe(
      'https://example.com/a.svg'
    );
    expect(getCachedRestaurantProfile('other-bistro')?.name.en).toBe('Tenant B');
    expect(getCachedRestaurantProfile('other-bistro')?.branding?.logoUrl).toBe(
      'https://example.com/b.svg'
    );
  });
});
