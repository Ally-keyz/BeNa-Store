import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addCartLines,
  createCart,
  getCart,
  removeCartLines,
  updateBuyerIdentity,
  updateCartLines,
  updateDiscountCodes,
} from '@/api/endpoints';
import { isApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { useAnalytics } from '@/hooks/useAnalytics';
import { readStorage, writeStorage } from '@/lib/storage';
import { useToast } from '@/components/ui/Toast';
import type { Cart } from '@/types';

const CART_KEY = 'bena.cartId';

export interface AddItemOptions {
  merchandiseId: string;
  quantity?: number;
  countryCode?: string;
  /** Product name used by the "added to cart" notification. */
  itemTitle?: string;
  /** Optional fallback message when no product title is available. */
  successMessage?: string;
  errorMessage?: string;
}

export interface CartContextValue {
  cart: Cart | null;
  itemCount: number;
  isLoading: boolean;
  isUpdating: boolean;
  /** Open state for the shared header cart drawer. */
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (options: AddItemOptions) => Promise<void>;
  updateLine: (lineId: string, quantity: number) => Promise<void>;
  removeLine: (lineId: string) => Promise<void>;
  applyDiscount: (code: string) => Promise<void>;
  setBuyerIdentity: (identity: { email?: string; countryCode?: string }) => Promise<void>;
  refresh: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const track = useAnalytics();
  const [cartId, setCartId] = useState<string | null>(() => readStorage(CART_KEY));
  const [isUpdating, setIsUpdating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const persistCartId = useCallback((next: string | null) => {
    setCartId(next);
    writeStorage(CART_KEY, next);
  }, []);

  const cartQuery = useQuery({
    queryKey: queryKeys.cart.detail(cartId),
    queryFn: async () => {
      if (!cartId) return null;
      try {
        return (await getCart(cartId)).data;
      } catch (error) {
        if (isApiError(error) && error.code === 'NOT_FOUND') {
          // Cart expired: forget it so the next add creates a fresh one.
          persistCartId(null);
          return null;
        }
        throw error;
      }
    },
    enabled: Boolean(cartId),
    retry: false,
    staleTime: 30_000,
  });

  const commitCart = useCallback(
    (cart: Cart) => {
      persistCartId(cart.id);
      queryClient.setQueryData(queryKeys.cart.detail(cart.id), cart);
    },
    [persistCartId, queryClient],
  );

  const createWithLine = useCallback(
    async (merchandiseId: string, quantity: number, countryCode?: string) => {
      const result = await createCart({
        lines: [{ merchandiseId, quantity }],
        buyerIdentity: countryCode ? { countryCode } : undefined,
      });
      commitCart(result.data);
      return result.data;
    },
    [commitCart],
  );

  const addItem = useCallback(
    async ({
      merchandiseId,
      quantity = 1,
      countryCode,
      itemTitle,
      successMessage,
      errorMessage,
    }: AddItemOptions) => {
      setIsUpdating(true);
      try {
        if (!cartId) {
          await createWithLine(merchandiseId, quantity, countryCode);
        } else {
          try {
            const result = await addCartLines(cartId, [{ merchandiseId, quantity }]);
            commitCart(result.data);
          } catch (error) {
            if (isApiError(error) && error.code === 'NOT_FOUND') {
              await createWithLine(merchandiseId, quantity, countryCode);
            } else {
              throw error;
            }
          }
        }

        track('add_to_cart', { quantity });

        if (itemTitle) {
          toast({
            title: t('cart.addedTitle'),
            description: t('cart.addedBody', { title: itemTitle }),
            variant: 'success',
            action: { label: t('cart.viewCartButton'), onClick: openCart },
            durationMs: 6000,
          });
        } else if (successMessage) {
          toast({ title: successMessage, variant: 'success' });
        }
      } catch (error) {
        if (errorMessage) toast({ title: errorMessage, variant: 'error' });
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [cartId, commitCart, createWithLine, openCart, t, toast, track],
  );

  const updateLine = useCallback(
    async (lineId: string, quantity: number) => {
      if (!cartId) return;
      setIsUpdating(true);
      try {
        const result = await updateCartLines(cartId, [{ id: lineId, quantity }]);
        commitCart(result.data);
      } finally {
        setIsUpdating(false);
      }
    },
    [cartId, commitCart],
  );

  const removeLine = useCallback(
    async (lineId: string) => {
      if (!cartId) return;
      setIsUpdating(true);
      try {
        const result = await removeCartLines(cartId, [lineId]);
        commitCart(result.data);
      } finally {
        setIsUpdating(false);
      }
    },
    [cartId, commitCart],
  );

  const applyDiscount = useCallback(
    async (code: string) => {
      if (!cartId) return;
      setIsUpdating(true);
      try {
        const result = await updateDiscountCodes(cartId, code ? [code] : []);
        commitCart(result.data);
      } finally {
        setIsUpdating(false);
      }
    },
    [cartId, commitCart],
  );

  const setBuyerIdentity = useCallback(
    async (identity: { email?: string; countryCode?: string }) => {
      setIsUpdating(true);
      try {
        if (!cartId) {
          const result = await createCart({ buyerIdentity: identity });
          commitCart(result.data);
          return;
        }
        try {
          const result = await updateBuyerIdentity(cartId, identity);
          commitCart(result.data);
        } catch (error) {
          if (isApiError(error) && error.code === 'NOT_FOUND') {
            const result = await createCart({ buyerIdentity: identity });
            commitCart(result.data);
          } else {
            throw error;
          }
        }
      } finally {
        setIsUpdating(false);
      }
    },
    [cartId, commitCart],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      cart: cartQuery.data ?? null,
      itemCount: cartQuery.data?.totalQuantity ?? 0,
      isLoading: cartQuery.isLoading,
      isUpdating,
      isOpen,
      openCart,
      closeCart,
      addItem,
      updateLine,
      removeLine,
      applyDiscount,
      setBuyerIdentity,
      refresh: () => {
        void cartQuery.refetch();
      },
    }),
    [
      cartQuery,
      isUpdating,
      isOpen,
      openCart,
      closeCart,
      addItem,
      updateLine,
      removeLine,
      applyDiscount,
      setBuyerIdentity,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside <CartProvider>');
  return context;
}
