import { describe, expect, it } from 'vitest';
import {
  PRODUCT_STORIES,
  type ProductStoryLanguage,
  type StoryImage,
  type StorySectionKey,
} from './productStories';

const LANGUAGES: ProductStoryLanguage[] = ['en', 'de', 'fr'];
const EXPECTED_SECTIONS: StorySectionKey[] = ['people', 'grown', 'made', 'exported', 'packed'];
const IMAGE_PATH = /^\/images\/stories\/[\w-]+\/[\w-]+\.webp$/;
const VIDEO_PATH = /^\/videos\/stories\/[\w-]+\/[\w-]+\.mp4$/;

function expectImage(image: StoryImage): void {
  expect(image.image).toMatch(IMAGE_PATH);
  expect(image.credit.length).toBeGreaterThan(0);
  if (image.creditUrl) expect(image.creditUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
  for (const language of LANGUAGES) {
    expect(image.imageAlt[language].trim().length).toBeGreaterThan(0);
  }
}

describe('product stories', () => {
  it('only includes the products that are currently on the About page', () => {
    expect(PRODUCT_STORIES.map((story) => story.slug)).toEqual(['coffee', 'ubuki']);
    expect(PRODUCT_STORIES.some((story) => /indagara|ibishyimbo/.test(story.slug))).toBe(false);
  });

  it('gives every story the five process stages in order', () => {
    for (const story of PRODUCT_STORIES) {
      expect(story.sections.map((section) => section.key)).toEqual(EXPECTED_SECTIONS);
    }
  });

  it('gives every stage a translated body, alt text, image and credit', () => {
    for (const story of PRODUCT_STORIES) {
      for (const section of story.sections) {
        expectImage(section);
        for (const language of LANGUAGES) {
          expect(section.body[language].trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('never shows chapter numbers in story copy', () => {
    for (const story of PRODUCT_STORIES) {
      const copy = [
        ...Object.values(story.title),
        ...Object.values(story.summary),
        ...Object.values(story.body),
        ...Object.values(story.detail),
        ...story.sections.flatMap((section) => Object.values(section.body)),
      ];
      expect(copy.some((text) => /Chapter\s+\d+/i.test(text))).toBe(false);
    }
  });

  it('uses clear, translated coffee copy', () => {
    const coffee = PRODUCT_STORIES.find((story) => story.slug === 'coffee');
    expect(coffee?.title.en).toBe('BeNa SheGrows Coffee');
    expect(coffee?.summary.en).toBe('Rwandan coffee from women-led farms, hand-sorted with care.');
    expect(coffee?.detail.en).toContain('bright citrus and berry notes');
    expect(coffee?.sections.find((section) => section.key === 'grown')?.body.en).toContain(
      'more than 1,500 metres above sea level',
    );
    expect(coffee?.sections.find((section) => section.key === 'made')?.body.en).toContain(
      'raised beds under the highland sun',
    );
    expect(coffee?.sections.find((section) => section.key === 'packed')?.body.en).toContain(
      'hand-sorted in Rwanda',
    );
  });

  it('gives every story its own logo and packaging image', () => {
    for (const story of PRODUCT_STORIES) {
      expectImage(story.logo);
      expectImage(story.packaging);
      expect(story.sections.find((section) => section.key === 'packed')?.image).toBe(
        story.packaging.image,
      );
    }
  });

  it('gives the coffee and honey stories owner-supplied hero images', () => {
    for (const slug of ['coffee', 'ubuki']) {
      const story = PRODUCT_STORIES.find((item) => item.slug === slug);
      expect(story?.hero).toBeDefined();
      if (story?.hero) expectImage(story.hero);
    }
  });

  it('links every supplied gallery image and video to a local asset', () => {
    const coffee = PRODUCT_STORIES.find((story) => story.slug === 'coffee');
    expect(coffee?.gallery?.length).toBe(6);
    expect(coffee?.videos?.length).toBe(2);
    for (const image of coffee?.gallery ?? []) expectImage(image);
    for (const video of coffee?.videos ?? []) {
      expect(video.src).toMatch(VIDEO_PATH);
      expect(video.poster).toMatch(IMAGE_PATH);
      expect(video.credit.length).toBeGreaterThan(0);
      for (const language of LANGUAGES) {
        expect(video.posterAlt[language].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('uses stable slugs and translated titles', () => {
    const slugs = PRODUCT_STORIES.map((story) => story.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const story of PRODUCT_STORIES) {
      for (const language of LANGUAGES) {
        expect(story.title[language].trim().length).toBeGreaterThan(0);
      }
    }
  });
});
