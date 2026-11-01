import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { appConfig } from '../config/app';
import type { Language } from '../types';
import en from './locales/en.json';
import hy from './locales/hy.json';
import ru from './locales/ru.json';

export const LANGUAGE_STORAGE_KEY = 'xutorok_lang';

export function getSavedUserLanguage(): Language | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
    if (saved && appConfig.supportedLanguages.includes(saved)) {
      return saved;
    }
  } catch {
    // Ignore storage access errors in private browsing
  }
  return null;
}

function getInitialLanguage(): Language {
  return getSavedUserLanguage() ?? appConfig.defaultLanguage;
}

const initialLanguage = getInitialLanguage();

void i18n.use(initReactI18next).init({
  resources: {
    hy: { translation: hy },
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: initialLanguage,
  fallbackLng: 'hy',
  interpolation: {
    escapeValue: false,
  },
});

if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLanguage;
}

export function setAppLanguage(lang: Language): void {
  if (!appConfig.supportedLanguages.includes(lang)) return;
  void i18n.changeLanguage(lang);
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // Ignore storage errors
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
  }
}

/**
 * Synchronizes active language with authoritative restaurant settings from Firestore
 * when the visitor has not explicitly stored a valid language preference.
 */
export function syncLanguageWithSettings(
  defaultLanguage: Language,
  supportedLanguages: readonly Language[]
): void {
  const validSupported =
    supportedLanguages.length > 0 ? supportedLanguages : appConfig.supportedLanguages;
  const saved = getSavedUserLanguage();

  if (saved && validSupported.includes(saved)) {
    return;
  }

  const targetLang = validSupported.includes(defaultLanguage)
    ? defaultLanguage
    : validSupported[0] ?? appConfig.defaultLanguage;

  const currentLang = (i18n.language?.slice(0, 2) as Language) || appConfig.defaultLanguage;
  if (currentLang !== targetLang) {
    void i18n.changeLanguage(targetLang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = targetLang;
    }
  }
}

export default i18n;
