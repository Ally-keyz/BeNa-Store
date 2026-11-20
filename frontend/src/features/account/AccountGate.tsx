import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { associateCart, buildAuthLoginUrl, postLogout } from '@/api/endpoints';
import { queryKeys } from '@/api/queryKeys';
import { useSession } from '@/hooks/useSession';
import { useCart } from '@/context/CartContext';
import { Button, buttonVariants } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export interface AccountGateProps {
  children: ReactNode;
  returnTo?: string;
}

/**
 * Handles all customer-session states: loading, feature-disabled, service
 * unavailable, signed-out, signed-in. The account queries themselves are
 * read-only and never receive tokens from the browser.
 */
export function AccountGate({ children, returnTo }: AccountGateProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { cart } = useCart();
  const { isLoading, isError, enabled, authenticated, customer, csrfToken } = useSession();
  const [loggingOut, setLoggingOut] = useState(false);
  const associatedRef = useRef<string | null>(null);

  const currentPath = returnTo ?? `${location.pathname}${location.search}`;
  const loginUrl = buildAuthLoginUrl(`/auth/login?returnTo=${encodeURIComponent(currentPath)}`);

  // After a real login, associate the existing guest cart with the customer.
  useEffect(() => {
    if (!authenticated || !csrfToken || !cart?.id) return;
    const key = `${cart.id}:${csrfToken}`;
    if (associatedRef.current === key) return;
    associatedRef.current = key;
    void associateCart(cart.id, csrfToken).catch(() => {
      // Non-fatal: the cart still works as a guest cart.
    });
  }, [authenticated, csrfToken, cart?.id]);

  const onLogout = async () => {
    if (!csrfToken) {
      toast({ title: t('account.logoutError'), variant: 'error' });
      return;
    }
    setLoggingOut(true);
    try {
      await postLogout(csrfToken);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.session }),
        queryClient.invalidateQueries({ queryKey: queryKeys.account.me }),
        queryClient.invalidateQueries({ queryKey: ['account'] }),
      ]);
      navigate('/');
    } catch {
      toast({ title: t('account.logoutError'), variant: 'error' });
    } finally {
      setLoggingOut(false);
    }
  };

  if (isLoading) {
    return <p role="status">{t('account.loadingTitle')}</p>;
  }

  if (isError) {
    return (
      <div role="alert" className="rounded-card border border-terra-100 bg-terra-50 p-4 sm:p-6">
        <p className="break-words font-medium text-ink">{t('account.sessionErrorTitle')}</p>
        <p className="mt-1 break-words text-[13px] leading-6 text-neutral-600">{t('account.sessionErrorBody')}</p>
        <Link
          to="/catalog"
          className={`${buttonVariants({ variant: 'secondary', size: 'sm' })} mt-4 min-h-11 sm:min-h-9`}
        >
          {t('account.guestCheckout')}
        </Link>
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="rounded-card border border-terra-100 bg-terra-50 p-4 sm:p-6">
        <p className="break-words text-[11px] font-semibold uppercase tracking-[0.16em] text-terra-700">
          {t('errors.FEATURE_DISABLED')}
        </p>
        <p className="mt-2 break-words text-lg font-semibold text-ink">{t('account.disabledTitle')}</p>
        <p className="mt-1 break-words text-[13px] leading-6 text-neutral-600">{t('account.disabledBody')}</p>
        <Link to="/catalog" className={`${buttonVariants({ size: 'sm' })} mt-5 min-h-11 sm:min-h-9`}>
          {t('account.guestCheckout')}
        </Link>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-xl rounded-card border border-terra-100 bg-terra-50 p-4 text-center sm:p-8">
        <h2 className="break-words text-xl font-semibold">{t('account.signInTitle')}</h2>
        <p className="mt-2 break-words text-[13px] leading-6 text-neutral-600">{t('account.signInBody')}</p>
        <a href={loginUrl} className={`${buttonVariants({ size: 'sm' })} mt-5 min-h-11 sm:min-h-9`}>
          {t('account.signInAction')}
        </a>
        <p className="mt-4 break-words text-[12px] text-neutral-600">{t('account.cartNote')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-terra-100 pb-5">
        <div className="min-w-0 break-words text-[13px] text-neutral-600">
          {customer?.displayName || customer?.email ? (
            <span className="font-medium text-ink">{customer?.displayName || customer?.email}</span>
          ) : (
            <span>{t('account.title')}</span>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="min-h-11 shrink-0 sm:min-h-9"
          onClick={() => void onLogout()}
          loading={loggingOut}
        >
          {t('account.logout')}
        </Button>
      </div>
      {children}
    </div>
  );
}
