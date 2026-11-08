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
  variant = 'light',
}: {
  allowedLanguages?: readonly Language[];
  variant?: 'light' | 'dark';
}) {
  const { i18n, t } = useTranslation();
  const currentLang = (i18n.language?.slice(0, 2) as Language) || appConfig.defaultLanguage;

  const isDark = variant === 'dark';

  return (
    <div
      role="group"
      aria-label="Language selector"
      className={`inline-flex shrink-0 items-center rounded-xl p-1 transition-colors ${
        isDark
          ? 'border border-[#4A2C16] bg-[#3D261A]'
          : 'border border-app-border bg-app-bg'
      }`}
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
            className={`min-w-[2.2rem] rounded-lg px-2.5 py-1 text-xs font-semibold tracking-wide transition-colors ${
              isActive
                ? isDark
                  ? 'bg-[#C8A77A] text-[#2F1E14] font-bold shadow-xs'
                  : 'bg-brand-primary text-white shadow-xs'
                : isDark
                  ? 'text-[#C8B9AD] hover:bg-[#4A2C16] hover:text-[#F4EEE8]'
                  : 'text-app-text-secondary hover:bg-app-surface-muted hover:text-app-text'
            }`}
          >
            {LANGUAGE_LABELS[lang]}
          </button>
        );
      })}
    </div>
  );
}
