import { useCallback, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: 'left' | 'right';
  className?: string;
  closeLabel?: string;
}

/** Right/left slide-over panel, 420px wide on desktop, full width on mobile. */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  side = 'right',
  className,
  closeLabel = 'Close',
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const stableClose = useCallback(() => onCloseRef.current(), []);

  useFocusTrap(panelRef, open, stableClose);
  useLockBodyScroll(open);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className={cn('fixed inset-0 z-[90]', side === 'right' ? 'flex justify-end' : 'flex justify-start')}>
      <div
        className="animate-fade-in absolute inset-0 bg-night/50"
        onClick={stableClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative z-10 flex h-full w-full max-w-[420px] flex-col bg-surface pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]',
          side === 'right' ? 'animate-drawer-in-right' : 'animate-drawer-in-left',
          className,
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-terra-100 px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={stableClose}
            className="-m-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-neutral-600 hover:bg-terra-50 hover:text-ink"
            aria-label={closeLabel}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <div className="border-t border-terra-100 px-5 py-4">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
