import { cn } from '@/lib/cn';

export interface PlaceholderImageProps {
  label?: string;
  className?: string;
}

/**
 * Clearly marked stand-in for photography the owner still has to supply.
 * Deliberately abstract and brand-toned; no gradients, no stock imagery.
 */
export function PlaceholderImage({ label, className }: PlaceholderImageProps) {
  return (
    <div
      role="img"
      aria-label={label ?? 'Image placeholder'}
      className={cn(
        'relative flex h-full w-full items-center justify-center overflow-hidden bg-chocolate-50',
        className,
      )}
    >
      <svg
        viewBox="0 0 400 500"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      >
        <rect width="400" height="500" fill="#F7F1ED" />
        <circle cx="200" cy="230" r="150" fill="none" stroke="#DBCBC0" strokeWidth="1.5" />
        <circle cx="200" cy="230" r="108" fill="none" stroke="#DBCBC0" strokeWidth="1" />
        <path
          d="M116 308 C 158 246, 242 246, 284 308"
          fill="none"
          stroke="#C9B4A8"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M200 176 C 214 196, 214 232, 200 252 C 186 232, 186 196, 200 176 Z"
          fill="#4A2C1D"
          opacity="0.16"
        />
        <ellipse cx="200" cy="214" rx="56" ry="6" fill="#4A2C1D" opacity="0.08" />
      </svg>
      {label ? (
        <span className="absolute bottom-4 left-4 text-[10px] font-medium uppercase tracking-[0.16em] text-chocolate-500">
          {label}
        </span>
      ) : null}
    </div>
  );
}
