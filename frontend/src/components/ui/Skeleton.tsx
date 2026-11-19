import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** Loading placeholder. Match the final element's dimensions to avoid CLS. */
export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-xl bg-terra-50', className)}
      {...rest}
    />
  );
}
