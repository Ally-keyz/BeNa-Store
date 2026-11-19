import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  body?: string;
  action?: ReactNode;
  as?: 'h1' | 'h2';
  className?: string;
}

/** Shared section intro: uppercase eyebrow, display heading, optional action. */
export function SectionHeading({
  eyebrow,
  title,
  body,
  action,
  as: Heading = 'h2',
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-chocolate-600">
            {eyebrow}
          </p>
        ) : null}
        <Heading className="mt-2 text-[clamp(24px,2.4vw,32px)] font-semibold tracking-tight">
          {title}
        </Heading>
        {body ? <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-600">{body}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
