/**
 * pSEO (Programmatic SEO) Types
 *
 * Type definitions for programmatic SEO pages including alternatives,
 * use cases, and other SEO-focused landing pages.
 */

/** Base fields shared by all pSEO page types */
export interface IPseoBase {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  lastUpdated: string; // ISO date
}

/** FAQ item used across all pSEO pages */
export interface IFaqItem {
  question: string;
  answer: string;
}

/** Feature comparison row */
export interface IFeatureRow {
  feature: string;
  us: string | boolean;
  them: string | boolean;
}

/** Alternative page data */
export interface IAlternativePage extends IPseoBase {
  competitorName: string;
  competitorSlug: string;
  competitorUrl: string;
  competitorPricing: string;
  competitorWeaknesses: string[];
  ourAdvantages: string[];
  featureComparison: IFeatureRow[];
  heroSubtitle: string;
  whySwitchReasons: string[];
  faqs: IFaqItem[];
  relatedAlternatives: string[]; // slugs
}

/** Alternative page metadata (for listing) */
export interface IAlternativePageMeta {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  competitorName: string;
  competitorSlug: string;
  lastUpdated: string;
}

/** Pricing tier for comparison pages */
export interface IPricingTier {
  plan: string;
  price: string;
  credits: string;
}

/** Pros and cons structure */
export interface IProsCons {
  pros: string[];
  cons: string[];
}

/** Comparison page data (us vs competitor) */
export interface IComparisonPage extends IPseoBase {
  competitorA: string; // Always "AutopilotRank"
  competitorB: string;
  competitorBSlug: string;
  competitorBUrl: string;
  verdict: string;
  featureComparison: IFeatureRow[];
  pricingComparison: {
    us: IPricingTier[];
    them: IPricingTier[];
  };
  prosConsUs: IProsCons;
  prosConsThem: IProsCons;
  faqs: IFaqItem[];
  relatedComparisons: string[]; // slugs
}

/** Comparison page metadata (for listing) */
export interface IComparisonPageMeta {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  competitorA: string;
  competitorB: string;
  competitorBSlug: string;
  lastUpdated: string;
}

/** Use case page data */
export interface IUseCasePage extends IPseoBase {
  industry: string;
  painPoints: string[];
  solutionDescription: string;
  benefits: string[];
  howItWorks: { step: number; title: string; description: string }[];
  testimonial?: {
    quote: string;
    author: string;
    role: string;
    company: string;
  };
  faqs: IFaqItem[];
  relatedUseCases: string[]; // slugs
}

/** Use case page metadata (for listing) */
export interface IUseCasePageMeta {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  industry: string;
  lastUpdated: string;
}

/** Free tool page data */
export interface IToolPage extends IPseoBase {
  toolName: string;
  toolDescription: string;
  /** React component name to hydrate (e.g., "KeywordDensityTool") */
  componentName: string;
  howToUse: string[];
  whyUseIt: string[];
  faqs: IFaqItem[];
  relatedTools: string[]; // slugs
}

/** Tool page metadata (for listing) */
export interface IToolPageMeta {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  toolName: string;
  lastUpdated: string;
}
