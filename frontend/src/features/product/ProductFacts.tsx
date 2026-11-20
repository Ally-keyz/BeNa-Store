import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Product, ProductMetafields, AISuggestion } from '@/types';
import { decodeMetafield, hasMetafield, metafieldLines } from '@/lib/metafields';
import { sanitizeHtml } from '@/lib/sanitize';
import { Accordion, type AccordionItem } from '@/components/ui/Accordion';
import { getAiSuggestions } from '@/api/endpoints';
import { isApiError } from '@/api/errors';

export interface ProductFactsProps {
  product: Product;
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-terra-100 py-2 last:border-0 sm:grid-cols-[140px_1fr]">
      <dt className="text-[12px] font-medium text-ink">{label}</dt>
      <dd className="break-words whitespace-pre-line text-[12px] leading-5 text-neutral-600">{value}</dd>
    </div>
  );
}

const PLACEHOLDER_FACT_VALUES = new Set([
  '-',
  'n/a',
  'na',
  'none',
  'null',
  'unknown',
  'unspecified',
  'not specified',
  'not available',
  'not provided',
  'not supplied',
  'no data',
  'no information',
]);

function cleanFactValue(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  const normalized = trimmed.toLowerCase().replace(/[.!]+$/, '');
  return PLACEHOLDER_FACT_VALUES.has(normalized) ? null : trimmed;
}

function AiNote() {
  const { t } = useTranslation();
  return <p className="mt-2 text-[11px] leading-5 text-neutral-500">{t('productInfo.aiInlineNote')}</p>;
}

function AiNoData() {
  const { t } = useTranslation();
  return <p className="text-[13px] leading-6 text-neutral-600">{t('productInfo.aiNoData')}</p>;
}

function FoodFacts({
  metafields,
  aiSuggestion,
}: {
  metafields: ProductMetafields;
  aiSuggestion: AISuggestion | null;
}) {
  const { t } = useTranslation();
  if (!aiSuggestion) {
    return (
      <dl>
        <FactRow
          label={t('product.ingredients')}
          value={decodeMetafield(metafields.ingredients) || t('productInfo.ingredientsUnavailable')}
        />
        <FactRow
          label={t('productInfo.nutrition')}
          value={decodeMetafield(metafields.nutrition) || t('productInfo.nutritionUnavailable')}
        />
        <FactRow
          label={t('product.origin')}
          value={decodeMetafield(metafields.origin) || t('productInfo.originUnavailable')}
        />
      </dl>
    );
  }

  const ingredients = cleanFactValue(aiSuggestion.ingredients?.value);
  const nutrition = cleanFactValue(aiSuggestion.nutrition?.value);
  const origin = cleanFactValue(aiSuggestion.origin?.value);
  if (!ingredients && !nutrition && !origin) return <AiNoData />;

  return (
    <div>
      <dl>
        {ingredients && <FactRow label={t('product.ingredients')} value={ingredients} />}
        {nutrition && <FactRow label={t('productInfo.nutrition')} value={nutrition} />}
        {origin && <FactRow label={t('product.origin')} value={origin} />}
      </dl>
      <AiNote />
    </div>
  );
}

function PreparationFacts({
  metafields,
  aiSuggestion,
}: {
  metafields: ProductMetafields;
  aiSuggestion: AISuggestion | null;
}) {
  const { t } = useTranslation();
  if (aiSuggestion) {
    const aiPreparation = cleanFactValue(aiSuggestion.preparation?.value);
    if (!aiPreparation) return <AiNoData />;
    return (
      <div>
        <p className="whitespace-pre-line text-[13px] leading-6 text-neutral-600">{aiPreparation}</p>
        <AiNote />
      </div>
    );
  }

  const lines = metafieldLines(metafields.preparation);
  if (lines.length === 0) {
    return <p className="text-[13px] leading-6 text-neutral-600">{t('productInfo.preparationUnavailable')}</p>;
  }

  const ordered = lines.some((line) => line.ordered);
  const List = ordered ? 'ol' : 'ul';
  return (
    <List className={`ml-5 space-y-2 text-[13px] leading-6 text-neutral-600 ${ordered ? 'list-decimal' : 'list-disc'}`}>
      {lines.map((line, index) => (
        <li key={`${line.text}-${index}`} className="pl-1">
          {line.text}
        </li>
      ))}
    </List>
  );
}

