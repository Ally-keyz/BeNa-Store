import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { money, productFixture } from '@/test/fixtures';
import { ProductCard } from './ProductCard';

vi.mock('@/context/MarketContext', () => ({
  useMarket: () => ({ country: 'DE', formatLocale: 'en-IE' }),
}));
vi.mock('@/context/CartContext', () => ({ useCart: () => ({ addItem: vi.fn() }) }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

function pricedProduct(handle: string, title: string, amount: string) {
  const base = productFixture({ handle, title });
  return {
    ...base,
    priceRange: { minVariantPrice: money(amount), maxVariantPrice: money(amount) },
    variants: [{ ...base.variants[0]!, price: money(amount) }],
  };
}

describe('ProductCard price per kg', () => {
  it('does not derive a per-kg price from a pack price', () => {
    const { rerender } = render(
      <MemoryRouter>
        <ProductCard
          product={pricedProduct(
            'premium-rwandan-arabica-coffee-freshly-roasted-250g',
            'Premium Rwandan Arabica Coffee 250g',
            '10.99',
          )}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/\/kg/)).toBeNull();

    rerender(
      <MemoryRouter>
        <ProductCard
          product={pricedProduct('ifu-y-indagara-200g', 'Ifu Y’Indagara 200g', '12.00')}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/\/kg/)).toBeNull();
  });

  it('shows the Shopify unit price when it is available', () => {
    const base = pricedProduct('indagara-200g', 'Indagara Z’Indundi 200g', '12.00');
    const withUnitPrice = {
      ...base,
      variants: [
        {
          ...base.variants[0]!,
          unitPrice: money('60.00'),
          unitPriceMeasurement: {
            measuredType: 'WEIGHT',
            quantityUnit: 'G',
            quantityValue: 200,
            referenceUnit: 'KG',
            referenceValue: 1,
          },
        },
      ],
    };

    render(
      <MemoryRouter>
        <ProductCard product={withUnitPrice} />
      </MemoryRouter>,
    );

    expect(screen.getByText('€60.00 / kg')).toBeInTheDocument();
  });
});

describe('ProductCard stock labels', () => {
  it('shows the exact quantity left instead of coming soon when stock exists', () => {
    const base = productFixture({ title: 'Hand Craft Igiseke (Coming Soon)' });
    const inStock = {
      ...base,
      variants: [
        {
          ...base.variants[0]!,
          quantityAvailable: 2,
          availableForSale: true,
        },
      ],
    };

    render(
      <MemoryRouter>
        <ProductCard product={inStock} />
      </MemoryRouter>,
    );

    expect(screen.getByText('2 left')).toBeInTheDocument();
    expect(screen.queryByText('Coming soon')).toBeNull();
    expect(screen.queryByText('Sold out')).toBeNull();
  });

  it('shows sold out only when there is zero stock', () => {
    const base = productFixture();
    const empty = {
      ...base,
      variants: [
        {
          ...base.variants[0]!,
          quantityAvailable: 0,
          availableForSale: false,
        },
      ],
      availableForSale: false,
    };

    render(
      <MemoryRouter>
        <ProductCard product={empty} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Sold out')).toBeInTheDocument();
    expect(screen.queryByText(/left/)).toBeNull();
  });

  it('does not invent a quantity when Shopify does not expose stock', () => {
    const base = productFixture();
    const unknown = {
      ...base,
      variants: [{ ...base.variants[0]!, quantityAvailable: null }],
    };

    render(
      <MemoryRouter>
        <ProductCard product={unknown} />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/left/)).toBeNull();
    expect(screen.queryByText('Sold out')).toBeNull();
  });
});
