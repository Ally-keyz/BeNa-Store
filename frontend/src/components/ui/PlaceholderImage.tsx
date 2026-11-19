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
        'relative flex h-full w-full items-center justify-center overflow-hidden bg-terra-50',
        className,
      )}
    >
      <svg
        viewBox="0 0 400 500"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      >
        <rect width="400" height="500" fill="#FFF7F2" />
        <circle cx="200" cy="230" r="150" fill="none" stroke="#FFD2B8" strokeWidth="1.5" />
        <circle cx="200" cy="230" r="108" fill="none" stroke="#FFD2B8" strokeWidth="1" />
        <path
          d="M116 308 C 158 246, 242 246, 284 308"
          fill="none"
          stroke="#FF905C"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M200 176 C 214 196, 214 232, 200 252 C 186 232, 186 196, 200 176 Z"
          fill="#ff7034"
          opacity="0.22"
        />
        <ellipse cx="200" cy="214" rx="56" ry="6" fill="#ff7034" opacity="0.12" />
      </svg>
      {label ? (
        <span className="absolute bottom-4 left-4 text-[10px] font-medium uppercase tracking-[0.16em] text-terra-700">
          {label}
        </span>
      ) : null}
    </div>
  );
}
