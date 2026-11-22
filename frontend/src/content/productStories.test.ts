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

  it('gives the coffee and honey stories owner-supplied hero images', () => {
    for (const slug of ['coffee', 'ubuki']) {
      const story = PRODUCT_STORIES.find((item) => item.slug === slug);
      expect(story?.hero).toBeDefined();
      if (story?.hero) expectImage(story.hero);
    }
  });

  it('links every supplied gallery image and video to a local asset', () => {
    const coffee = PRODUCT_STORIES.find((story) => story.slug === 'coffee');
    expect(coffee?.gallery?.length).toBe(5);
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
