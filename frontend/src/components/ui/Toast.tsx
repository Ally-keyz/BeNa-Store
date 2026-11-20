import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { buttonVariants } from './Button';

export type ToastVariant = 'default' | 'success' | 'error';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
  action?: ToastAction;
}

interface ToastItem extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const iconFor = (variant: ToastVariant) => {
  if (variant === 'success') return CheckCircle2;
  if (variant === 'error') return AlertCircle;
  return Info;
};

/**
 * App-wide toast queue. Toasts drop in from the top centre so confirmations
 * (especially "added to cart") are visible without covering the page action.
 * The live region is polite so screen readers announce updates.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
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
        className="pointer-events-none fixed inset-x-0 top-[calc(0.75rem_+_env(safe-area-inset-top))] z-[100] flex flex-col items-center gap-2 px-3 sm:top-[calc(1.25rem_+_env(safe-area-inset-top))]"
      >
        {items.map((item) => {
          const variant = item.variant ?? 'default';
          const Icon = iconFor(variant);
          const duration = item.durationMs ?? 4500;

          return (
            <div
              key={item.id}
              role="status"
                className="animate-toast-in pointer-events-auto relative flex w-full max-w-md items-start gap-3 overflow-hidden rounded-2xl border border-neutral-200/80 bg-surface/95 p-3.5 pr-12 shadow-[0_24px_70px_-24px_rgba(13,11,10,0.55)] backdrop-blur-xl"
            >
              <span
                className={cn(
                  'mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                  variant === 'error'
                    ? 'bg-terra-100 text-terra-700'
                    : 'bg-terra-50 text-terra-700',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-5 text-ink">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-[13px] leading-5 text-neutral-600">
                    {item.description}
                  </p>
                ) : null}
                {item.action ? (
                  <button
                    type="button"
                    onClick={() => {
                      dismiss(item.id);
                      item.action?.onClick();
                    }}
                    className={cn(
                      buttonVariants({ size: 'sm' }),
                      'mt-2.5 h-8 rounded-full px-3.5 text-[12.5px]',
                    )}
                  >
                    {item.action.label}
                  </button>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="absolute right-0.5 top-0.5 inline-flex h-11 w-11 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-terra-50 hover:text-ink"
                aria-label={t('common.close')}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>

              <span
                aria-hidden="true"
                className="animate-toast-progress absolute inset-x-0 bottom-0 h-0.5 origin-left bg-brand/80"
                style={{ animationDuration: `${duration}ms` }}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
