import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { appConfig } from '../config/app';
import type { Language } from '../types';
import en from './locales/en.json';
import hy from './locales/hy.json';
import ru from './locales/ru.json';

export const LANGUAGE_STORAGE_KEY = 'xutorok_lang';

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') {
    return appConfig.defaultLanguage;
  }
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
    if (saved && appConfig.supportedLanguages.includes(saved)) {
      return saved;
    }
  } catch {
    // Ignore storage access errors in private browsing
  }
  return appConfig.defaultLanguage;
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

export default i18n;

