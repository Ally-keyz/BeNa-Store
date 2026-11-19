import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { buttonVariants } from '@/components/ui/Button';
import { pageContainer } from '@/lib/layout';

/** Per-route fallback so one broken screen never blanks the whole shop. */
export function RouteErrorBoundary() {
  const { t } = useTranslation();
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const code = isRouteErrorResponse(error) && typeof error.data === 'string' ? error.data : undefined;

  return (
    <div className={pageContainer}>
      <div className="mx-auto max-w-xl py-20 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-terra-600">
          {status}
        </p>
        <h1 className="mt-3 text-[clamp(28px,3vw,40px)] font-semibold tracking-tight">
          {t('common.errorTitle')}
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          {code ? t(`errors.${code}`, { defaultValue: t('common.errorBody') }) : t('common.errorBody')}
        </p>
        <Link to="/" className={`${buttonVariants({ size: 'sm' })} mt-6`}>
          {t('common.backHome')}
        </Link>
      </div>
    </div>
  );
}
