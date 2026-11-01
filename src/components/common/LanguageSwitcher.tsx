import { useTranslation } from 'react-i18next';
import { appConfig } from '../../config/app';
import { setAppLanguage } from '../../i18n';
import type { Language } from '../../types';

const LANGUAGE_LABELS: Record<Language, string> = {
  hy: 'HY',
  ru: 'RU',
  en: 'EN',
};

export function LanguageSwitcher({
  allowedLanguages = appConfig.supportedLanguages,
}: {
  allowedLanguages?: readonly Language[];
}) {
  const { i18n, t } = useTranslation();
  const currentLang = (i18n.language?.slice(0, 2) as Language) || appConfig.defaultLanguage;

  return (
    <div
      role="group"
      aria-label="Language selector"
      className="inline-flex items-center rounded-xl border border-stone-200 bg-stone-100/80 p-1"
    >
      {allowedLanguages.map((lang) => {
        const isActive = currentLang === lang;
        return (
          <button
            key={lang}
            type="button"
            onClick={() => setAppLanguage(lang)}
            aria-pressed={isActive}
            title={t(`languages.${lang}Full`)}
            className={`min-w-[2.5rem] rounded-lg px-2.5 py-1.5 text-xs font-semibold tracking-wide transition-all ${
              isActive
                ? 'bg-amber-900 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-200/70 hover:text-stone-900'
            }`}
          >
            {LANGUAGE_LABELS[lang]}
          </button>
        );
      })}
    </div>
  );
}

