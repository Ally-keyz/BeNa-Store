import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { money, productFixture } from '@/test/fixtures';
import { PurchasePanel } from './PurchasePanel';

vi.mock('@/context/MarketContext', () => ({ useMarket: () => ({ formatLocale: 'en-IE' }) }));
vi.mock('@/context/CartContext', () => ({ useCart: () => ({ isUpdating: false }) }));

describe('PurchasePanel unit labels', () => {
  it('shows only the pack price, with no kilogram or unit suffix on the quantity stepper', () => {
    const base = productFixture({
      handle: 'premium-rwandan-arabica-coffee-freshly-roasted-250g',
      title: 'Premium Rwandan Arabica Coffee 250g',
    });
    const product = {
      ...base,
      variants: [
        {
          ...base.variants[0]!,
          unitPrice: money('60.00'),
          unitPriceMeasurement: {
            measuredType: 'WEIGHT',
            quantityUnit: 'G',
            quantityValue: 250,
            referenceUnit: 'KG',
            referenceValue: 1,
          },
        },
      ],
    };

    render(
      <MemoryRouter>
        <PurchasePanel
          product={product}
          variant={product.variants[0]!}
          onVariantChange={vi.fn()}
          quantity={2}
          onQuantityChange={vi.fn()}
          onAdd={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/\/kg/)).toBeNull();
    expect(screen.queryByText(/kg/)).toBeNull();
    expect(screen.queryByText('€60.00')).toBeNull();
    expect(screen.queryByText(/unit/)).toBeNull();
    expect(screen.getByRole('spinbutton', { name: 'Quantity for Premium Rwandan Arabica Coffee 250g' })).toBeVisible();
  });
});
