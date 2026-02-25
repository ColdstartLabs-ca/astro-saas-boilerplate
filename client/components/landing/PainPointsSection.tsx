'use client';

import React from 'react';
import { Bot, Bug, Wrench, ArrowRight } from 'lucide-react';

interface IProps {
  className?: string;
}

export function PainPointsSection({ className = '' }: IProps): JSX.Element {
  const points = [
    {
      icon: <Bot className="h-6 w-6 text-red-400" />,
      accentBar: 'bg-red-500',
      shadowHover: 'hover:shadow-red-900/20',
      bgGrad: 'from-red-950/20',
      num: '01',
      title: 'AI Content That Screams AI',
      desc: "You've tried AI writers. The output sounds like every other AI article. You spend 2–4 hours editing each one. Google's algorithm catches the patterns. Readers notice too.",
    },
    {
      icon: <Bug className="h-6 w-6 text-orange-400" />,
      accentBar: 'bg-orange-500',
      shadowHover: 'hover:shadow-orange-900/20',
      bgGrad: 'from-orange-950/20',
      num: '02',
      title: 'Buggy Tools, Zero Support',
      desc: "You set up your campaign, come back next day — crashed. Again. Support takes 2–3 days to respond. You're paying for frustration, not results.",
    },
    {
      icon: <Wrench className="h-6 w-6 text-yellow-400" />,
      accentBar: 'bg-yellow-500',
      shadowHover: 'hover:shadow-yellow-900/20',
      bgGrad: 'from-yellow-950/10',
      num: '03',
      title: 'Tool Stack Overload',
      desc: "Surfer for optimization. Jasper for writing. Ahrefs for keywords. $300/month and you're still manually connecting the dots. Where's the actual SEO automation?",
    },
  ];

  return (
    <section className={`py-24 bg-slate-900 border-y border-slate-800 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-red-400/70 mb-4">
            The Problem With Current Tools
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Sound Familiar?</h2>
          <p className="text-lg text-slate-400">
            The current state of AI SEO tools is broken. Here&apos;s why.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {points.map((point, idx) => (
            <div
              key={idx}
              className={`relative group bg-slate-950 rounded-2xl border border-slate-800/60 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-slate-700 ${point.shadowHover}`}
            >
              {/* Top accent bar */}
              <div className={`h-[2px] w-full ${point.accentBar} opacity-70`} />

              {/* Gradient overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-b ${point.bgGrad} to-transparent pointer-events-none`}
              />

              {/* Large decorative number */}
              <div className="absolute top-4 right-6 text-[5rem] font-black text-white/[0.04] leading-none select-none tabular-nums pointer-events-none">
                {point.num}
              </div>

              <div className="relative p-8">
                {/* Icon container */}
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900/80 border border-slate-800 mb-6 group-hover:scale-110 transition-transform duration-300">
                  {point.icon}
                </div>

                <h3 className="text-xl font-bold text-white mb-3 leading-snug">{point.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">{point.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <a
            href="#solution"
            className="inline-flex items-center text-brand-400 hover:text-brand-300 font-medium text-lg transition-colors group"
          >
            See how AutopilotRank fixes this
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
}
