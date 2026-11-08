import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ThemeContext,
  THEME_STORAGE_KEY,
  type AppTheme,
} from './themeContext';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlTheme = searchParams.get('theme')?.toLowerCase();
  const validUrlTheme: AppTheme | null =
    urlTheme === 'light' || urlTheme === 'dark' ? urlTheme : null;

  // Initialize theme: URL param > localStorage > default to 'dark'
  const [theme, setThemeState] = useState<AppTheme>(() => {
    if (validUrlTheme) {
      return validUrlTheme;
    }
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    }
    return 'dark'; // Dark hero & dark restaurant vibe by default
  });

  // Sync theme changes to URL search params and localStorage
  const setTheme = useCallback(
    (newTheme: AppTheme) => {
      setThemeState(newTheme);
      if (typeof window !== 'undefined') {
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      }
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('theme', newTheme);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const toggleTheme = useCallback(() => {
    const nextTheme = (theme === 'dark' ? 'light' : 'dark') as AppTheme;
    setTheme(nextTheme);
  }, [setTheme, theme]);

  // Apply dark or light class to html document element for styling
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
