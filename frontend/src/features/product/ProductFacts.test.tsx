import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductFacts } from './ProductFacts';
import { emptyMetafields, metafield, productFixture } from '@/test/fixtures';
import { getAiSuggestions } from '@/api/endpoints';
import type { AISuggestion } from '@/types';

vi.mock('@/api/endpoints', () => ({ getAiSuggestions: vi.fn() }));

const getAi = vi.mocked(getAiSuggestions);

beforeEach(() => {
  getAi.mockReset();
  getAi.mockRejectedValue(new Error('AI unavailable'));
});

describe('ProductFacts', () => {
  it('emphasizes a supplied allergen declaration', async () => {
    const user = userEvent.setup();
    const product = productFixture({
      metafields: { ...emptyMetafields(), allergens: metafield('Contains tree nuts') },
    });

    render(<ProductFacts product={product} />);

    expect(screen.getByRole('note', { name: 'Allergen information' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Allergens' }));
    const region = screen.getByRole('region', { name: 'Allergens' });
    expect(within(region).getByText('Contains tree nuts')).toBeVisible();
    expect(within(region).getByText(/Always check the product packaging/i)).toBeVisible();
  });

  it('explains that AI checks product details instead of showing an allergen alert when none exist', async () => {
    const user = userEvent.setup();
    render(<ProductFacts product={productFixture()} />);

    await user.click(screen.getByRole('button', { name: 'Allergens' }));
    const region = screen.getByRole('region', { name: 'Allergens' });
    expect(within(region).getByText(/AI checks the product description/i)).toBeVisible();
    expect(screen.queryByRole('note', { name: 'Allergen information' })).toBeNull();
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

  it('uses AI values in the existing product fact sections when suggestions arrive', async () => {
    const user = userEvent.setup();
    const suggestion: AISuggestion = {
      productId: 'gid://shopify/Product/1',
      handle: 'rwanda-honey',
      title: 'Rwanda Honey',
      verified: false,
      needsReview: true,
      suggestedAt: '2026-11-20T10:00:00.000Z',
      model: 'test-model',
      ingredients: { value: 'Forest honey', confidence: 0.7, rationale: 'Title says honey.' },
      allergens: { value: 'Tree nuts', confidence: 0.6, rationale: 'Possible trace.' },
      nutrition: { value: 'unspecified', confidence: 0.4, rationale: 'No label data.' },
      origin: { value: 'Rwanda', confidence: 0.8, rationale: 'Title says Rwanda.' },
      preparation: { value: 'Warm gently before serving.', confidence: 0.5, rationale: 'Typical use.' },
      disclaimer: 'English fallback',
    };
    getAi.mockResolvedValue({ data: suggestion, meta: {} as never });

    render(<ProductFacts product={productFixture()} />);

    await user.click(screen.getByRole('button', { name: 'Allergens' }));
    const allergensRegion = screen.getByRole('region', { name: 'Allergens' });
    expect(await within(allergensRegion).findByText('Tree nuts')).toBeVisible();
    expect(within(allergensRegion).queryByText(/AI checks the product description/i)).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Food information' }));
    const foodRegion = screen.getByRole('region', { name: 'Food information' });
    expect(await within(foodRegion).findByText('Forest honey')).toBeVisible();
    expect(within(foodRegion).getByText('Rwanda')).toBeVisible();
    expect(within(foodRegion).queryByText(/unspecified/i)).toBeNull();
    expect(within(foodRegion).queryByText(/Ingredients have not been supplied/i)).toBeNull();
    expect(within(foodRegion).queryByText(/Nutrition values have not been supplied/i)).toBeNull();
    expect(within(foodRegion).queryByText(/Origin details have not been supplied/i)).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Preparation' }));
    const preparationRegion = screen.getByRole('region', { name: 'Preparation' });
    expect(await within(preparationRegion).findByText('Warm gently before serving.')).toBeVisible();
    expect(within(preparationRegion).queryByText(/Preparation instructions have not been supplied/i)).toBeNull();

    expect(screen.queryByRole('button', { name: 'AI suggestions' })).toBeNull();
    expect(screen.getAllByText(/AI-generated suggestion/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Golden honey from Rwandan beekeepers.')).toBeVisible();
    expect(getAi).toHaveBeenCalledWith('rwanda-honey');
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
