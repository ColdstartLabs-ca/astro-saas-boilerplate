/**
 * Unit tests for article-prompts.ts — style preferences injection
 *
 * Tests that IArticleStylePreferences fields are correctly included
 * in the prompts returned by getOutlinePrompt and getArticlePrompt.
 */

import { describe, it, expect } from 'vitest';
import { getOutlinePrompt, getArticlePrompt } from '@server/services/prompts/article-prompts';
import type { IArticleOutline, IArticleStylePreferences } from '@shared/types/article.types';

const MINIMAL_OUTLINE: IArticleOutline = {
  title: 'Best Espresso Machines',
  metaDescription: 'Discover the best espresso machines for home use.',
  slug: 'best-espresso-machines',
  sections: [
    {
      heading: 'Introduction',
      keyPoints: ['What is espresso', 'Why espresso matters'],
    },
    {
      heading: 'Top Picks',
      keyPoints: ['Budget option', 'Premium option'],
    },
  ],
};

describe('getOutlinePrompt — style preferences', () => {
  it('should include article style in the outline prompt when set', () => {
    const prefs: IArticleStylePreferences = { articleStyle: 'how-to' };
    const prompt = getOutlinePrompt('espresso machine', 'professional', 1500, undefined, prefs);

    expect(prompt).toContain('how-to');
  });

  it('should include emoji permission when includeEmojis is true', () => {
    const prefs: IArticleStylePreferences = { includeEmojis: true };
    const prompt = getOutlinePrompt('espresso machine', 'professional', 1500, undefined, prefs);

    expect(prompt).toContain('emoji');
  });

  it('should include globalInstructions in the outline prompt', () => {
    const prefs: IArticleStylePreferences = {
      globalInstructions: 'Use British English throughout.',
    };
    const prompt = getOutlinePrompt('espresso machine', 'professional', 1500, undefined, prefs);

    expect(prompt).toContain('Use British English throughout.');
  });

  it('should return a plain prompt when no style preferences are passed', () => {
    const prompt = getOutlinePrompt('espresso machine', 'professional', 1500);

    // Should not contain style-preference-only strings
    expect(prompt).not.toContain('STYLE PREFERENCES');
    expect(prompt).not.toContain('CUSTOM INSTRUCTIONS');
  });
});

describe('getArticlePrompt — style preferences', () => {
  it('should include article style section when articleStyle is set', () => {
    const prefs: IArticleStylePreferences = { articleStyle: 'listicle' };
    const prompt = getArticlePrompt(MINIMAL_OUTLINE, 'professional', 1500, 0, prefs);

    expect(prompt).toContain('listicle');
  });

  it('should include CTA instruction when includeCta is true', () => {
    const prefs: IArticleStylePreferences = { includeCta: true };
    const prompt = getArticlePrompt(MINIMAL_OUTLINE, 'professional', 1500, 0, prefs);

    expect(prompt).toContain('call-to-action');
  });

  it('should include internal link list when internalLinks and internalLinksCount are provided', () => {
    const prefs: IArticleStylePreferences = { internalLinksCount: 2 };
    const links = [
      { title: 'How to Clean Espresso Machines', url: 'https://example.com/clean-espresso' },
      { title: 'Espresso Grind Guide', url: 'https://example.com/grind-guide' },
    ];
    const prompt = getArticlePrompt(MINIMAL_OUTLINE, 'professional', 1500, 0, prefs, links);

    expect(prompt).toContain('How to Clean Espresso Machines');
    expect(prompt).toContain('https://example.com/clean-espresso');
    expect(prompt).toContain('Espresso Grind Guide');
  });

  it('should NOT include internal links section when internalLinksCount is 0', () => {
    const prefs: IArticleStylePreferences = { internalLinksCount: 0 };
    const links = [
      { title: 'How to Clean Espresso Machines', url: 'https://example.com/clean-espresso' },
    ];
    const prompt = getArticlePrompt(MINIMAL_OUTLINE, 'professional', 1500, 0, prefs, links);

    expect(prompt).not.toContain('INTERNAL LINKING');
  });

  it('should include globalInstructions in the article prompt', () => {
    const prefs: IArticleStylePreferences = {
      globalInstructions: 'Avoid using passive voice.',
    };
    const prompt = getArticlePrompt(MINIMAL_OUTLINE, 'professional', 1500, 0, prefs);

    expect(prompt).toContain('Avoid using passive voice.');
  });

  it('should omit STYLE PREFERENCES block entirely when no preferences are passed', () => {
    const prompt = getArticlePrompt(MINIMAL_OUTLINE, 'professional', 1500, 0);

    expect(prompt).not.toContain('STYLE PREFERENCES');
  });
});
