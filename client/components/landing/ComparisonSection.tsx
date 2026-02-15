'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { useModalStore } from '@client/store/modalStore';

type CellValue = boolean | string;

interface ICompetitorData {
  feature: string;
  autopilotrank: CellValue;
  competitorA: CellValue;
  competitorB: CellValue;
  competitorC: CellValue;
  competitorD: CellValue;
}

interface IProps {
  className?: string;
}

const COMPETITORS = [
  { key: 'autopilotrank', name: 'AutopilotRank', highlight: true, price: '$49/mo' },
  { key: 'competitorA', name: 'Competitor A', highlight: false, price: '$99/mo' },
  { key: 'competitorB', name: 'Competitor B', highlight: false, price: '$89/mo' },
  { key: 'competitorC', name: 'Competitor C', highlight: false, price: '$99/mo' },
  { key: 'competitorD', name: 'Competitor D', highlight: false, price: '$45/mo' },
] as const;

export function ComparisonSection({ className = '' }: IProps): JSX.Element {
  const { openAuthModal } = useModalStore();

  const data: ICompetitorData[] = [
    {
      feature: 'Automated Content Generation',
      autopilotrank: true,
      competitorA: true,
      competitorB: 'Partial',
      competitorC: true,
      competitorD: 'Partial',
    },
    {
      feature: 'Built-in Humanizer',
      autopilotrank: true,
      competitorA: false,
      competitorB: false,
      competitorC: false,
      competitorD: false,
    },
    {
      feature: 'GSC Keyword Integration',
      autopilotrank: true,
      competitorA: false,
      competitorB: false,
      competitorC: false,
      competitorD: true,
    },
    {
      feature: 'Multi-Model AI (GPT-4, Claude, Gemini)',
      autopilotrank: true,
      competitorA: false,
      competitorB: false,
      competitorC: false,
      competitorD: false,
    },
    {
      feature: 'Native CMS Publishing',
      autopilotrank: '5+ platforms',
      competitorA: 'WordPress',
      competitorB: 'WordPress',
      competitorC: 'WordPress',
      competitorD: false,
    },
    {
      feature: 'Internal Blog CMS',
      autopilotrank: true,
      competitorA: false,
      competitorB: false,
      competitorC: false,
      competitorD: false,
    },
    {
      feature: 'Pre-Publication Quality Audit',
      autopilotrank: true,
      competitorA: false,
      competitorB: true,
      competitorC: false,
      competitorD: true,
    },
    {
      feature: 'Starting Price',
      autopilotrank: '$49/mo',
      competitorA: '$79/mo',
      competitorB: '$89/mo',
      competitorC: '$99/mo',
      competitorD: '$45/mo',
    },
  ];

  const renderCell = (value: CellValue): React.ReactNode => {
    if (value === true) return <Check className="h-5 w-5 text-brand-500 mx-auto" />;
    if (value === false) return <span className="text-slate-600">—</span>;
    return <span className="text-sm font-medium text-slate-300">{value}</span>;
  };

  const getColumnClass = (index: number): string => {
    const competitor = COMPETITORS[index];
    if (!competitor) return '';
    return competitor.highlight
      ? 'text-brand-400'
      : 'text-slate-300';
  };

  const getCellClass = (rowIndex: number, colIndex: number): string => {
    const competitor = COMPETITORS[colIndex];
    if (!competitor) return 'text-slate-400 text-center';
    return competitor.highlight
      ? 'text-center bg-brand-900/10 py-1 rounded border border-brand-900/20 text-brand-200'
      : 'text-center text-slate-400';
  };

  const getCellValue = (row: ICompetitorData, colIndex: number): CellValue => {
    const competitor = COMPETITORS[colIndex];
    if (!competitor) return false;
    return row[competitor.key as keyof ICompetitorData];
  };

  return (
    <section id="comparison" className={`py-24 bg-slate-950 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            How We Stack Up
          </h2>
          <p className="text-slate-400">
            See why teams are switching to AutopilotRank.
          </p>
        </div>

        <div className="overflow-x-auto pb-4">
          <div className="min-w-[900px] bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-6 p-4 border-b border-slate-800 bg-slate-900/50 text-sm font-semibold">
              <div className="pl-4 text-left text-slate-300">Feature</div>
              {COMPETITORS.map((competitor, index) => (
                <div key={competitor.key} className={`text-center ${getColumnClass(index)}`}>
                  {competitor.name}
                </div>
              ))}
            </div>

            {/* Data Rows */}
            {data.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className="grid grid-cols-6 p-4 border-b border-slate-800 last:border-0 hover:bg-slate-800/30 transition-colors items-center"
              >
                <div className="pl-4 text-sm font-medium text-slate-200 text-left">
                  {row.feature}
                </div>
                {COMPETITORS.map((_, colIndex) => (
                  <div key={colIndex} className={getCellClass(rowIndex, colIndex)}>
                    {renderCell(getCellValue(row, colIndex))}
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
            Switch & Save 50%
          </button>
          <p className="mt-4 text-sm text-slate-500">
            Free migration assistance for agency plans.
          </p>
        </div>
      </div>
    </section>
  );
}
