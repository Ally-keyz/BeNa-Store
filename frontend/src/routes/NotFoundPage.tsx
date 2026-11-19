import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Seo } from '@/app/Seo';
import { buttonVariants } from '@/components/ui/Button';
import { pageContainer } from '@/lib/layout';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <>
      <Seo
        title={`${t('common.notFoundTitle')} — BeNa Origins`}
        description={t('common.notFoundBody')}
        path="/404"
        robots="noindex,follow"
      />
      <div className={pageContainer}>
        <div className="mx-auto max-w-xl py-24 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-terra-600">404</p>
          <h1 className="mt-3 text-[clamp(28px,3vw,40px)] font-semibold tracking-tight">
            {t('common.notFoundTitle')}
          </h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">{t('common.notFoundBody')}</p>
          <Link to="/" className={`${buttonVariants({ size: 'sm' })} mt-6`}>
            {t('common.backHome')}
          </Link>
        </div>
      </div>
    </>
  );
}
