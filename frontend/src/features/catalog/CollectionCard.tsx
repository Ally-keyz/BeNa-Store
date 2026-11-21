import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight } from 'lucide-react';
import type { CollectionSummary } from '@/types';
import { stripHtml } from '@/lib/sanitize';
import { ProductImage } from '@/components/ui/ProductImage';

export interface CollectionCardProps {
  collection: CollectionSummary;
  priority?: boolean;
}

/** Collection tile used on the collection index and African-products landing page. */
export function CollectionCard({ collection, priority = false }: CollectionCardProps) {
  const { t } = useTranslation();
  const description = stripHtml(collection.description);

  return (
    <Link
      to={`/collections/${collection.handle}`}
      className="group block rounded-card focus-visible:outline-offset-4"
      aria-label={`${collection.title} — ${t('collections.viewCollection')}`}
    >
      <div className="aspect-square overflow-hidden rounded-card bg-terra-50">
        <ProductImage
          image={collection.image}
          alt={collection.title}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          priority={priority}
          className="transition-transform duration-300 group-hover:scale-[1.02]"
          placeholderLabel={t('hero.placeholderLabel')}
        />
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-[15px] font-medium text-ink">{collection.title}</h3>
          {description ? (
            <p className="mt-1 line-clamp-2 break-words text-[13px] leading-5 text-neutral-600">{description}</p>
          ) : null}
        </div>
        <ArrowUpRight
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-terra-700 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  );
}
