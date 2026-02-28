'use client';

import React from 'react';
import {
  Cpu,
  Wand2,
  Globe,
  CalendarClock,
  Coins,
  Search,
  LinkIcon,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface IFeatureSection {
  id: string;
  icon: React.ElementType;
  badge: string;
  title: string;
  description: string;
  bullets: string[];
  screenshotAlt: string;
  reversed?: boolean;
  learnMoreSlug?: string;
}

const featureSections: IFeatureSection[] = [
  {
    id: 'multi-model-ai',
    icon: Cpu,
    badge: 'AI Engine',
    title: 'Multi-Model AI Selection',
    description:
      'Choose the right AI for every job. AutopilotRank gives you four tiers of AI power so you can match quality to budget — never overpay for simple content, never compromise on high-value pages.',
    bullets: [
      'Budget tier: Gemini Flash — fast, cost-efficient for informational content',
      'Balanced tier: GPT-4o mini — solid quality for most use cases',
      'Pro tier: GPT-4o — high-quality output for competitive keywords',
      'Ultra tier: Claude Opus — best-in-class for money pages and pillar content',
    ],
    screenshotAlt: 'AI model selection interface showing four tiers: Budget, Balanced, Pro, Ultra',
  },
  {
    id: 'humanizer',
    icon: Wand2,
    badge: 'Humanizer',
    title: 'Built-In AI Humanizer',
    description:
      'Every article passes through our proprietary humanizer post-processing layer before delivery. It rewrites AI-typical sentence patterns into natural, human-sounding prose — so your content passes AI detectors and reads authentically.',
    bullets: [
      'Post-processing pipeline runs automatically after each generation',
      'Targets and rewrites AI-detection trigger patterns',
      'Preserves factual accuracy and SEO intent during rewrite',
      'Tested against major AI detectors (GPTZero, Originality.ai, Copyleaks)',
    ],
    screenshotAlt: 'Humanizer processing view showing before/after AI detection score',
    reversed: true,
    learnMoreSlug: 'humanizer',
  },
  {
    id: 'cms-publishing',
    icon: Globe,
    badge: 'Publishing',
    title: 'One-Click CMS Publishing',
    description:
      'Connect your CMS and publish articles directly from AutopilotRank — no copy-pasting, no manual uploads. Full autopilot mode publishes approved content automatically.',
    bullets: [
      'Native WordPress integration via REST API with Application Passwords',
      'Webflow, Shopify, Ghost, and Notion via webhook adapter',
      'Publish as draft or live post — your choice',
      'Full autopilot mode: auto-publish after QA checks pass',
      'Review mode: queue articles for approval before they go live',
    ],
    screenshotAlt: 'One-click WordPress publish button on article review screen',
    learnMoreSlug: 'auto-publishing',
  },
  {
    id: 'campaign-scheduling',
    icon: CalendarClock,
    badge: 'Automation',
    title: 'Campaign Scheduling & Cron Automation',
    description:
      'Set your campaign once and let AutopilotRank run it on a recurring schedule. Whether you want daily articles or a few per week, the scheduler handles generation and publishing automatically — no manual triggers needed.',
    bullets: [
      '8 scheduling frequencies: from 3x daily down to every 2 weeks',
      'Per-campaign cron automation — each campaign runs independently',
      'Auto-generates from your keyword queue on schedule',
      'Pairs with WordPress autopilot for fully hands-off publishing',
    ],
    screenshotAlt: 'Campaign schedule configuration showing frequency options and next run time',
    reversed: true,
    learnMoreSlug: 'auto-publishing',
  },
  {
    id: 'credits',
    icon: Coins,
    badge: 'Credits',
    title: 'Flexible Credit System',
    description:
      'Pay for exactly what you use. Credits scale with the AI model you choose — not a flat per-article fee that forces you to compromise. Subscription credits roll over so you never lose what you paid for.',
    bullets: [
      'Budget articles cost 1 credit, Ultra articles cost 3 credits',
      'Subscription credits roll over up to 3x your monthly limit',
      'One-time credit packs available if you need a burst (never expire)',
      'Credits are automatically refunded if generation fails',
    ],
    screenshotAlt: 'Credits dashboard showing balance, usage history, and rollover meter',
  },
  {
    id: 'keyword-pipeline',
    icon: Search,
    badge: 'Research',
    title: 'Keyword-to-Article Pipeline',
    description:
      'Feed AutopilotRank a list of target keywords and it handles the rest. Import manually, via CSV bulk upload, or connect Google Search Console to surface keyword opportunities directly from your existing traffic data.',
    bullets: [
      'Manual entry, CSV bulk import, or GSC-powered discovery',
      'Keyword queue feeds directly into campaign automation',
      'GSC integration finds high-impression, low-click opportunities',
      'Target keywords are woven into headings, meta, and body copy',
    ],
    screenshotAlt: 'Keyword import screen with CSV upload and Google Search Console connection',
    reversed: true,
    learnMoreSlug: 'keyword-research',
  },
  {
    id: 'seo-optimization',
    icon: LinkIcon,
    badge: 'SEO',
    title: 'Built-In SEO Optimization',
    description:
      'AutopilotRank treats SEO as a first-class output, not an afterthought. Every generated article includes optimized meta tags, a structured heading hierarchy, and automatic internal linking to related content on your site.',
    bullets: [
      'Auto-generated title tags and meta descriptions optimized for CTR',
      'Proper H1/H2/H3 heading structure for each article',
      'Internal linking engine connects new articles to existing content',
      'Schema markup generation for eligible content types',
    ],
    screenshotAlt:
      'SEO panel showing meta title, description, heading structure, and internal links',
    learnMoreSlug: 'content-quality',
  },
];

const statsBar = [
  { value: '4', label: 'AI model tiers' },
  { value: '8', label: 'Schedule frequencies' },
  { value: '3×', label: 'Credit rollover cap' },
  { value: '1-click', label: 'WordPress publish' },
];

export default function FeaturesPageClient(): React.ReactElement {
  return (
    <main className="flex-1 bg-main">
      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/8 via-transparent to-secondary/8 pointer-events-none" />
        <div className="container mx-auto px-6 max-w-4xl text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-full text-accent text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Full feature breakdown
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold text-text-primary mb-5 tracking-tight">
            Everything you need to scale
            <br />
            <span className="text-accent">SEO content on autopilot</span>
          </h1>
          <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed mb-8">
            From keyword input to published article — AutopilotRank handles generation,
            humanization, SEO optimization, and CMS publishing in one automated pipeline.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <a
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors"
            >
              Start free — 3 articles included
              <ChevronRight className="w-4 h-4" />
            </a>
            <a
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-surface hover:bg-elevated text-text-primary font-semibold rounded-lg border border-border transition-colors"
            >
              See pricing
            </a>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div className="border-y border-border bg-surface/40">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border">
            {statsBar.map(stat => (
              <div key={stat.label} className="flex flex-col items-center py-5 px-4">
                <span className="text-3xl font-bold text-accent">{stat.value}</span>
                <span className="text-xs text-text-secondary mt-1 text-center">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature sections */}
      <div className="container mx-auto px-6 max-w-6xl py-16 space-y-24">
        {featureSections.map(feature => {
          const Icon = feature.icon;
          const isReversed = feature.reversed === true;

          return (
            <section
              key={feature.id}
              id={feature.id}
              className={`flex flex-col ${isReversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 lg:gap-16 items-center`}
            >
              {/* Copy */}
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-accent text-xs font-medium mb-4">
                  <Icon className="w-3.5 h-3.5" />
                  {feature.badge}
                </div>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-4 leading-tight">
                  {feature.title}
                </h2>
                <p className="text-text-secondary leading-relaxed mb-6">{feature.description}</p>
                <ul className="space-y-3">
                  {feature.bullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/15 flex items-center justify-center mt-0.5">
                        <svg
                          className="w-2.5 h-2.5 text-accent"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </span>
                      <span className="text-sm text-text-secondary leading-relaxed">{bullet}</span>
                    </li>
                  ))}
                </ul>
                {feature.learnMoreSlug && (
                  <a
                    href={`/features/${feature.learnMoreSlug}`}
                    className="inline-flex items-center gap-1.5 mt-6 text-sm font-medium text-accent hover:text-accent-hover transition-colors"
                  >
                    Learn more about this feature
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Screenshot placeholder */}
              <div className="flex-1 min-w-0 w-full">
                <div className="relative rounded-2xl overflow-hidden border border-border bg-surface/50 aspect-[16/10]">
                  {/* Fake browser chrome */}
                  <div className="absolute top-0 inset-x-0 h-8 bg-elevated border-b border-border flex items-center gap-1.5 px-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-border" />
                    <span className="w-2.5 h-2.5 rounded-full bg-border" />
                    <span className="w-2.5 h-2.5 rounded-full bg-border" />
                  </div>
                  {/* Placeholder fill */}
                  <div className="absolute inset-0 top-8 flex flex-col items-center justify-center gap-3 bg-surface/30">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-accent/50" />
                    </div>
                    <span className="text-xs text-muted-foreground text-center max-w-[200px] leading-relaxed px-4">
                      {feature.screenshotAlt}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Feature summary grid */}
      <div className="bg-surface/30 border-y border-border py-16">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-3">
              Everything included in every plan
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto text-sm leading-relaxed">
              Core features are available on all plans. Higher plans unlock more credits, faster
              generation queues, and priority support.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Cpu, title: 'Multi-model AI', desc: 'Budget through Ultra tier selection' },
              {
                icon: Wand2,
                title: 'AI Humanizer',
                desc: 'Automatic post-processing on every article',
              },
              {
                icon: Globe,
                title: 'WordPress publishing',
                desc: 'One-click or full autopilot mode',
              },
              {
                icon: CalendarClock,
                title: 'Campaign scheduling',
                desc: 'Recurring cron automation',
              },
              {
                icon: Coins,
                title: 'Credit rollover',
                desc: 'Unused credits carry forward each month',
              },
              {
                icon: Search,
                title: 'Keyword pipeline',
                desc: 'Manual, CSV, or GSC-powered import',
              },
              {
                icon: LinkIcon,
                title: 'Internal linking',
                desc: 'Auto-links to related site content',
              },
              {
                icon: Sparkles,
                title: 'SEO optimization',
                desc: 'Meta tags, headings, and schema markup',
              },
            ].map(item => {
              const ItemIcon = item.icon;
              return (
                <div
                  key={item.title}
                  className="bg-surface rounded-xl p-5 border border-border hover:border-accent/30 transition-colors group"
                >
                  <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-accent/20 transition-colors">
                    <ItemIcon className="w-4.5 h-4.5 text-accent" />
                  </div>
                  <h3 className="text-sm font-semibold text-text-primary mb-1">{item.title}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-6 max-w-3xl text-center">
          <div className="bg-gradient-to-br from-accent/10 via-surface to-secondary/10 rounded-2xl p-10 border border-accent/20">
            <h2 className="font-display text-3xl font-bold text-text-primary mb-4">
              Ready to put your content on autopilot?
            </h2>
            <p className="text-text-secondary mb-8 leading-relaxed max-w-xl mx-auto">
              Start with 3 free articles — no credit card required. See the full pipeline in action:
              keyword in, published article out.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <a
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors"
              >
                Get started free
                <ChevronRight className="w-4 h-4" />
              </a>
              <a
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-surface hover:bg-elevated text-text-primary font-semibold rounded-lg border border-border transition-colors"
              >
                View plans & pricing
              </a>
            </div>
            <p className="text-xs text-muted-foreground mt-5">
              Starter from $49/mo · Growth from $99/mo · Agency from $249/mo
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
