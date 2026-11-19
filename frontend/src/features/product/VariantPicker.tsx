import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Product, ProductVariant } from '@/types';
import { Select, type SelectOption } from '@/components/ui/Select';

export interface VariantPickerProps {
  product: Product;
  value: ProductVariant | null;
  onChange: (variant: ProductVariant) => void;
}

function selectionOf(variant: ProductVariant | null): Record<string, string> {
  return Object.fromEntries((variant?.selectedOptions ?? []).map((option) => [option.name, option.value]));
}

/** Option controls backed by real Shopify variants. No invented choices. */
export function VariantPicker({ product, value, onChange }: VariantPickerProps) {
  const { t } = useTranslation();
  const [selections, setSelections] = useState<Record<string, string>>(() => selectionOf(value));

  useEffect(() => {
    setSelections(selectionOf(value));
  }, [product.handle, value]);

  const selectableOptions = useMemo(
    () => product.options.filter((option) => option.values.length > 1),
    [product.options],
  );

  if (selectableOptions.length === 0) return null;

  const onOptionChange = (name: string, nextValue: string) => {
    const next = { ...selections, [name]: nextValue };
    setSelections(next);
    const matches = product.variants.filter((variant) =>
      variant.selectedOptions.every((option) => next[option.name] === option.value),
    );
    const nextVariant = matches.find((variant) => variant.availableForSale) ?? matches[0];
    if (nextVariant) onChange(nextVariant);
  };

  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-sm font-medium text-ink">{t('product.chooseOptions')}</legend>
      {selectableOptions.map((option) => {
        const options: SelectOption[] = option.values.map((item) => ({ value: item, label: item }));
        return (
          <Select
            key={option.id}
            label={option.name}
            options={options}
            value={selections[option.name] ?? option.values[0] ?? ''}
            onChange={(event) => onOptionChange(option.name, event.target.value)}
          />
        );
      })}
    </fieldset>
  );
}
