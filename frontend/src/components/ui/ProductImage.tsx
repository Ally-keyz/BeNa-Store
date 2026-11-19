import { useState } from 'react';
import type { ProductImage as ProductImageModel } from '@/types';
import { cn } from '@/lib/cn';
import { PlaceholderImage } from '@/components/ui/PlaceholderImage';

/** Add responsive width variants for Shopify CDN images. */
function shopifySrcSet(url: string): string | undefined {
  if (!url.includes('cdn.shopify.com')) return undefined;
  const separator = url.includes('?') ? '&' : '?';
  return [320, 480, 640, 800, 960, 1200]
    .map((width) => `${url}${separator}width=${width} ${width}w`)
    .join(', ');
}

export interface ProductImageProps {
  image: ProductImageModel | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  placeholderLabel?: string;
}

/**
 * Responsive product image with a graceful placeholder fallback.
 * Images coming from the API's mock fixtures are labelled as such.
 */
export function ProductImage({
  image,
  alt,
  className,
  sizes = '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw',
  priority = false,
  placeholderLabel,
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const url = image?.url;
  const isFixture = Boolean(url?.includes('fixtures.invalid'));

  if (!url || failed || isFixture) {
    return (
      <PlaceholderImage
        label={isFixture ? 'Mock image' : placeholderLabel}
        className={className}
      />
    );
  }

  return (
    <img
      src={url}
      srcSet={shopifySrcSet(url)}
      sizes={sizes}
      alt={alt}
      width={image?.width ?? 800}
      height={image?.height ?? 1000}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn('h-full w-full object-cover', className)}
    />
  );
}
