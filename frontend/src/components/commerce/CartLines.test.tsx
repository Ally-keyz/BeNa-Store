import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { CartLine } from '@/types';
import { money } from '@/test/fixtures';
import { CartLines } from './CartLines';

vi.mock('@/context/MarketContext', () => ({ useMarket: () => ({ formatLocale: 'en-IE' }) }));
vi.mock('@/context/CartContext', () => ({
  useCart: () => ({ updateLine: vi.fn(), removeLine: vi.fn(), isUpdating: false }),
}));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

function line(selectedOptions: Array<{ name: string; value: string }>, variantTitle = 'Default Title'): CartLine {
  const amount = money('12.50');
  return {
    id: 'gid://shopify/CartLine/1',
    quantity: 1,
    cost: { amountPerQuantity: amount, subtotalAmount: amount, totalAmount: amount },
    merchandise: {
      id: 'gid://shopify/ProductVariant/1',
      title: variantTitle,
      sku: null,
      availableForSale: true,
      price: amount,
      image: null,
      product: {
        id: 'gid://shopify/Product/1',
        handle: 'rwanda-honey',
        title: 'Rwanda Honey',
        description: 'Plain description fallback',
        descriptionHtml: '<p>Short honey note from the product card.</p>',
        url: 'https://benaorigins.de/products/rwanda-honey',
      },
      selectedOptions,
    },
  };
}

describe('CartLines', () => {
  it('replaces the Default Title subtitle with the product short description', () => {
    render(
      <MemoryRouter>
        <CartLines lines={[line([{ name: 'Title', value: 'Default Title' }])]} />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Default Title')).toBeNull();
    expect(screen.getByText('Short honey note from the product card.')).toBeVisible();
  });

  it('keeps real variant options visible alongside the description', () => {
    render(
      <MemoryRouter>
        <CartLines lines={[line([{ name: 'Size', value: '250 g' }], '250 g')]} />
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/250 g/).length).toBeGreaterThan(0);
    expect(screen.getByText('Short honey note from the product card.')).toBeVisible();
  });
});
