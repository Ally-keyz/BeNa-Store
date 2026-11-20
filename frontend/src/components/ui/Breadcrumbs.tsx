import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  label?: string;
  className?: string;
}

export function Breadcrumbs({ items, label = 'Breadcrumb', className }: BreadcrumbsProps) {
  return (
    <nav
      aria-label={label}
      className={cn(
        'text-[13px] text-neutral-600',
        '[&+*]:!pt-4 sm:[&+*]:!pt-6',
        className,
      )}
    >
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {index > 0 ? (
                <span aria-hidden="true" className="text-neutral-400">
                  /
                </span>
              ) : null}
              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  className="inline-flex min-h-11 items-center rounded-sm break-words hover:text-ink hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={cn('inline-flex min-h-11 items-center break-words', isLast && 'text-ink')}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
