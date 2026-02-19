'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import { useModalStore } from '@client/store/modalStore';

type CellValue = boolean | string;

interface ICompetitorData {
  feature: string;
  autopilotrank: CellValue;
  outrank: CellValue;
  jasper: CellValue;
  surferSeo: CellValue;
}

interface IProps {
  className?: string;
}

const COMPETITORS = [
  { key: 'autopilotrank', name: 'AutopilotRank', highlight: true },
  { key: 'outrank', name: 'Outrank', highlight: false },
  { key: 'jasper', name: 'Jasper', highlight: false },
  { key: 'surferSeo', name: 'SurferSEO', highlight: false },
] as const;

type CompetitorKey = (typeof COMPETITORS)[number]['key'];

export function ComparisonSection({ className = '' }: IProps): JSX.Element {
  const { openAuthModal } = useModalStore();

  const data: ICompetitorData[] = [
    {
      feature: 'AI Article Generation',
      autopilotrank: true,
      outrank: true,
      jasper: true,
      surferSeo: true,
    },
    {
      feature: 'Auto-Publish to WordPress',
      autopilotrank: true,
      outrank: false,
      jasper: false,
      surferSeo: false,
    },
    {
      feature: 'Built-in Humanizer',
      autopilotrank: true,
      outrank: false,
      jasper: false,
      surferSeo: false,
    },
    {
      feature: 'Multi-Model AI (4 tiers)',
      autopilotrank: true,
      outrank: false,
      jasper: false,
      surferSeo: false,
    },
    {
      feature: 'Campaign Scheduling',
      autopilotrank: true,
      outrank: true,
      jasper: false,
      surferSeo: false,
    },
    {
      feature: 'Credit Flexibility (no article caps)',
      autopilotrank: true,
      outrank: false,
      jasper: false,
      surferSeo: false,
    },
    {
      feature: 'Starting Price',
      autopilotrank: '$49/mo',
      outrank: '$79/mo',
      jasper: '$49/mo',
      surferSeo: '$89/mo',
    },
  ];

  const renderCell = (value: CellValue, isHighlighted: boolean): React.ReactNode => {
    if (value === true)
      return (
        <Check
          className={`h-5 w-5 mx-auto ${isHighlighted ? 'text-brand-400' : 'text-slate-500'}`}
        />
      );
    if (value === false) return <X className="h-4 w-4 text-slate-700 mx-auto" />;
    return (
      <span
        className={`text-sm font-semibold ${isHighlighted ? 'text-brand-300' : 'text-slate-400'}`}
      >
        {value}
      </span>
    );
  };

  const getHeaderClass = (key: CompetitorKey): string => {
    return key === 'autopilotrank' ? 'text-brand-400 font-bold' : 'text-slate-400 font-semibold';
  };

  const getCellClass = (key: CompetitorKey): string => {
    return key === 'autopilotrank'
      ? 'text-center bg-brand-950/40 border-x border-brand-900/30 py-1'
      : 'text-center text-slate-400';
  };

  const getCellValue = (row: ICompetitorData, key: CompetitorKey): CellValue => {
    return row[key];
  };

  return (
    <section id="comparison" className={`py-24 bg-slate-950 ${className}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-brand-400 mb-4">
            Competitor Comparison
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Why Teams Switch to AutopilotRank
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            The only platform that goes from keyword to published — fully automated.
          </p>
        </div>

        <div className="overflow-x-auto pb-4">
          <div className="min-w-[680px] bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-5 border-b border-slate-800 bg-slate-900/80 text-sm">
              <div className="p-4 pl-6 text-left text-slate-500 font-medium">Feature</div>
              {COMPETITORS.map(competitor => (
                <div
                  key={competitor.key}
                  className={`p-4 text-center ${
                    competitor.key === 'autopilotrank'
                      ? 'bg-brand-950/40 border-x border-brand-900/30'
                      : ''
                  }`}
                >
                  <span className={getHeaderClass(competitor.key)}>{competitor.name}</span>
                  {competitor.key === 'autopilotrank' && (
                    <span className="block text-[10px] font-medium text-brand-600 mt-0.5 uppercase tracking-wider">
                      You are here
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Data Rows */}
            {data.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className="grid grid-cols-5 border-b border-slate-800 last:border-0 hover:bg-slate-800/20 transition-colors items-center"
              >
                <div className="p-4 pl-6 text-sm font-medium text-slate-300 text-left">
                  {row.feature}
                </div>
                {COMPETITORS.map(competitor => (
                  <div key={competitor.key} className={getCellClass(competitor.key)}>
                    {renderCell(
                      getCellValue(row, competitor.key),
                      competitor.key === 'autopilotrank'
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-12">
          <button
            onClick={() => openAuthModal('register')}
            className="inline-flex items-center justify-center px-10 py-4 text-white font-semibold rounded-xl transition-all duration-300 gradient-cta shine-effect hover:scale-[1.02] active:scale-[0.98]"
          >
            Start Free — No Card Required
          </button>
          <p className="mt-4 text-sm text-slate-500">Free migration assistance for agency plans.</p>
        </div>
      </div>
    </section>
  );
}
