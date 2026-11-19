import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  description?: ReactNode;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { id, label, description, error, className, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className={cn('w-full', className)}>
      <label
        htmlFor={inputId}
        className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg py-1.5 text-sm text-ink"
      >
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-terra-300 accent-brand"
          {...rest}
        />
        <span className="flex-1">
          <span className="block leading-6">{label}</span>
          {description ? (
            <span id={descriptionId} className="mt-0.5 block text-[13px] leading-5 text-neutral-600">
              {description}
            </span>
          ) : null}
        </span>
      </label>
      {error ? (
        <p id={errorId} className="mt-1 text-[13px] font-medium text-terra-700">
          {error}
        </p>
      ) : null}
    </div>
  );
});
