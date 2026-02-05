'use client';

import React from 'react';
import { Bot, Bug, Wrench, ArrowRight } from 'lucide-react';

interface IProps {
  className?: string;
}

export function PainPointsSection({ className = '' }: IProps): JSX.Element {
  const points = [
    {
      icon: <Bot className="h-8 w-8 text-red-400" />,
      title: 'AI Content That Screams AI',
      desc: "You've tried AI writers. The output is generic, repetitive, and needs hours of editing. Google knows. Your readers know.",
    },
    {
      icon: <Bug className="h-8 w-8 text-orange-400" />,
      title: 'Buggy Tools, Zero Support',
      desc: "Outrank crashes. Byword doesn't work with your host. Support takes days. You're paying $99/month for frustration.",
    },
    {
      icon: <Wrench className="h-8 w-8 text-yellow-400" />,
      title: '3 Tools Just for SEO Content',
      desc: 'Surfer for optimization. Jasper for writing. Ahrefs for keywords. $300/month and you still do all the work.',
    },
  ];

  return (
    <section className={`py-24 bg-slate-900 border-y border-slate-800 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Sound Familiar?</h2>
          <p className="text-lg text-slate-400">The current state of AI SEO tools is broken.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {points.map((point, idx) => (
            <div
              key={idx}
              className="bg-slate-950 p-8 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <div className="bg-slate-900 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
                {point.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{point.title}</h3>
              <p className="text-slate-400 leading-relaxed">{point.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <a
            href="#solution"
            className="inline-flex items-center text-brand-400 hover:text-brand-300 font-medium text-lg transition-colors group"
          >
            There&apos;s a better way
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
}
