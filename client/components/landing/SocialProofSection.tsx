'use client';

import React from 'react';
import { Star } from 'lucide-react';

interface ISocialProofProps {
  location?: 'top' | 'bottom';
  className?: string;
}

export function SocialProofSection({ location = 'top', className = '' }: ISocialProofProps): JSX.Element {
  const logos = ["TechFlow", "GrowthMasters", "ScaleUp", "ContentKing", "RankFast", "ViralLoops"];
  // Double the logos for seamless loop
  const seamlessLogos = [...logos, ...logos, ...logos, ...logos];

  if (location === 'top') {
    return (
      <div className={`py-10 border-y border-slate-800 bg-slate-950 overflow-hidden relative ${className}`}>
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-slate-950 to-transparent z-10"></div>
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-slate-950 to-transparent z-10"></div>

        <div className="max-w-7xl mx-auto px-4 text-center mb-6">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Trusted by innovative teams</p>
        </div>

        <div className="relative flex overflow-x-hidden group">
          <div className="animate-scroll py-2 whitespace-nowrap flex gap-16 group-hover:[animation-play-state:paused]">
            {seamlessLogos.map((logo, i) => (
                <span key={i} className="text-2xl font-bold text-slate-700 font-sans hover:text-slate-300 transition-colors cursor-default select-none">{logo}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className={`py-24 bg-slate-900 border-t border-slate-800 relative overflow-hidden ${className}`}>
        {/* Background blobs */}
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-900/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Metrics Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20 border-b border-slate-800 pb-12">
                {[
                    { val: "50,000+", label: "Articles Generated" },
                    { val: "500+", label: "Happy Customers" },
                    { val: "95%", label: "AI Detection Pass Rate" },
                    { val: "4.8/5", label: "Average Rating" },
                ].map((stat, i) => (
                    <div key={i} className="text-center group">
                        <div className="text-3xl md:text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform duration-300 group-hover:text-brand-400">{stat.val}</div>
                        <div className="text-sm text-slate-400">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Testimonials */}
            <h2 className="text-3xl font-bold text-white text-center mb-4">Don&apos;t just take our word for it</h2>
            <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">Join hundreds of agencies and content creators scaling with AutopilotRank.</p>

            <div className="grid md:grid-cols-3 gap-8">
                {[
                    {
                        text: "I was skeptical about AI content, but AutopilotRank changed my mind. The quality is indistinguishable from my $200/article writers.",
                        name: "James L.",
                        role: "SEO Agency Founder",
                        img: "https://randomuser.me/api/portraits/men/32.jpg"
                    },
                    {
                        text: "Finally, a tool that actually automates the whole process. I just approve the topics and the traffic keeps growing.",
                        name: "Elena R.",
                        role: "Content Manager",
                        img: "https://randomuser.me/api/portraits/women/44.jpg"
                    },
                    {
                        text: "The integration with Shopify is flawless. We&apos;re publishing 50 product blogs a month now. Traffic is up 200%.",
                        name: "Marcus T.",
                        role: "E-commerce Director",
                        img: "https://randomuser.me/api/portraits/men/85.jpg"
                    }
                ].map((t, i) => (
                    <div key={i} className="bg-slate-950 p-8 rounded-2xl border border-slate-800 hover:border-brand-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-brand-900/10 group">
                        <div className="flex text-yellow-500 mb-6">
                            {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" className="mr-1" />)}
                        </div>
                        <p className="text-slate-300 mb-8 leading-relaxed text-lg">&ldquo;{t.text}&rdquo;</p>
                        <div className="flex items-center border-t border-slate-900 pt-6">
                            <img src={t.img} alt={t.name} className="w-12 h-12 rounded-full mr-4 grayscale group-hover:grayscale-0 transition-all duration-300" />
                            <div>
                                <div className="text-white font-semibold">{t.name}</div>
                                <div className="text-slate-500 text-sm">{t.role}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-center mt-16 gap-8 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                {/* Simulated review badges */}
                <div className="flex items-center space-x-3 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700">
                    <span className="text-orange-500 font-bold text-xl">G2</span>
                    <div className="flex flex-col">
                        <div className="flex text-orange-500"><Star size={12} fill="currentColor"/><Star size={12} fill="currentColor"/><Star size={12} fill="currentColor"/><Star size={12} fill="currentColor"/><Star size={12} fill="currentColor"/></div>
                        <span className="text-[10px] text-white uppercase font-bold tracking-wider mt-1">High Performer</span>
                    </div>
                </div>
                <div className="flex items-center space-x-3 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700">
                    <span className="text-blue-500 font-bold text-xl">Capterra</span>
                    <div className="flex flex-col">
                         <div className="flex text-blue-500"><Star size={12} fill="currentColor"/><Star size={12} fill="currentColor"/><Star size={12} fill="currentColor"/><Star size={12} fill="currentColor"/><Star size={12} fill="currentColor"/></div>
                        <span className="text-[10px] text-white uppercase font-bold tracking-wider mt-1">Top Rated</span>
                    </div>
                </div>
            </div>
        </div>
    </section>
  );
}
