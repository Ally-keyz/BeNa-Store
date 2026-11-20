import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

export interface ErrorStateProps {
  title: string;
  body?: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}

/** Consistent, low-emphasis error panel used by data-backed routes. */
export function ErrorState({ title, body, retryLabel, onRetry, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-card border border-terra-100 bg-terra-50/70 p-4 sm:p-8',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-terra-700" aria-hidden="true" />
        <div className="min-w-0 break-words">
          <p className="font-medium text-ink">{title}</p>
          {body ? <p className="mt-1 break-words text-sm text-neutral-600">{body}</p> : null}
          {retryLabel && onRetry ? (
            <Button
              variant="secondary"
              size="sm"
              className="mt-4 min-h-11 max-w-full break-words sm:min-h-9"
              onClick={onRetry}
            >
              {retryLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