/** Product information, food data and structured preparation from the backend. */
export function ProductFacts({ product }: ProductFactsProps) {
  const { t } = useTranslation();
  const allergens = decodeMetafield(product.metafields.allergens);
  const descriptionHtml = sanitizeHtml(product.descriptionHtml);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const aiAllergens = cleanFactValue(aiSuggestion?.allergens?.value);

  const fetchAiSuggestions = useCallback(async () => {
    try {
      const result = await getAiSuggestions(product.handle);
      setAiSuggestion(result.data);
    } catch (err) {
      if (isApiError(err) && (err.status === 401 || err.status === 403 || err.status === 503)) {
        setAiSuggestion(null);
      }
    }
  }, [product.handle]);

  useEffect(() => {
    fetchAiSuggestions();
  }, [fetchAiSuggestions]);

  const specs = [
    product.vendor ? { label: t('productInfo.specVendor'), value: product.vendor } : null,
    product.productType ? { label: t('productInfo.specType'), value: product.productType } : null,
    product.variants.find((variant) => variant.sku)?.sku
      ? {
          label: t('productInfo.specSku'),
          value: product.variants.find((variant) => variant.sku)?.sku ?? '',
        }
      : null,
  ].filter((row): row is { label: string; value: string } => row !== null);

  const items: AccordionItem[] = [
    {
      id: 'allergens',
      title: t('product.allergens'),
      content: aiSuggestion ? (
        aiAllergens ? (
          <div>
            <p className="whitespace-pre-line text-[13px] font-medium leading-5 text-ink">
              {aiAllergens}
            </p>
            <AiNote />
          </div>
        ) : (
          <AiNoData />
        )
      ) : hasMetafield(product.metafields.allergens) ? (
        <div>
          <p className="whitespace-pre-line text-[13px] font-medium leading-5 text-ink">
            {allergens}
          </p>
          <p className="mt-1 text-[12px] text-neutral-600">{t('productInfo.allergensNote')}</p>
        </div>
      ) : (
        <p className="text-[13px] leading-5 text-neutral-600">
          {t('productInfo.allergensUnavailable')}
        </p>
      ),
    },
    {
      id: 'description',
      title: t('productInfo.descriptionTitle'),
      defaultOpen: true,
      content: descriptionHtml ? (
        <div
          className="prose-body max-w-full overflow-x-auto text-[14px] leading-7 text-neutral-600"
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      ) : (
        <p className="text-[13px] leading-6 text-neutral-600">{product.description}</p>
      ),
    },
    {
      id: 'details',
      title: t('productInfo.detailsTitle'),
      content: specs.length ? (
        <dl>
          {specs.map((row) => (
            <FactRow key={row.label} label={row.label} value={row.value} />
          ))}
        </dl>
      ) : (
        <p className="text-[13px] leading-6 text-neutral-600">{t('productInfo.detailsUnavailable')}</p>
      ),
    },
    {
      id: 'food',
      title: t('productInfo.foodTitle'),
      content: <FoodFacts metafields={product.metafields} aiSuggestion={aiSuggestion} />,
    },
    {
      id: 'preparation',
      title: t('productInfo.preparationTitle'),
      content: <PreparationFacts metafields={product.metafields} aiSuggestion={aiSuggestion} />,
    },
  ];

  return (
    <section aria-label={t('product.details')} className="space-y-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-neutral-700">
        {t('product.details')}
      </h2>
      <Accordion items={items} allowMultiple />
    </section>
  );
}
