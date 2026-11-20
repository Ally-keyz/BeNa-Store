import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { BRAND } from '@/config';
import logoUrl from '@/assets/logo_new.png';

/**
 * The current logo is shown untouched on a white background.
 * Its artwork wording may differ from the store name ("BeNa Origins");
 * the naming decision is flagged in the deliverables.
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label={`${BRAND.name} — home`}
      className={cn('inline-flex items-center rounded-sm', className)}
    >
      <img
        src={logoUrl}
        alt=""
        width={40}
        height={40}
        className="h-9 w-9 object-contain sm:h-10 sm:w-10"
        loading="eager"
      />
    </Link>
  );
}
