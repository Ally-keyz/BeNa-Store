import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Cart } from '@/types';
import { createCart } from '@/api/endpoints';
import { CartProvider, useCart } from './CartContext';

vi.mock('@/api/endpoints', () => ({
  createCart: vi.fn(),
  getCart: vi.fn(),
  addCartLines: vi.fn(),
  removeCartLines: vi.fn(),
  updateBuyerIdentity: vi.fn(),
  updateCartLines: vi.fn(),
  updateDiscountCodes: vi.fn(),
}));

vi.mock('@/context/MarketContext', () => ({
  useMarket: () => ({ marketParams: { country: 'DE', language: 'FR' } }),
}));

vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useAnalytics', () => ({ useAnalytics: () => vi.fn() }));

const cart = {
  id: 'cart-1',
  totalQuantity: 1,
  checkoutUrl: 'https://benaafricanshop.myshopify.com/checkouts/cn/token/en-de',
  checkout: { hostedBy: 'shopify', url: 'https://benaafricanshop.myshopify.com/checkouts/cn/token/en-de' },
  createdAt: '',
  updatedAt: '',
  cost: {
    subtotalAmount: null,
    totalAmount: null,
    totalTaxAmount: null,
    totalDutyAmount: null,
  },
  lines: [],
  discountCodes: [],
  buyerIdentity: { email: null, phone: null, countryCode: null, customer: null },
  deliveryGroups: [],
  warnings: [],
} as Cart;

function AddButton() {
  const { addItem } = useCart();
  return (
    <button onClick={() => void addItem({ merchandiseId: 'gid://shopify/ProductVariant/1' })}>
      Add to cart
    </button>
  );
}

function renderProvider() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <AddButton />
      </CartProvider>
    </QueryClientProvider>,
  );
}

describe('CartProvider checkout language', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.mocked(createCart).mockResolvedValue({ data: cart } as never);
  });

  it('passes the current site language when creating a cart', async () => {
    renderProvider();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Add to cart' }));

    expect(createCart).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [{ merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 1 }],
        language: 'FR',
      }),
    );
  });
});
