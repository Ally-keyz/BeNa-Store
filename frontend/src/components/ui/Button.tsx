import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'header';

export interface ButtonVariantOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

/** Class builder shared by <Button>, <Link> and <a> so all CTAs match. */
export function buttonVariants({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
}: ButtonVariantOptions = {}): string {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-full font-medium',
    'transition-colors duration-200 ease-out',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark',
    'disabled:pointer-events-none disabled:opacity-50',
    variant === 'primary' && 'bg-brand text-on-brand hover:bg-brand-dark',
    variant === 'secondary' &&
      'border border-brand bg-surface text-terra-800 hover:bg-terra-50',
    variant === 'ghost' && 'text-ink hover:bg-terra-50',
    size === 'sm' && 'h-9 px-4 text-[13px]',
    size === 'md' && 'h-11 px-5 text-sm',
    size === 'lg' && 'h-12 px-7 text-[15px]',
    size === 'header' && 'h-10 px-5 text-sm',
    fullWidth && 'w-full',
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariantOptions {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, fullWidth, loading = false, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
});
