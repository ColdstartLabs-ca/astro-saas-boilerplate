'use client';

import React from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';
import { useModalStore } from '@client/store/modalStore';

interface IProps {
  className?: string;
}

export function ComparisonSection({ className = '' }: IProps): JSX.Element {
  const { openAuthModal } = useModalStore();

  const data = [
    { feature: "Full Automation", us: true, outrank: true, surfer: false, byword: false },
    { feature: "Human-Quality Content", us: true, outrank: false, surfer: "N/A", byword: "warn" },
    { feature: "Platform Reliability", us: true, outrank: false, surfer: true, byword: "warn" },
    { feature: "Native CMS Publishing", us: true, outrank: true, surfer: false, byword: true },
    { feature: "GSC Integration", us: true, outrank: false, surfer: false, byword: false },
    { feature: "Humanizer/AI Detection", us: true, outrank: false, surfer: false, byword: false },
    { feature: "Pre-Publication QA", us: true, outrank: false, surfer: false, byword: false },
    { feature: "Support Quality", us: true, outrank: false, surfer: true, byword: "warn" },
    { feature: "Starting Price", us: "$49/mo", outrank: "$99/mo", surfer: "$99/mo", byword: "$99/mo" },
  ];

  const renderCell = (value: boolean | string) => {
    if (value === true) return <Check className="h-5 w-5 text-brand-500 mx-auto" />;
    if (value === false) return <X className="h-5 w-5 text-red-500 mx-auto" />;
    if (value === "warn") return <AlertTriangle className="h-5 w-5 text-yellow-500 mx-auto" />;
    return <span className="text-sm font-medium">{value}</span>;
  };

  return (
    <section id="comparison" className={`py-24 bg-slate-950 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How We Stack Up</h2>
          <p className="text-slate-400">See why teams are switching to AutopilotRank.</p>
        </div>

        <div className="overflow-x-auto pb-4">
          <div className="min-w-[800px] bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
            <div className="grid grid-cols-5 p-4 border-b border-slate-800 bg-slate-900/50 text-sm font-semibold text-slate-300">
              <div className="pl-4">Feature</div>
              <div className="text-center text-brand-400">AutopilotRank</div>
              <div className="text-center">Outrank.so</div>
              <div className="text-center">Surfer SEO</div>
              <div className="text-center">Byword</div>
            </div>

            {data.map((row, i) => (
              <div key={i} className="grid grid-cols-5 p-4 border-b border-slate-800 last:border-0 hover:bg-slate-800/30 transition-colors items-center">
                <div className="pl-4 text-sm font-medium text-slate-200">{row.feature}</div>
                <div className="text-center bg-brand-900/10 py-1 rounded border border-brand-900/20 text-brand-200">{renderCell(row.us)}</div>
                <div className="text-center text-slate-400">{renderCell(row.outrank)}</div>
                <div className="text-center text-slate-400">{renderCell(row.surfer)}</div>
                <div className="text-center text-slate-400">{renderCell(row.byword)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-12">
          <button
            onClick={() => openAuthModal('register')}
            className="inline-flex items-center justify-center px-10 py-4 text-white font-semibold rounded-xl transition-all duration-300 gradient-cta shine-effect hover:scale-[1.02] active:scale-[0.98]"
          >
            Switch & Save 50%
          </button>
          <p className="mt-4 text-sm text-slate-500">Free migration assistance for agency plans.</p>
        </div>
      </div>
    </section>
  );
}
