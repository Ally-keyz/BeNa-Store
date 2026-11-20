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
      <dd className="whitespace-pre-line text-[12px] leading-5 text-neutral-600">{value}</dd>
    </div>
  );
}

function FoodFacts({ metafields }: { metafields: ProductMetafields }) {
  const { t } = useTranslation();
  const ingredients = decodeMetafield(metafields.ingredients);
  const nutrition = decodeMetafield(metafields.nutrition);
  const origin = decodeMetafield(metafields.origin);

  return (
    <dl>
      <FactRow
        label={t('product.ingredients')}
        value={ingredients || t('productInfo.ingredientsUnavailable')}
      />
      <FactRow
        label={t('productInfo.nutrition')}
        value={nutrition || t('productInfo.nutritionUnavailable')}
      />
      <FactRow
        label={t('product.origin')}
        value={origin || t('productInfo.originUnavailable')}
      />
    </dl>
  );
}

function PreparationFacts({ metafields }: { metafields: ProductMetafields }) {
  const { t } = useTranslation();
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
      content: hasMetafield(product.metafields.allergens) ? (
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
          className="prose-body text-[14px] leading-7 text-neutral-600"
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
      content: <FoodFacts metafields={product.metafields} />,
    },
    {
      id: 'preparation',
      title: t('productInfo.preparationTitle'),
      content: <PreparationFacts metafields={product.metafields} />,
    },
    ...(aiSuggestion ? [
      {
        id: 'ai-suggestions',
        title: t('productInfo.aiSuggestionsTitle'),
        content: (
          <div className="space-y-2">
            <p className="text-[12px] font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2">
              {aiSuggestion.disclaimer}
            </p>
            {aiSuggestion.ingredients && (
              <FactRow label={t('productInfo.aiIngredients')} value={aiSuggestion.ingredients.value} />
            )}
            {aiSuggestion.allergens && (
              <FactRow label={t('productInfo.aiAllergens')} value={aiSuggestion.allergens.value} />
            )}
            {aiSuggestion.nutrition && (
              <FactRow label={t('productInfo.aiNutrition')} value={aiSuggestion.nutrition.value} />
            )}
            {aiSuggestion.origin && (
              <FactRow label={t('productInfo.aiOrigin')} value={aiSuggestion.origin.value} />
            )}
            {aiSuggestion.preparation && (
              <FactRow label={t('productInfo.aiPreparation')} value={aiSuggestion.preparation.value} />
            )}
            <p className="text-[11px] leading-5 text-neutral-500">
              {t('productInfo.aiNotVerified', { model: aiSuggestion.model, suggestedAt: aiSuggestion.suggestedAt })}
            </p>
          </div>
        ),
      },
    ] : []),
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
