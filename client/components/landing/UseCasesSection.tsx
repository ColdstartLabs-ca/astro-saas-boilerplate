'use client';

import React, { useState } from 'react';
import { Building2, FileText, Landmark, CheckCircle } from 'lucide-react';

interface IProps {
  className?: string;
}

export function UseCasesSection({ className = '' }: IProps): JSX.Element {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    {
      id: 0,
      label: "SMB Owners",
      icon: <Building2 className="w-5 h-5" />,
      headline: "Scale Without Hiring a Content Team",
      points: [
        "Generate 100+ SEO articles/month automatically",
        "90% cost savings vs. agencies ($0.50 vs $50/article)",
        "No technical knowledge required",
        "Done-for-you programmatic SEO"
      ],
      quote: "I replaced a $3,000/month agency with AutopilotRank. Same results, 10x cheaper.",
      author: "Sarah J., E-commerce Founder"
    },
    {
      id: 1,
      label: "Content Sites",
      icon: <FileText className="w-5 h-5" />,
      headline: "Unlimited Content at Fixed Cost",
      points: [
        "Daily fresh content on autopilot",
        "Long-tail keyword capture at scale",
        "Ad/affiliate revenue growth",
        "Niche authority building"
      ],
      quote: "My traffic 3x'd in 4 months. I publish 5 articles/day now without lifting a finger.",
      author: "Mike T., Niche Site Owner"
    },
    {
      id: 2,
      label: "Agencies",
      icon: <Landmark className="w-5 h-5" />,
      headline: "White-Label SEO Content at Scale",
      points: [
        "Resell under your brand",
        "10x your content capacity overnight",
        "Multi-site discounts",
        "Expand margins on SEO retainers"
      ],
      quote: "We added $50K MRR by offering content services. AutopilotRank handles fulfillment.",
      author: "David R., Agency CEO"
    }
  ];

  return (
    <section className={`py-24 bg-slate-900 border-b border-slate-800 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Built For Teams Like Yours</h2>
          <p className="text-slate-400">Whether you&apos;re a solopreneur or an agency, we fit your workflow.</p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Tabs Navigation */}
          <div className="flex flex-wrap justify-center gap-2 mb-8 p-1 bg-slate-950 rounded-lg border border-slate-800 w-fit mx-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-md transition-all duration-200 font-medium ${
                  activeTab === tab.id
                    ? 'bg-brand-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content Card */}
          <div className="bg-slate-950 rounded-2xl p-8 md:p-12 border border-slate-800 shadow-2xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-bold text-white mb-6">
                  {tabs[activeTab].headline}
                </h3>
                <ul className="space-y-4 mb-8">
                  {tabs[activeTab].points.map((point, idx) => (
                    <li key={idx} className="flex items-start text-slate-300">
                      <CheckCircle className="h-5 w-5 text-brand-500 mr-3 mt-0.5 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 relative">
                 <div className="text-4xl text-brand-900 absolute top-4 left-4 opacity-50">&ldquo;</div>
                 <p className="text-slate-300 italic mb-4 relative z-10 pt-4">
                   {tabs[activeTab].quote}
                 </p>
                 <div className="flex items-center">
                    <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-500 font-bold mr-3">
                        {tabs[activeTab].author.charAt(0)}
                    </div>
                    <div>
                        <div className="text-white font-medium text-sm">{tabs[activeTab].author}</div>
                        <div className="text-slate-500 text-xs">Verified Customer</div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
