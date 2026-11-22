import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n';
import { CatalogFacets, type CatalogFacetsProps } from './CatalogFacets';
import { EMPTY_FACETS } from './facets';

const facets: CatalogFacetsProps['facets'] = {
  categories: [],
  brands: [{ value: 'bena-origins', label: 'Bena Origins', count: 3 }],
  dietary: [],
  origins: [{ value: 'rwanda', label: 'Rwanda', count: 3 }],
  scannedProducts: 3,
  truncated: false,
  checkedAt: '2026-11-21T00:00:00.000Z',
};

describe('CatalogFacets', () => {
  it('reports selected values through onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CatalogFacets facets={facets} selected={EMPTY_FACETS} onChange={onChange} />);

    await user.click(screen.getByRole('checkbox', { name: /Bena Origins/ }));
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FACETS, brands: ['bena-origins'] });
  });

  it('translates canonical facet labels in the active language', async () => {
    const previousLanguage = i18n.language;
    await i18n.changeLanguage('de');
    try {
      render(
        <CatalogFacets
          facets={{
            ...facets,
            dietary: [{ value: 'gluten-free', label: 'Glutenfrei', count: 2 }],
            origins: [
              { value: 'rwandan', label: 'Rwanda', count: 4 },
              { value: 'african', label: 'Africa', count: 2 },
            ],
          }}
          selected={EMPTY_FACETS}
          onChange={() => undefined}
        />,
      );
      expect(screen.getByRole('checkbox', { name: /Glutenfrei/ })).toBeVisible();
      expect(screen.getByRole('checkbox', { name: /Ruandisch/ })).toBeVisible();
      expect(screen.getByRole('checkbox', { name: /Afrikanisch/ })).toBeVisible();
    } finally {
      await i18n.changeLanguage(previousLanguage);
    }
  });

  it('is honest when no catalog facets are available', () => {
    render(<CatalogFacets facets={undefined} selected={EMPTY_FACETS} onChange={() => undefined} />);
    expect(screen.getByText(/No additional facets are available yet/)).toBeVisible();
  });
});
