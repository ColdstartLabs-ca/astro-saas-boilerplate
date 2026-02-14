'use client';

import React from 'react';
import { Brain, Sparkles, ShieldCheck, UploadCloud, BarChart3, Zap } from 'lucide-react';

interface IProps {
  className?: string;
}

export function FeaturesSection({ className = '' }: IProps): JSX.Element {
  const features = [
    {
      title: 'Why Most AI SEO Tools Sound Identical (And How We&apos;re Different)',
      desc: 'Most tools: GPT-4 or Claude. Pick one. Get repetitive output. AutopilotRank: GPT-4o, Claude Sonnet, Gemini Flash. Use each strategically for different content types. More variety. Less repetition. Better rankings.',
      sub: 'Google&apos;s systems detect repetitive patterns across sites using the same AI model. Multi-model approach = more natural content footprint.',
      icon: <Brain className="h-6 w-6 text-brand-400" />,
      image:
        'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800&h=600',
      alt: 'AI Model Selection Interface',
    },
    {
      title: 'Stop Editing AI Content For 2-4 Hours Per Article',
      desc: 'Problem: Even &apos;good&apos; AI content has tells—overuse of transition words, predictable sentence structures, generic phrases, lack of specific opinions. Solution: Our Humanizer engine rewrites content to avoid 24+ known AI patterns. Result: 95%+ pass rate on AI detection tools. Average editing time: 0 minutes.',
      sub: 'No more &apos;In today&apos;s digital landscape&apos; intros that scream AI.',
      icon: <Sparkles className="h-6 w-6 text-purple-400" />,
      image:
        'https://images.unsplash.com/photo-1555421689-d68471e189f2?auto=format&fit=crop&q=80&w=800&h=600',
      alt: 'Human-like content editor',
    },
    {
      title: 'Quality Checks That Catch Issues Before They Cost You Rankings',
      desc: 'Before publishing, we check: SEO optimization score (keyword density, heading structure, meta description), AI detection score (will this flag as AI?), readability analysis (grade level, sentence length), plagiarism check (original content verification). Nothing gets published that doesn&apos;t meet thresholds.',
      sub: 'Most tools publish first, let you find problems later.',
      icon: <ShieldCheck className="h-6 w-6 text-blue-400" />,
      image:
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800&h=600',
      alt: 'Quality Assurance Dashboard',
    },
    {
      title: 'Publish Directly to Your CMS (Not Export/Import Hell)',
      desc: 'Other tools: Export as file. You copy-paste into WordPress. Hope formatting works. AutopilotRank: Connect your site. Articles publish directly. Categories, tags, featured image, status—handled automatically. Supported: Native WordPress REST API. Webhooks for Webflow, Shopify, Ghost, custom platforms.',
      sub: 'Unlike some competitors, we test compatibility across hosting providers.',
      icon: <UploadCloud className="h-6 w-6 text-green-400" />,
      image:
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800&h=600',
      alt: 'CMS Publishing Interface',
    },
    {
      title: 'Stop Guessing—Let Your Own Search Data Guide Content Strategy',
      desc: 'Connect Google Search Console. We analyze: Keywords you&apos;re already ranking for (positions 11-30), content gaps (keywords where competitors rank but you don&apos;t have content), quick wins (low competition, decent volume, you&apos;re close to ranking). Result: Data-driven content roadmap, not &apos;this keyword seems good&apos; guesses.',
      sub: 'Your search data knows best. We help you listen to it.',
      icon: <BarChart3 className="h-6 w-6 text-orange-400" />,
      image:
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800&h=600',
      alt: 'GSC Analytics Dashboard',
    },
  ];

  return (
    <section
      id="features"
      className={`py-24 bg-slate-900 border-y border-slate-800 relative ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-24">
          <span className="text-brand-500 font-semibold tracking-wider uppercase text-sm mb-4 block">
            Feature Deep Dive
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Built for Quality at Scale
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            We didn&apos;t just wrap ChatGPT in a UI. We built a complete publishing engine.
          </p>
        </div>

        <div className="space-y-32">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${idx % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12 lg:gap-24 group`}
            >
              {/* Text Side */}
              <div className="flex-1 space-y-8">
                <div className="inline-flex items-center justify-center p-4 bg-slate-800/50 rounded-2xl mb-4 border border-slate-700 shadow-inner">
                  {feature.icon}
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                  {feature.title}
                </h3>
                <p className="text-lg text-slate-400 leading-relaxed">{feature.desc}</p>
                <div className="pl-6 border-l-2 border-brand-500/30 py-2">
                  <p className="text-sm text-slate-500 italic flex items-center">
                    <Zap className="w-3 h-3 mr-2 text-yellow-500" />
                    &ldquo;{feature.sub}&rdquo;
                  </p>
                </div>
              </div>

              {/* Image Side */}
              <div className="flex-1 w-full relative perspective-1000">
                {/* Decorative blob behind image */}
                <div
                  className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr ${idx === 0 ? 'from-brand-500/20' : idx === 1 ? 'from-purple-500/20' : 'from-blue-500/20'} to-transparent blur-3xl -z-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700`}
                ></div>

                <div
                  className={`relative rounded-2xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-800 transform transition-transform duration-700 ${idx % 2 === 0 ? 'group-hover:rotate-y-2' : 'group-hover:-rotate-y-2'}`}
                >
                  <div className="absolute inset-0 bg-slate-900/10 z-10 pointer-events-none"></div>

                  {/* Image with slow zoom effect */}
                  <div className="overflow-hidden">
                    <img
                      src={feature.image}
                      alt={feature.alt}
                      className="w-full h-auto object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-1000 transform group-hover:scale-110 ease-out"
                    />
                  </div>

                  {/* Overlay UI elements to make it look active */}
                  <div className="absolute bottom-6 left-6 right-6 p-4 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700 z-20 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 delay-100">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-white">System Status</div>
                      <div className="text-xs text-brand-400 flex items-center">
                        <span className="w-2 h-2 bg-brand-500 rounded-full mr-2 animate-pulse"></span>
                        Operational
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
