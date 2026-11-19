import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { BRAND } from '@/config';

/**
 * The supplied logo is shown untouched on a white background.
 * Its own wording ("BeNa SheGrows Coffee") differs from the store name
 * ("BeNa Origins"); the naming decision is flagged in the deliverables.
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label={`${BRAND.name} — home`}
      className={cn('inline-flex items-center rounded-sm', className)}
    >
      <img
        src="/logo.webp"
        alt=""
        width={37}
        height={40}
        className="h-9 w-auto sm:h-10"
        loading="eager"
      />
    </Link>
  );
}
