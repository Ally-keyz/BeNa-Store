import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { id, label, hint, error, className, containerClassName, rows = 5, ...rest },
  ref,
) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const hintId = hint ? `${textareaId}-hint` : undefined;
  const errorId = error ? `${textareaId}-error` : undefined;
  const describedBy = [hint && !error ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cn('w-full', containerClassName)}>
      <label htmlFor={textareaId} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          'w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-ink placeholder:text-neutral-500',
          'transition-colors duration-200 focus-visible:border-brand focus-visible:outline-none',
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
