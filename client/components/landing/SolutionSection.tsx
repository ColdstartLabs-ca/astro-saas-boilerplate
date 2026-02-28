'use client';

import React from 'react';
import { Settings, PenTool, CheckCheck, UploadCloud, BarChart3, ArrowRight } from 'lucide-react';

interface IProps {
  className?: string;
}

export function SolutionSection({ className = '' }: IProps): JSX.Element {
  const steps = [
    { icon: <Settings />, label: 'Keywords', desc: 'Topic Discovery' },
    { icon: <PenTool />, label: 'Content', desc: 'AI Generation' },
    { icon: <CheckCheck />, label: 'Optimize', desc: 'SEO & Humanizer' },
    { icon: <UploadCloud />, label: 'Publish', desc: 'Auto-Posting' },
    { icon: <BarChart3 />, label: 'Track', desc: 'Live Analytics' },
  ];

  return (
    <section id="solution" className={`py-24 bg-slate-950 relative overflow-hidden ${className}`}>
      {/* Background Gradient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-64 bg-brand-900/10 blur-[100px] rounded-full -z-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            One Platform. Full Pipeline. <br />
            <span className="text-brand-500">Zero Manual Work.</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            From keyword to published article — research, generate, optimize, and publish in one
            automated pipeline. Stop paying for 4 separate tools.
          </p>
        </div>

        {/* Workflow Graphic */}
        <div className="relative max-w-6xl mx-auto mb-24">
          {/* Animated Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-[2.5rem] left-0 w-full h-0.5 bg-slate-800 z-0">
            <div
              className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-brand-500 to-transparent animate-scroll opacity-50"
              style={{ animationDuration: '3s' }}
            ></div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-4 relative z-10">
            {steps.map((step, idx) => (
              <div key={idx} className="flex flex-col items-center group cursor-default">
                <div
                  className={`w-20 h-20 rounded-2xl flex items-center justify-center border-2 shadow-xl mb-6 relative transition-all duration-300 ${idx === 2 ? 'bg-slate-900 border-brand-500 text-brand-400 shadow-brand-500/20 scale-110' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'}`}
                >
                  {React.cloneElement(step.icon as React.ReactElement<{ size?: number }>, {
                    size: 32,
                  })}

                  {/* Pulse effect for middle step */}
                  {idx === 2 && (
                    <>
                      <div className="absolute inset-0 rounded-2xl border border-brand-500 animate-ping opacity-20"></div>
                      <div className="absolute -inset-4 bg-brand-500/10 rounded-full blur-xl -z-10"></div>
                    </>
                  )}
                  {/* Hover effect for others */}
                  {idx !== 2 && (
                    <div className="absolute inset-0 bg-slate-800 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity -z-10"></div>
                  )}
                </div>
                <h3 className="text-white font-bold text-lg mb-1">{step.label}</h3>
                <p className="text-slate-500 text-sm mb-2">{step.desc}</p>
                <span className="text-[10px] font-mono uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded text-slate-400 border border-slate-700">
                  Auto
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: 'Set It & Forget It',
              desc: 'Configure campaigns once. Generate fresh content automatically. Wake up to new articles ready for review.',
            },
            {
              title: 'Publish-Ready Quality',
              desc: 'Our Humanizer engine rewrites AI-typical patterns into natural prose. High pass rates on major AI detection tools. Minimal editing required.',
            },
            {
              title: 'Full Pipeline, One Platform',
              desc: 'Keyword input → AI generation → SEO optimization → CMS publishing. One subscription replaces Surfer, Jasper, a separate publisher, and your manual tracking spreadsheet.',
            },
            {
              title: 'Works With Your Stack',
              desc: "Native WordPress integration. Webhooks for Webflow, Shopify, Ghost, and custom platforms. Actually tested — not just listed as 'compatible.'",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="glass-card-template p-6 rounded-xl hover:bg-slate-800/80 transition-all duration-300 group hover:-translate-y-1"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center mb-4 group-hover:bg-brand-500/20 transition-colors">
                <ArrowRight className="w-5 h-5 text-brand-500 -rotate-45" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">{item.title}</h4>
              <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
