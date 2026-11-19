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
    <nav aria-label={label} className={cn('text-[13px] text-neutral-600', className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? (
                <span aria-hidden="true" className="text-neutral-400">
                  /
                </span>
              ) : null}
              {item.href && !isLast ? (
                <Link to={item.href} className="rounded-sm hover:text-ink hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined} className={isLast ? 'text-ink' : undefined}>
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
