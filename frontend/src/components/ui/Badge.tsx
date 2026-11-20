import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'sale' | 'soon' | 'soldout' | 'outline';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-terra-100 text-terra-900',
  sale: 'bg-brand text-on-brand',
  soon: 'border border-terra-200 bg-surface text-terra-900',
  soldout: 'bg-neutral-100 text-neutral-700',
  outline: 'border border-terra-200 text-terra-900',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

/** Small pill badge — 24px tall, 11px text, used for Sale/Coming soon/Sold out. */
export function Badge({ tone = 'neutral', className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex min-h-6 max-w-full items-center rounded-full px-2.5 py-0.5 text-left text-[11px] font-medium tracking-wide',
        tones[tone],
        className,
      )}
      {...rest}
    >
      <span className="min-w-0 break-words">{children}</span>
    </span>
  );
}
