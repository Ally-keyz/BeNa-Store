import { useCallback, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  closeLabel?: string;
}

/** Accessible modal dialog: focus trap, Esc to close, restore focus. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  closeLabel = 'Close',
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const stableClose = useCallback(() => onCloseRef.current(), []);

  useFocusTrap(panelRef, open, stableClose);
  useLockBodyScroll(open);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
      <div
        className="animate-fade-in absolute inset-0 bg-ink/40"
        onClick={stableClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'animate-dialog-in relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 sm:p-8',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold sm:text-xl">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm text-neutral-600">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={stableClose}
            className="-m-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 hover:bg-terra-50 hover:text-ink"
            aria-label={closeLabel}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
        {footer ? (
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
