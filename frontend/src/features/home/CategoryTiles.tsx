import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight } from 'lucide-react';
import type { CollectionSummary } from '@/types';
import { cn } from '@/lib/cn';
import { pageContainer, sectionSpacing } from '@/lib/layout';
import { useCollections } from '@/hooks/useCatalog';
import { useMarket } from '@/context/MarketContext';
import { ProductImage } from '@/components/ui/ProductImage';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Skeleton } from '@/components/ui/Skeleton';

const FALLBACK = [
  { handle: 'coffee', titleKey: 'nav.coffee', bodyKey: 'home.categoriesCoffeeBody' },
  { handle: 'food', titleKey: 'nav.food', bodyKey: 'home.categoriesFoodBody' },
  { handle: 'crafts', titleKey: 'nav.crafts', bodyKey: 'home.categoriesCraftsBody' },
] as const;

interface Tile {
  handle: string;
  title: string;
  body: string;
  collection: CollectionSummary | null;
}

function TileCard({ tile }: { tile: Tile }) {
  const { t } = useTranslation();
  const image = tile.collection?.image ?? null;
  const alt = image?.altText?.trim() || tile.title;

  return (
    <Link
      to={`/collections/${tile.handle}`}
      className="group flex w-[78%] shrink-0 snap-start flex-col sm:w-auto"
    >
      <div className="relative overflow-hidden rounded-card bg-chocolate-50">
        <div className="aspect-[4/3] w-full overflow-hidden">
          <ProductImage
            image={image}
            alt={alt}
            sizes="(min-width: 640px) 33vw, 78vw"
            className="transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            placeholderLabel={t('hero.placeholderLabel')}
          />
        </div>
        <span
          aria-hidden="true"
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-chocolate-900 transition-transform duration-300 group-hover:-translate-y-0.5"
        >
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
      <div className="flex flex-1 items-start justify-between gap-3 pt-3.5">
        <div>
          <h3 className="text-[15px] font-medium text-ink sm:text-base">{tile.title}</h3>
          <p className="mt-1 text-[13px] leading-5 text-neutral-600">{tile.body}</p>
        </div>
      </div>
    </Link>
  );
}

export function CategoryTiles() {
  const { t } = useTranslation();
  const { marketParams } = useMarket();
  const query = useCollections({ first: 20, ...marketParams });

  const byHandle = new Map((query.data?.items ?? []).map((item) => [item.handle, item]));
  const tiles: Tile[] = FALLBACK.map((fallback) => {
    const collection = byHandle.get(fallback.handle) ?? null;
    return {
      handle: fallback.handle,
      title: collection?.title || t(fallback.titleKey),
      body: collection?.description?.trim() || t(fallback.bodyKey),
      collection,
    };
  });

  return (
    <section className={cn(sectionSpacing, 'pt-10 sm:pt-12 lg:pt-14')} aria-labelledby="home-categories">
      <div className={pageContainer}>
        <SectionHeading
          eyebrow={t('home.categoriesEyebrow')}
          title={<span id="home-categories">{t('home.categoriesHeading')}</span>}
        />

        {query.isLoading ? (
          <div className="mt-7 grid gap-5 sm:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item}>
                <Skeleton className="aspect-[4/3] w-full rounded-card" />
                <Skeleton className="mt-3 h-4 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="-mx-4 mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
            {tiles.map((tile) => (
              <TileCard key={tile.handle} tile={tile} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
