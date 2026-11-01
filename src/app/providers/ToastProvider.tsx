import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastMessage, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { ...toast, id }]);
      window.setTimeout(() => {
        dismissToast(id);
      }, 4500);
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0 pointer-events-none"
      >
        {toasts.map((toast) => {
          const isError = toast.variant === 'error';
          const isSuccess = toast.variant === 'success';
          return (
            <div
              key={toast.id}
              role={isError ? 'alert' : 'status'}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-lg transition-all ${
                isError
                  ? 'border-red-200 bg-red-50 text-red-950'
                  : isSuccess
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                  : 'border-stone-200 bg-white text-stone-900'
              }`}
            >
              {isSuccess && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />}
              {isError && <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />}
              {!isSuccess && !isError && (
                <Info className="h-5 w-5 shrink-0 text-stone-600 mt-0.5" />
              )}
              <div className="flex-1 text-sm">
                <p className="font-semibold">{toast.title}</p>
                {toast.description && (
                  <p className="mt-1 text-xs opacity-90 leading-relaxed">{toast.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Close notification"
                className="rounded-lg p-1 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-stone-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

