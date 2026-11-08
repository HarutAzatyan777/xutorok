import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { appConfig } from '../../config/app';
import { setAppLanguage } from '../../i18n';
import type { Language } from '../../types';

const LANGUAGE_ACCESSIBLE_LABELS: Record<Language, string> = {
  hy: 'Հայերեն (Armenian)',
  ru: 'Русский (Russian)',
  en: 'English',
};

function FlagIcon({ lang }: { lang: Language }) {
  if (lang === 'hy') {
    // 🇦🇲 Flag of Armenia
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 22 16"
        className="h-4 w-[22px] shrink-0 rounded-[3px] shadow-2xs ring-1 ring-black/10"
      >
        <rect width="22" height="5.33" y="0" fill="#D90012" />
        <rect width="22" height="5.34" y="5.33" fill="#0033A0" />
        <rect width="22" height="5.33" y="10.67" fill="#F2A800" />
      </svg>
    );
  }

  if (lang === 'ru') {
    // 🇷🇺 Flag of Russia
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 22 16"
        className="h-4 w-[22px] shrink-0 rounded-[3px] shadow-2xs ring-1 ring-black/10"
      >
        <rect width="22" height="5.33" y="0" fill="#FFFFFF" />
        <rect width="22" height="5.34" y="5.33" fill="#0039A6" />
        <rect width="22" height="5.33" y="10.67" fill="#D52B1E" />
      </svg>
    );
  }

  // 🇬🇧 Flag of the United Kingdom (English)
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 22 16"
      className="h-4 w-[22px] shrink-0 rounded-[3px] shadow-2xs ring-1 ring-black/10"
    >
      <rect width="22" height="16" fill="#012169" />
      <path
        d="M0,0 L22,16 M22,0 L0,16"
        stroke="#FFFFFF"
        strokeWidth="3.2"
      />
      <path
        d="M0,0 L22,16 M22,0 L0,16"
        stroke="#C8102E"
        strokeWidth="1.6"
      />
      <path
        d="M11,0 V16 M0,8 H22"
        stroke="#FFFFFF"
        strokeWidth="5"
      />
      <path
        d="M11,0 V16 M0,8 H22"
        stroke="#C8102E"
        strokeWidth="3"
      />
    </svg>
  );
}

export function LanguageSwitcher({
  allowedLanguages = appConfig.supportedLanguages,
}: {
  allowedLanguages?: readonly Language[];
  variant?: 'light' | 'dark';
}) {
  const { i18n } = useTranslation();
  const currentLang =
    (i18n.language?.slice(0, 2) as Language) || appConfig.defaultLanguage;

  const languages =
    allowedLanguages.length > 0 ? allowedLanguages : appConfig.supportedLanguages;

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  const focusOptionAt = (index: number) => {
    const clamped = ((index % languages.length) + languages.length) % languages.length;
    optionRefs.current[clamped]?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const activeIdx = Math.max(0, languages.indexOf(currentLang));
      setIsOpen(true);
      window.requestAnimationFrame(() => {
        focusOptionAt(
          event.key === 'ArrowUp' ? languages.length - 1 : activeIdx
        );
      });
    }
  };

  const handleMenuKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    currentIndex: number
  ) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusOptionAt(currentIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusOptionAt(currentIndex - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusOptionAt(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusOptionAt(languages.length - 1);
    }
  };

  const handleSelectLanguage = (lang: Language, fromKeyboard: boolean) => {
    setAppLanguage(lang);
    setIsOpen(false);
    if (fromKeyboard) {
      triggerRef.current?.focus();
    }
  };

  return (
    <div
      ref={containerRef}
      data-testid="language-switcher"
      className="relative inline-flex shrink-0"
    >
      <button
        ref={triggerRef}
        type="button"
        data-testid="language-switcher-trigger"
        aria-label={`Language selector: ${LANGUAGE_ACCESSIBLE_LABELS[currentLang]}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#5B3A29] bg-[#452B1E] px-3 text-[#F8F1E9] shadow-xs transition-all duration-150 ease-out hover:border-[#C5A47A]/60 hover:bg-[#523425] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5A47A]"
      >
        <FlagIcon lang={currentLang} />
        <ChevronDown
          aria-hidden="true"
          className={`h-3.5 w-3.5 text-[#C5A47A] transition-transform duration-150 ease-out ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>

      <div
        id={menuId}
        role="menu"
        aria-label="Language options"
        data-testid="language-switcher-menu"
        hidden={!isOpen}
        className={`absolute right-0 top-[calc(100%+0.4rem)] z-50 flex flex-col gap-1 rounded-2xl border border-[#E6DACB] bg-[#FFF9F2] p-1.5 shadow-lg transition-all duration-150 ease-out origin-top-right ${
          isOpen
            ? 'pointer-events-auto scale-100 opacity-100'
            : 'pointer-events-none scale-95 opacity-0'
        }`}
      >
        {languages.map((lang, idx) => {
          const isActive = currentLang === lang;
          return (
            <button
              key={lang}
              ref={(el) => {
                optionRefs.current[idx] = el;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={isActive}
              aria-label={LANGUAGE_ACCESSIBLE_LABELS[lang]}
              data-testid={`language-option-${lang}`}
              onClick={(e) => handleSelectLanguage(lang, e.detail === 0)}
              onKeyDown={(e) => handleMenuKeyDown(e, idx)}
              className={`flex h-9 w-11 items-center justify-center rounded-xl transition-all duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#6D4029] ${
                isActive
                  ? 'bg-[#452B1E]/12 ring-1 ring-[#C5A47A]'
                  : 'hover:bg-[#452B1E]/6'
              }`}
            >
              <FlagIcon lang={lang} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
