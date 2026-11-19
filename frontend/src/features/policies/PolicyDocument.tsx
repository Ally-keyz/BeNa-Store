import { useTranslation } from 'react-i18next';
import type { ShopPolicy } from '@/types';
import { sanitizeHtml } from '@/lib/sanitize';

export interface PolicyDocumentProps {
  policy: ShopPolicy | null | undefined;
  title: string;
  fallback: string;
  /** Marks content that is not owner-approved legal text yet. */
  placeholder?: boolean;
}

/** Sanitized policy body from the shop backend, with honest unavailable states. */
export function PolicyDocument({ policy, title, fallback, placeholder = false }: PolicyDocumentProps) {
  const { t } = useTranslation();
  const body = sanitizeHtml(policy?.body);

  return (
    <article className="mx-auto max-w-[760px]">
      <h1 className="text-[clamp(28px,3.2vw,44px)] font-semibold tracking-tight">{title}</h1>

      {placeholder ? (
        <div role="note" className="mt-6 rounded-card border border-terra-200 bg-terra-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-terra-700">
            {t('legal.ownerReview')}
          </p>
          <p className="mt-1 text-[13px] leading-6 text-neutral-600">{t('legal.placeholderBody')}</p>
        </div>
      ) : null}

      {policy ? (
        <>
          {body ? (
            <div
              className="mt-8 space-y-4 text-[15px] leading-7 text-neutral-700"
              dangerouslySetInnerHTML={{ __html: body }}
            />
          ) : (
            <p className="mt-8 text-[14px] leading-7 text-neutral-600">{fallback}</p>
          )}
        </>
      ) : (
        <p className="mt-8 rounded-card border border-terra-100 bg-terra-50/70 p-5 text-[14px] leading-7 text-neutral-600">
          {fallback}
        </p>
      )}
    </article>
  );
}
