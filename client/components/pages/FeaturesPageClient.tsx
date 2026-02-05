'use client';

import React from 'react';
import {
  Cpu,
  Wand2,
  ShieldCheck,
  FileText,
  Search,
  Calendar,
  Globe,
  Edit,
} from 'lucide-react';
import { getTranslations } from '@src/i18n/utils';
import { useMemo } from 'react';
import { clientEnv } from '@shared/config/env';

const features = [
  {
    icon: Cpu,
    title: 'Multi-Model AI Engine',
    description:
      'GPT-4, Claude, Gemini, and Llama working together. The best model for each task means more variety and better quality.',
  },
  {
    icon: Wand2,
    title: 'Humanizer Engine',
    description:
      'Our proprietary rewriting engine transforms AI patterns into natural prose. Content that flows like a human wrote it.',
  },
  {
    icon: ShieldCheck,
    title: 'Pre-Publication QA',
    description:
      'Plagiarism check, AI detection score, SEO optimization, readability analysis—all automatic. Nothing slips through.',
  },
  {
    icon: FileText,
    title: 'Campaign Management',
    description:
      'Create keyword campaigns that generate hundreds of articles automatically. Set it once, watch it scale.',
  },
  {
    icon: Search,
    title: 'GSC Integration',
    description:
      'Connect Google Search Console and let AutopilotRank find your best content opportunities automatically.',
  },
  {
    icon: Globe,
    title: 'WordPress Publishing',
    description:
      'Native WordPress plugin with one-click publishing. Also supports Webflow, Shopify, Ghost, and webhooks.',
  },
  {
    icon: Calendar,
    title: 'Content Calendar',
    description:
      'Editorial calendar with scheduled publishing. Plan your content strategy months in advance.',
  },
  {
    icon: Edit,
    title: 'Article Editor',
    description:
      'Inline review and editing interface. Approve, edit, or reject content before it publishes.',
  },
];

export default function FeaturesPageClient(): React.ReactElement {
  const _t = useMemo(() => getTranslations('common'), []);

  return (
    <main className="flex-1 bg-main">
      <div className="container mx-auto py-16 px-6">
        {/* Page Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">Features</h1>
          <p className="text-lg text-text-secondary max-w-3xl mx-auto">
            Complete AI SEO content automation. From keyword research to published content—entirely on
            autopilot.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-surface p-6 rounded-lg border border-border hover:border-accent/50 transition-colors group"
              >
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                  <Icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">{feature.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-br from-accent/10 to-secondary/10 rounded-2xl p-8 max-w-2xl mx-auto border border-accent/20">
            <h3 className="text-2xl font-bold text-text-primary mb-4">Ready to scale your content?</h3>
            <p className="text-text-secondary mb-6">
              Start generating publish-ready SEO content with {clientEnv.APP_NAME}. 3 free articles, no
              credit card required.
            </p>
            <div className="flex justify-center gap-4">
              <a
                href="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors"
              >
                See Pricing
              </a>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-surface hover:bg-elevated text-text-primary font-semibold rounded-lg border border-border transition-colors"
              >
                Back to Home
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
