'use client';

import { useModalStore } from '@client/store/modalStore';
import { Check, Zap } from 'lucide-react';

interface IProps {
  className?: string;
}

export function PricingPreviewSection({ className = '' }: IProps): JSX.Element {
  const { openAuthModal } = useModalStore();

  return (
    <section id="pricing" className={`py-24 bg-slate-950 relative overflow-hidden ${className}`}>
      {/* Background Gradients */}
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-900/10 blur-[120px] rounded-full -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-slate-400">
            No per-word charges. No seat limits. No surprise fees.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-start">
          {/* Starter Plan */}
          <div className="bg-slate-900/50 backdrop-blur rounded-2xl p-8 border border-slate-800 hover:border-slate-700 transition-colors relative flex flex-col group">
            <h3 className="text-xl font-semibold text-white mb-2">Starter</h3>
            <p className="text-slate-400 text-sm mb-6">Perfect for solopreneurs</p>
            <div className="flex items-baseline mb-8">
              <span className="text-4xl font-bold text-white">$49</span>
              <span className="text-slate-500 ml-2">/month</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              {[
                '30 articles/mo',
                '1 site included',
                'WordPress integration',
                'Humanizer Engine',
                'Standard support',
              ].map((item, i) => (
                <li key={i} className="flex items-center text-slate-300">
                  <Check className="h-4 w-4 text-brand-500 mr-3" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => openAuthModal('register')}
              className="w-full py-3 rounded-xl font-semibold transition-all duration-300 bg-elevated hover:bg-surface text-white border border-border"
            >
              Get Started
            </button>
          </div>

          {/* Growth Plan - Popular */}
          <div className="relative rounded-2xl p-[1px] bg-gradient-to-b from-brand-500 to-transparent shadow-2xl shadow-brand-900/20 transform md:-translate-y-4 z-10 flex flex-col">
            <div className="absolute inset-0 bg-brand-500/20 blur-xl -z-10"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center shadow-lg z-20">
              <Zap className="w-3 h-3 mr-1 fill-white" /> Most Popular
            </div>

            <div className="bg-slate-900 rounded-2xl p-8 h-full flex flex-col relative overflow-hidden flex-1">
              {/* Shine effect */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-brand-500/10 blur-2xl rounded-full pointer-events-none"></div>

              <h3 className="text-xl font-semibold text-white mb-2">Growth</h3>
              <p className="text-brand-200 text-sm mb-6">For SMBs & Content Sites</p>
              <div className="flex items-baseline mb-8">
                <span className="text-5xl font-bold text-white tracking-tight">$99</span>
                <span className="text-slate-400 ml-2">/month</span>
              </div>
              <div className="w-full h-px bg-slate-800 mb-8"></div>

              {/* Features List */}
              <ul className="space-y-4 mb-8 flex-1">
                {[
                  '100 articles/mo',
                  '3 sites included',
                  'All integrations (Shopify, Webflow)',
                  'Humanizer Engine',
                  'GSC Integration',
                  'Pre-publication QA',
                  'Priority support',
                ].map((item, i) => (
                  <li key={i} className="flex items-center text-white font-medium">
                    <div className="bg-brand-500/20 p-0.5 rounded-full mr-3 shrink-0">
                      <Check className="h-4 w-4 text-brand-400" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => openAuthModal('register')}
                className="w-full py-4 text-lg font-semibold rounded-xl transition-all duration-300 bg-brand-500 hover:bg-brand-400 text-white shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40 mt-auto"
              >
                Get Started
              </button>
            </div>
          </div>

          {/* Agency Plan */}
          <div className="bg-slate-900/50 backdrop-blur rounded-2xl p-8 border border-slate-800 hover:border-slate-700 transition-colors relative flex flex-col group">
            <h3 className="text-xl font-semibold text-white mb-2">Agency</h3>
            <p className="text-slate-400 text-sm mb-6">For high volume teams</p>
            <div className="flex items-baseline mb-8">
              <span className="text-4xl font-bold text-white">$249</span>
              <span className="text-slate-500 ml-2">/month</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              {[
                '500 articles/mo',
                'Unlimited sites',
                'White-label reports (coming soon)',
                'API Access',
                'Dedicated Account Manager',
                'Custom webhooks',
                '24/7 Priority support',
              ].map((item, i) => (
                <li key={i} className="flex items-center text-slate-300">
                  <Check className="h-4 w-4 text-brand-500 mr-3" />
                  {item}
                </li>
              ))}
            </ul>
            <button className="w-full py-3 rounded-xl font-semibold transition-all duration-300 bg-elevated hover:bg-surface text-white border border-border">
              Contact Sales
            </button>
          </div>
        </div>

        <div className="text-center mt-12 text-slate-500 text-sm">
          Pay as you go • Cancel anytime
        </div>
      </div>
    </section>
  );
}
