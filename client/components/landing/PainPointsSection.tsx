'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Bot, Bug, Wrench } from 'lucide-react';

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
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
              className="relative group bg-slate-950/40 backdrop-blur-xl rounded-3xl border border-slate-800/60 overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:border-slate-700/80"
            >
              {/* Top accent glow */}
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${point.accentBar}`} />

              {/* Gradient background overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${point.bgGrad} to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
              />

              <div className="relative p-8 h-full flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  {/* Icon container */}
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-inner`}>
                    {point.icon}
                  </div>

                  {/* Subtle Number */}
                  <div className="text-2xl font-mono font-bold text-slate-800 mix-blend-plus-lighter">
                    {point.num}
                  </div>
                </div>

                <h3 className="text-2xl font-semibold text-white mb-4 tracking-tight drop-shadow-sm">{point.title}</h3>
                <p className="text-slate-400 leading-relaxed font-light mt-auto">{point.desc}</p>
              </div>
            </motion.div>
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
