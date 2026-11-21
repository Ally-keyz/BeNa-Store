import { cn } from '@/lib/cn';

const FRAME = 'inline-flex shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/10';

/** Small vector flags so the active language is recognisable at a glance. */
export function FlagIcon({ code, className }: { code: string; className?: string }) {
  if (code === 'de') {
    return (
      <span className={cn(FRAME, 'h-3.5 w-5', className)} aria-hidden="true">
        <svg viewBox="0 0 30 20" className="h-full w-full" focusable="false">
          <rect width="30" height="6.67" fill="#000000" />
          <rect y="6.67" width="30" height="6.67" fill="#DD0000" />
          <rect y="13.34" width="30" height="6.66" fill="#FFCE00" />
        </svg>
      </span>
    );
  }

  if (code === 'fr') {
    return (
      <span className={cn(FRAME, 'h-3.5 w-5', className)} aria-hidden="true">
        <svg viewBox="0 0 30 20" className="h-full w-full" focusable="false">
          <rect width="10" height="20" fill="#002395" />
          <rect x="10" width="10" height="20" fill="#FFFFFF" />
          <rect x="20" width="10" height="20" fill="#ED2939" />
        </svg>
      </span>
    );
  }

  return (
    <span className={cn(FRAME, 'h-3.5 w-5', className)} aria-hidden="true">
      <svg viewBox="0 0 60 30" className="h-full w-full" focusable="false">
        <rect width="60" height="30" fill="#012169" />
        <path d="M0 0 L60 30 M60 0 L0 30" stroke="#FFFFFF" strokeWidth="6" />
        <path d="M0 0 L60 30 M60 0 L0 30" stroke="#C8102E" strokeWidth="2" />
        <path d="M30 0 V30 M0 15 H60" stroke="#FFFFFF" strokeWidth="10" />
        <path d="M30 0 V30 M0 15 H60" stroke="#C8102E" strokeWidth="6" />
      </svg>
    </span>
  );
}
