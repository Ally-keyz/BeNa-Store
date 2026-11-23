import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import logoUrl from '@/assets/logo_new.png';
import { BRAND } from '@/config';
import { useProducts } from '@/hooks/useCatalog';
import i18n from '@/i18n';
import { productFixture } from '@/test/fixtures';
import { HeroCarousel } from './HeroCarousel';

vi.mock('@/hooks/useCatalog', () => ({ useProducts: vi.fn() }));
vi.mock('@/context/MarketContext', () => ({
  useMarket: () => ({ marketParams: { country: 'DE', language: 'en' }, formatLocale: 'en-IE' }),
}));
vi.mock('@/hooks/useMediaQuery', () => ({ usePrefersReducedMotion: () => true }));

const useProductsMock = vi.mocked(useProducts);

describe('HeroCarousel brand slide', () => {
  beforeEach(() => {
    useProductsMock.mockReturnValue({ data: { items: [] } } as never);
  });

  it('keeps the logo first when live products load', async () => {
    const user = userEvent.setup();
    const image = {
      url: 'https://example.com/coffee.jpg',
      altText: 'Coffee bag',
      width: 800,
      height: 800,
    };
    useProductsMock.mockReturnValue({
      data: {
        items: [
          productFixture({
            id: 'gid://shopify/Product/2',
            handle: 'test-coffee',
            title: 'Test Coffee',
            featuredImage: image,
            images: [image],
          }),
        ],
      },
    } as never);

    render(
      <MemoryRouter>
        <HeroCarousel />
      </MemoryRouter>,
    );

    const logo = screen.getByRole('img');
    expect(logo).toHaveAttribute('src', logoUrl);
    expect(logo).toHaveAttribute('alt', BRAND.name);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      String(i18n.t('hero.slides.rwanda.title')),
    );
    expect(screen.getByRole('button', { name: 'Go to slide 1' })).toHaveAttribute(
      'aria-current',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(await screen.findByAltText(image.altText!)).toHaveAttribute('src', image.url);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test Coffee');
    });
  });

  it('keeps the logo first when only fallback slides are available', () => {
    render(
      <MemoryRouter>
        <HeroCarousel />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('img')[0]).toHaveAttribute('src', logoUrl);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      String(i18n.t('hero.slides.rwanda.title')),
    );
  });
});
