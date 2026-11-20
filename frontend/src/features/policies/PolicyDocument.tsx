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
  const hasPolicyTable = /<table\b/i.test(body);
  const policyHtmlClasses =
    'mt-8 max-w-full space-y-4 overflow-x-auto text-[15px] leading-7 text-neutral-700 [&_a]:break-all [&_code]:break-all [&_li]:break-words [&_p]:break-words [&_p]:hyphens-auto [&_h1]:break-words [&_h2]:break-words [&_h3]:break-words [&_blockquote]:break-words [&_table]:w-full [&_table]:min-w-[30rem] [&_table]:border-collapse [&_table]:text-left [&_th]:border [&_th]:border-terra-100 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:break-words [&_td]:border [&_td]:border-terra-100 [&_td]:px-2 [&_td]:py-1.5 [&_td]:align-top [&_td]:break-words';

  return (
    <article className="mx-auto min-w-0 max-w-[760px]">
      <h1 className="break-words text-[clamp(28px,3.2vw,44px)] font-semibold tracking-tight">{title}</h1>

      {placeholder ? (
        <div role="note" className="mt-6 rounded-card border border-terra-200 bg-terra-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-terra-700">
            {t('legal.ownerReview')}
          </p>
          <p className="mt-1 break-words text-[13px] leading-6 text-neutral-600">{t('legal.placeholderBody')}</p>
        </div>
      ) : null}

      {policy ? (
        <>
          {body ? (
            <div
              role={hasPolicyTable ? 'region' : undefined}
              tabIndex={hasPolicyTable ? 0 : undefined}
              aria-label={hasPolicyTable ? title : undefined}
              className={policyHtmlClasses}
              dangerouslySetInnerHTML={{ __html: body }}
            />
          ) : (
            <p className="mt-8 break-words text-[14px] leading-7 text-neutral-600">{fallback}</p>
          )}
        </>
      ) : (
        <p className="mt-8 break-words rounded-card border border-terra-100 bg-terra-50/70 p-4 text-[14px] leading-7 text-neutral-600 sm:p-5">
          {fallback}
        </p>
      )}
    </article>
  );
}
