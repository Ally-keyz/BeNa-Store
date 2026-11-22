import { describe, expect, it } from 'vitest';
import {
  PRODUCT_STORIES,
  type ProductStoryLanguage,
  type StorySectionKey,
} from './productStories';

const LANGUAGES: ProductStoryLanguage[] = ['en', 'de', 'fr'];
const EXPECTED_SECTIONS: StorySectionKey[] = ['people', 'grown', 'made', 'exported', 'packed'];

describe('product stories', () => {
  it('gives every story the five process stages in order', () => {
    for (const story of PRODUCT_STORIES) {
      expect(story.sections.map((section) => section.key)).toEqual(EXPECTED_SECTIONS);
    }
  });

  it('gives every stage a translated body, alt text, image and credit', () => {
    for (const story of PRODUCT_STORIES) {
      for (const section of story.sections) {
        expect(section.image).toMatch(/^\/images\/stories\/[\w-]+\.webp$/);
        expect(section.credit.length).toBeGreaterThan(0);
        expect(section.creditUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
        for (const language of LANGUAGES) {
          expect(section.body[language].trim().length).toBeGreaterThan(0);
          expect(section.imageAlt[language].trim().length).toBeGreaterThan(0);
        }
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
