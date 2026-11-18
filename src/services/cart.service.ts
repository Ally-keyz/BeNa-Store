import type {
  Cart,
  CartBuyerIdentityInput,
  CartCreateInput,
  CartLineInput,
  CommerceClient,
} from '../types/domain';
import { notFound } from '../utils/errors';

/**
 * Cart orchestration only. Carts live at Shopify; there is no local cart
 * persistence, no order creation and no checkout completion here.
 */
export class CartService {
  constructor(private readonly client: CommerceClient) {}

  create(input: CartCreateInput): Promise<Cart> {
    return this.client.createCart(input);
  }

  async get(cartId: string): Promise<Cart> {
    const cart = await this.client.getCart(cartId);
    if (!cart) throw notFound('Cart', cartId);
    return cart;
  }

  addLines(cartId: string, lines: CartLineInput[]): Promise<Cart> {
    return this.client.addCartLines(cartId, lines);
  }

  updateLines(
    cartId: string,
    lines: Array<{ id: string; quantity: number; merchandiseId?: string }>,
  ): Promise<Cart> {
    return this.client.updateCartLines(cartId, lines);
  }

  removeLines(cartId: string, lineIds: string[]): Promise<Cart> {
    return this.client.removeCartLines(cartId, lineIds);
  }

  updateBuyerIdentity(cartId: string, identity: CartBuyerIdentityInput): Promise<Cart> {
    return this.client.updateCartBuyerIdentity(cartId, identity);
  }

  updateDiscountCodes(cartId: string, codes: string[]): Promise<Cart> {
    return this.client.updateCartDiscountCodes(cartId, codes);
  }
}
