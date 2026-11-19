import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductFacts } from './ProductFacts';
import { emptyMetafields, metafield, productFixture } from '@/test/fixtures';

describe('ProductFacts', () => {
  it('emphasizes a supplied allergen declaration', async () => {
    const user = userEvent.setup();
    const product = productFixture({
      metafields: { ...emptyMetafields(), allergens: metafield('Contains tree nuts') },
    });

    render(<ProductFacts product={product} />);

    await user.click(screen.getByRole('button', { name: 'Allergens' }));
    const region = screen.getByRole('region', { name: 'Allergens' });
    expect(within(region).getByText('Contains tree nuts')).toBeVisible();
    expect(within(region).getByText(/Always check the product packaging/i)).toBeVisible();
  });

  it('says allergens are unavailable instead of guessing', async () => {
    const user = userEvent.setup();
    render(<ProductFacts product={productFixture()} />);

    await user.click(screen.getByRole('button', { name: 'Allergens' }));
    const region = screen.getByRole('region', { name: 'Allergens' });
    expect(within(region).getByText(/No allergen declaration/i)).toBeVisible();
  });

  it('marks missing food information as unavailable', async () => {
    const user = userEvent.setup();
    render(<ProductFacts product={productFixture()} />);

    await user.click(screen.getByRole('button', { name: 'Food information' }));

    expect(screen.getByText(/Ingredients have not been supplied/i)).toBeVisible();
    expect(screen.getByText(/Nutrition values have not been supplied/i)).toBeVisible();
    expect(screen.getByText(/Origin details have not been supplied/i)).toBeVisible();
  });

  it('renders structured preparation steps as an ordered list', async () => {
    const user = userEvent.setup();
    const product = productFixture({
      metafields: {
        ...emptyMetafields(),
        preparation: metafield('1. Warm gently\n2. Stir before serving'),
      },
    });

    const { container } = render(<ProductFacts product={product} />);
    await user.click(screen.getByRole('button', { name: 'Preparation' }));

    const list = container.querySelector('ol');
    expect(list).not.toBeNull();
    expect(within(list as HTMLElement).getByText('Warm gently')).toBeVisible();
    expect(within(list as HTMLElement).getByText('Stir before serving')).toBeVisible();
  });

  it('does not execute scripts from Shopify description HTML', () => {
    const product = productFixture({
      descriptionHtml: '<p>Safe product copy.</p><script>window.__xss = true</script>',
    });

    const { container } = render(<ProductFacts product={product} />);

    expect(container.textContent).toContain('Safe product copy.');
    expect(container.querySelector('script')).toBeNull();
  });
});
