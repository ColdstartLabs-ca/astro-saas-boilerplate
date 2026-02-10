'use client';

import { Search, Filter, Plus } from 'lucide-react';
import { DashboardButton } from '../../ui/DashboardButton';

export function KeywordsView(): JSX.Element {
  return (
    <div className="space-y-4 animate-fadeIn">
        <div className="flex justify-between items-center">
             <div className="relative max-w-md w-full">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                 <input type="text" placeholder="Search keywords or topics..." className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
             </div>
             <div className="flex gap-2">
                 <DashboardButton variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" /> Filters</DashboardButton>
                 <DashboardButton variant="primary" size="sm"><Plus className="w-4 h-4 mr-2" /> Add Topic</DashboardButton>
             </div>
        </div>

        <div className="bg-surface rounded-xl border border-border overflow-hidden">
             <table className="w-full text-sm text-left">
                  <thead className="bg-main text-muted font-medium">
                      <tr>
                          <th className="px-6 py-4">Keyword</th>
                          <th className="px-6 py-4 text-right">Volume</th>
                          <th className="px-6 py-4 text-right">KD %</th>
                          <th className="px-6 py-4 text-right">CPC</th>
                          <th className="px-6 py-4">Intent</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                      {[
                        { kw: "programmatic seo guide", vol: "2,400", kd: 12, cpc: "$4.50", intent: "Informational" },
                        { kw: "ai content detector tool", vol: "12,100", kd: 45, cpc: "$2.10", intent: "Commercial" },
                        { kw: "automated blogging software", vol: "800", kd: 8, cpc: "$8.20", intent: "Transactional" },
                        { kw: "best seo automation tools", vol: "3,200", kd: 28, cpc: "$12.50", intent: "Commercial" },
                        { kw: "scale organic traffic fast", vol: "1,100", kd: 15, cpc: "$1.80", intent: "Informational" },
                        { kw: "generative engine optimization", vol: "5,400", kd: 62, cpc: "$5.40", intent: "Informational" },
                      ].map((row, i) => (
                          <tr key={i} className="hover:bg-surface-light/50 group transition-colors">
                              <td className="px-6 py-4 font-medium text-white">{row.kw}</td>
                              <td className="px-6 py-4 text-right text-secondary">{row.vol}</td>
                              <td className="px-6 py-4 text-right">
                                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                                      row.kd < 30 ? 'bg-green-500/10 text-green-400' :
                                      row.kd < 50 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'
                                  }`}>
                                      {row.kd}
                                  </span>
                              </td>
                              <td className="px-6 py-4 text-right text-secondary">{row.cpc}</td>
                              <td className="px-6 py-4">
                                  <span className="px-2 py-1 bg-surface-light rounded text-xs text-secondary">{row.intent}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <button className="text-accent-hover hover:text-accent-light font-medium text-xs border border-accent/30 px-3 py-1.5 rounded hover:bg-accent/10 transition-colors">
                                      Generate
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
             </table>
        </div>
    </div>
  );
}
