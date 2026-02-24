/**
 * Features Data Loader Unit Tests
 *
 * Verifies that the features data loader correctly reads and exposes
 * feature page data from features-data.json.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/content/features-data.json', () => ({
  default: {
    pages: [
      {
        slug: 'auto-publishing',
        title: 'Auto-Publish SEO Content to WordPress',
        metaTitle: 'Auto-Publish SEO Content to WordPress | AutopilotRank',
        metaDescription:
          'Automatically publish AI-generated SEO articles to WordPress on a schedule.',
        h1: 'Auto-Publish SEO Content to Your CMS',
        heroSubtitle: 'Connect your CMS and publish SEO content on autopilot.',
        primaryKeyword: 'auto publish WordPress',
        secondaryKeywords: ['auto publish blog posts'],
        lastUpdated: '2026-02-23',
        featureName: 'Auto-Publishing',
        howItWorks: [{ step: 1, title: 'Connect Your CMS', description: 'Connect your CMS.' }],
        benefits: [{ title: '6 CMS Integrations', description: 'Native adapters.' }],
        planAvailability: [
          { plan: 'starter', included: true, note: '1 CMS site' },
          { plan: 'growth', included: true, note: '3 CMS sites' },
          { plan: 'agency', included: true, note: 'Unlimited CMS sites' },
        ],
        featureComparison: [
          { feature: 'WordPress Publishing', us: true, outrank: true, rankyak: true },
        ],
        faqs: [
          {
            question: 'Which CMS platforms?',
            answer: 'WordPress, Webflow, Shopify, Ghost, Notion.',
          },
        ],
        relatedFeatures: ['keyword-research', 'gsc-integration'],
      },
      {
        slug: 'humanizer',
        title: 'AI Content Humanizer — Undetectable AI Writing',
        metaTitle: 'AI Content Humanizer — Undetectable AI Writing | AutopilotRank',
        metaDescription: 'Built-in humanizer makes AI content pass detection tools.',
        h1: 'AI Content Humanizer: Write Like a Human, Scale Like a Machine',
        heroSubtitle: 'AutopilotRank built-in humanizer engine.',
        primaryKeyword: 'AI content humanizer',
        secondaryKeywords: ['humanize AI content'],
        lastUpdated: '2026-02-23',
        featureName: 'Humanizer Engine',
        howItWorks: [
          { step: 1, title: 'Anti-AI Writing Rules Applied', description: 'Rules applied.' },
        ],
        benefits: [{ title: 'No Extra Tools Needed', description: 'Built-in humanizer.' }],
        planAvailability: [
          { plan: 'starter', included: true, note: 'Humanizer engine included' },
          { plan: 'growth', included: true, note: 'Advanced humanizer' },
          { plan: 'agency', included: true, note: 'Advanced humanizer' },
        ],
        featureComparison: [
          { feature: 'Built-in Humanizer', us: true, outrank: false, rankyak: false },
        ],
        faqs: [{ question: 'What is an AI content humanizer?', answer: 'Transforms AI text.' }],
        relatedFeatures: ['content-quality', 'keyword-research'],
      },
      {
        slug: 'gsc-integration',
        title: 'Google Search Console Integration for Automated SEO',
        metaTitle: 'GSC Integration for Automated SEO | AutopilotRank',
        metaDescription: 'Connect GSC to find content gaps.',
        h1: 'Google Search Console Integration: Data-Driven SEO Automation',
        heroSubtitle: 'Connect GSC and AutopilotRank surfaces keyword opportunities.',
        primaryKeyword: 'Google Search Console integration',
        secondaryKeywords: ['GSC SEO tool'],
        lastUpdated: '2026-02-23',
        featureName: 'GSC Integration',
        howItWorks: [
          { step: 1, title: 'Connect GSC via OAuth', description: 'Authorize via OAuth.' },
        ],
        benefits: [{ title: 'Data-Driven Keyword Selection', description: 'Use real GSC data.' }],
        planAvailability: [
          { plan: 'starter', included: false, note: 'Not included' },
          { plan: 'growth', included: true, note: 'GSC integration included' },
          { plan: 'agency', included: true, note: 'GSC integration included' },
        ],
        featureComparison: [
          { feature: 'GSC Integration', us: true, outrank: false, rankyak: false },
        ],
        faqs: [{ question: 'How do I connect GSC?', answer: 'Via OAuth in the dashboard.' }],
        relatedFeatures: ['auto-publishing', 'keyword-research'],
      },
      {
        slug: 'keyword-research',
        title: 'Automated Keyword Research & AI Content Generation',
        metaTitle: 'Automated Keyword Research & AI Content Generation | AutopilotRank',
        metaDescription: 'Upload keywords via CSV.',
        h1: 'Automated Keyword Research & AI Content Generation',
        heroSubtitle: 'Upload your keyword list and generate articles on autopilot.',
        primaryKeyword: 'automated keyword research',
        secondaryKeywords: ['AI SEO content generation'],
        lastUpdated: '2026-02-23',
        featureName: 'Keyword Research & Content Generation',
        howItWorks: [
          { step: 1, title: 'Add Your Keywords', description: 'Upload CSV or enter manually.' },
        ],
        benefits: [{ title: 'Multi-Model AI Engine', description: 'GPT-4o, Claude, Gemini.' }],
        planAvailability: [
          { plan: 'starter', included: true, note: 'Batch of 5 articles' },
          { plan: 'growth', included: true, note: 'Batch of 25 articles' },
          { plan: 'agency', included: true, note: 'Batch of 100 articles' },
        ],
        featureComparison: [
          { feature: 'CSV Keyword Upload', us: true, outrank: false, rankyak: false },
        ],
        faqs: [{ question: 'Can I upload my own keyword list?', answer: 'Yes, via CSV or Excel.' }],
        relatedFeatures: ['auto-publishing', 'gsc-integration'],
      },
      {
        slug: 'content-quality',
        title: 'Pre-Publication QA & SEO Content Scoring',
        metaTitle: 'Pre-Publication QA & SEO Content Scoring | AutopilotRank',
        metaDescription: 'Every article is scored for SEO, readability, and AI detection.',
        h1: 'Pre-Publication QA: Every Article Scored Before It Goes Live',
        heroSubtitle: 'Multi-layer QA pipeline scores every article.',
        primaryKeyword: 'AI content quality scoring',
        secondaryKeywords: ['pre-publication QA'],
        lastUpdated: '2026-02-23',
        featureName: 'Pre-Publication QA',
        howItWorks: [{ step: 1, title: 'SEO Scoring', description: 'Each article is scored.' }],
        benefits: [
          { title: 'Multi-Layer Validation', description: 'SEO, readability, AI detection.' },
        ],
        planAvailability: [
          { plan: 'starter', included: true, note: 'Basic QA scoring' },
          { plan: 'growth', included: true, note: 'Full QA suite' },
          { plan: 'agency', included: true, note: 'Full QA suite' },
        ],
        featureComparison: [
          { feature: 'Pre-Publication QA', us: true, outrank: false, rankyak: false },
        ],
        faqs: [
          {
            question: 'What does pre-publication QA check?',
            answer: 'SEO, readability, AI detection.',
          },
        ],
        relatedFeatures: ['humanizer', 'auto-publishing'],
      },
    ],
  },
}));

import {
  getAllFeatureSlugs,
  getFeatureBySlug,
  getFeaturesBySlugs,
  getAllFeatures,
} from '@server/pseo/features';

describe('features data loader', () => {
  it('should load all feature pages', () => {
    expect(getAllFeatureSlugs().length).toBe(5);
  });

  it('should load feature by slug', () => {
    const feature = getFeatureBySlug('humanizer');
    expect(feature).toBeDefined();
    expect(feature?.slug).toBe('humanizer');
  });

  it('should return undefined for unknown slug', () => {
    expect(getFeatureBySlug('unknown')).toBeUndefined();
  });

  it('should get features by slugs', () => {
    const features = getFeaturesBySlugs(['humanizer', 'auto-publishing']);
    expect(features.length).toBe(2);
  });

  it('should return metadata fields for all features', () => {
    const features = getAllFeatures();
    expect(features).toHaveLength(5);
    for (const feature of features) {
      expect(feature.slug).toBeDefined();
      expect(feature.title).toBeDefined();
      expect(feature.metaTitle).toBeDefined();
      expect(feature.metaDescription).toBeDefined();
      expect(feature.h1).toBeDefined();
      expect(feature.featureName).toBeDefined();
      expect(feature.lastUpdated).toBeDefined();
    }
  });

  it('should return empty array for unknown slugs', () => {
    const features = getFeaturesBySlugs(['unknown-a', 'unknown-b']);
    expect(features).toHaveLength(0);
  });

  it('should filter out unknown slugs from mixed input', () => {
    const features = getFeaturesBySlugs(['humanizer', 'unknown-slug']);
    expect(features).toHaveLength(1);
    expect(features[0].slug).toBe('humanizer');
  });

  it('should return full feature data for known slug', () => {
    const feature = getFeatureBySlug('auto-publishing');
    expect(feature).toBeDefined();
    expect(feature?.featureName).toBe('Auto-Publishing');
    expect(feature?.howItWorks.length).toBeGreaterThan(0);
    expect(feature?.benefits.length).toBeGreaterThan(0);
    expect(feature?.planAvailability.length).toBe(3);
    expect(feature?.faqs.length).toBeGreaterThan(0);
    expect(feature?.relatedFeatures).toContain('keyword-research');
  });
});
