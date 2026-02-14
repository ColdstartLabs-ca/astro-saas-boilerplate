'use client';

import React from 'react';
import { Star } from 'lucide-react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

interface ISocialProofProps {
  location?: 'top' | 'bottom';
  className?: string;
}

export function SocialProofSection({ location = 'top', className = '' }: ISocialProofProps): JSX.Element {
  const logos = ["TechFlow", "GrowthMasters", "ScaleUp", "ContentKing", "RankFast", "ViralLoops"];
  // Double logos for seamless loop
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
            <div className="text-center mb-20 border-b border-slate-800 pb-12">
                <div className="text-3xl md:text-4xl font-bold text-white mb-4">
                    Built for businesses serious about scaling organic traffic
                </div>
            </div>

            {/* Testimonials */}
            <h2 className="text-3xl font-bold text-white text-center mb-4">What Beta Testers Say</h2>
            <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">Early adopters are already seeing real results with AutopilotRank.</p>

            <div className="grid md:grid-cols-3 gap-8">
                {[
                    {
                        text: "I replaced a $3,000/month agency with AutopilotRank. The content actually ranks, and I'm not editing every article for hours.",
                        name: "SMB Owner",
                        role: "Beta Tester"
                    },
                    {
                        text: "My traffic 3x'd in 4 months. I publish 5 articles/day now without lifting a finger. The scheduling feature is exactly what I needed.",
                        name: "Niche Site Owner",
                        role: "Beta Tester"
                    },
                    {
                        text: "We added $50K MRR by offering content services. AutopilotRank handles fulfillment—we focus on strategy.",
                        name: "Agency Owner",
                        role: "Beta Tester"
                    }
                ].map((t, i) => (
                    <div key={i} className="bg-slate-950 p-8 rounded-2xl border border-slate-800 hover:border-brand-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-brand-900/10 group">
                        <div className="flex text-yellow-500 mb-6">
                            {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" className="mr-1" />)}
                        </div>
                        <p className="text-slate-300 mb-8 leading-relaxed text-lg">&ldquo;{t.text}&rdquo;</p>
                        <div className="border-t border-slate-900 pt-6">
                            <div>
                                <div className="text-white font-semibold">{t.name}</div>
                                <div className="text-slate-500 text-sm">{t.role}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Trust Badges */}
            <div className="flex justify-center mt-16 gap-8 flex-wrap">
                <div className="flex items-center space-x-2 bg-slate-800/50 px-6 py-3 rounded-lg border border-slate-700">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="text-white text-sm font-medium">No credit card required</span>
                </div>
                <div className="flex items-center space-x-2 bg-slate-800/50 px-6 py-3 rounded-lg border border-slate-700">
                    <ShieldCheck className="w-5 h-5 text-brand-400" />
                    <span className="text-white text-sm font-medium">14-day money-back guarantee</span>
                </div>
                <div className="flex items-center space-x-2 bg-slate-800/50 px-6 py-3 rounded-lg border border-slate-700">
                    <CheckCircle2 className="w-5 h-5 text-blue-400" />
                    <span className="text-white text-sm font-medium">GDPR compliant</span>
                </div>
            </div>
        </div>
    </section>
  );
}
