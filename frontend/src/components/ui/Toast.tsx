import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastVariant = 'default' | 'success' | 'error';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const iconFor = (variant: ToastVariant) => {
  if (variant === 'success') return <CheckCircle2 className="h-4 w-4 text-terra-700" aria-hidden="true" />;
  if (variant === 'error') return <AlertCircle className="h-4 w-4 text-terra-700" aria-hidden="true" />;
  return <Info className="h-4 w-4 text-terra-700" aria-hidden="true" />;
};

/** App-wide toast queue. The live region is polite so screen readers announce updates. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = (idRef.current += 1);
      setItems((previous) => [...previous, { ...options, id }]);
      window.setTimeout(() => dismiss(id), options.durationMs ?? 4500);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="animate-dialog-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-terra-100 bg-white p-4"
          >
            <span className="mt-0.5">{iconFor(item.variant ?? 'default')}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{item.title}</p>
              {item.description ? (
                <p className="mt-0.5 text-[13px] leading-5 text-neutral-600">{item.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="-m-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-neutral-500 hover:bg-terra-50 hover:text-ink"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
