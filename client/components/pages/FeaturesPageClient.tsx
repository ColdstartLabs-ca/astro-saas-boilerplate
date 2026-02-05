'use client';

import React from 'react';
import { Shield, Zap, Users, BarChart, Lock, RefreshCw, Globe, CreditCard } from 'lucide-react';
import { getTranslations } from '@src/i18n/utils';
import { useMemo } from 'react';
import { clientEnv } from '@shared/config/env';

const features = [
  {
    icon: Shield,
    title: 'Authentication',
    description:
      'Built-in authentication with Supabase supporting Google, Azure, and Email/Password providers.',
  },
  {
    icon: CreditCard,
    title: 'Payments',
    description:
      'Stripe integration for subscriptions and one-time purchases with comprehensive billing management.',
  },
  {
    icon: BarChart,
    title: 'Credit System',
    description:
      'Flexible credit-based pricing with subscription credits, purchased credits, and automatic rollover.',
  },
  {
    icon: Users,
    title: 'User Management',
    description: 'Complete user profile management with admin roles and team support capabilities.',
  },
  {
    icon: Lock,
    title: 'Security',
    description:
      'Secure by default with rate limiting, error handling, and proper authentication flows.',
  },
  {
    icon: RefreshCw,
    title: 'Real-time Updates',
    description: 'Reactive state management with automatic UI updates when data changes.',
  },
  {
    icon: Globe,
    title: 'i18n Ready',
    description: 'Built-in internationalization support with easy locale management.',
  },
  {
    icon: Zap,
    title: 'Developer Experience',
    description: 'TypeScript throughout, clean architecture, and comprehensive tooling setup.',
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
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Everything you need to build your SaaS faster. Production-ready infrastructure from day
            one.
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
            <h3 className="text-2xl font-bold text-text-primary mb-4">Ready to get started?</h3>
            <p className="text-text-secondary mb-6">
              Start building your SaaS today with {clientEnv.APP_NAME}. No credit card required.
            </p>
            <div className="flex justify-center gap-4">
              <a
                href="/pricing"
                className="inline-flex items-center px-6 py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors"
              >
                View Pricing
              </a>
              <a
                href="/blog"
                className="inline-flex items-center px-6 py-3 bg-surface hover:bg-surface-light text-text-primary font-medium rounded-lg border border-border transition-colors"
              >
                Read the Blog
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
