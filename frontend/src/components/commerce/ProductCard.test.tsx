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
  it('shows a per-kg price for coffee when Shopify provides none', () => {
    render(
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

    expect(screen.getByText('€43.96 / kg')).toBeInTheDocument();
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

  it('does not invent a per-kg price for honey or the unlabelled sample', () => {
    const { rerender } = render(
      <MemoryRouter>
        <ProductCard product={pricedProduct('ubuki-honey-500g', 'Ubuki Honey 500g', '9.50')} />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/\/kg/)).toBeNull();

    rerender(
      <MemoryRouter>
        <ProductCard product={pricedProduct('kleine-kaffee-probe', 'Kleine Kaffee Probe', '3.90')} />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/\/kg/)).toBeNull();
  });
});
