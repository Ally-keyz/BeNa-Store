import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

    await user.click(screen.getByRole('button', { name: /Bena Origins/ }));
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FACETS, brands: ['bena-origins'] });
  });

  it('is honest when no catalog facets are available', () => {
    render(<CatalogFacets facets={undefined} selected={EMPTY_FACETS} onChange={() => undefined} />);
    expect(screen.getByText(/No additional facets are available yet/)).toBeVisible();
  });
});
