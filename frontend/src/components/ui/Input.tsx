import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
  /** Visually hide the label while keeping it available to screen readers. */
  hideLabel?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, label, hint, error, className, containerClassName, hideLabel = false, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hint && !error ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cn('w-full', containerClassName)}>
      <label
        htmlFor={inputId}
        className={hideLabel ? 'sr-only' : 'mb-1.5 block text-sm font-medium text-ink'}
      >
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          'h-11 w-full rounded-xl border bg-surface px-4 text-[15px] text-ink transition-colors duration-200',
          'placeholder:text-neutral-500',
          'focus-visible:border-brand focus-visible:outline-none',
          error ? 'border-terra-700' : 'border-terra-200',
          className,
        )}
        {...rest}
      />
      {hint && !error ? (
        <p id={hintId} className="mt-1.5 text-[13px] text-neutral-600">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1.5 text-[13px] font-medium text-terra-700">
          {error}
        </p>
      ) : null}
    </div>
  );
});
