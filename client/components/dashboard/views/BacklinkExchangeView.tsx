'use client';

import { Plus, ArrowUpRight } from 'lucide-react';
import { DashboardButton } from '../ui/DashboardButton';

export function BacklinkExchangeView(): JSX.Element {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-xl font-bold text-white">Backlink Exchange</h2>
           <p className="text-secondary text-sm">Connect with other partners to build authority.</p>
        </div>
        <DashboardButton size="sm"><Plus className="w-4 h-4 mr-2" /> New Request</DashboardButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-surface border border-border rounded-xl p-6">
            <div className="text-secondary text-sm mb-1">Domain Authority</div>
            <div className="text-3xl font-bold text-white">42</div>
            <div className="text-xs text-green-400 mt-2 flex items-center"><ArrowUpRight className="w-3 h-3 mr-1"/> +2 this month</div>
         </div>
         <div className="bg-surface border border-border rounded-xl p-6">
            <div className="text-secondary text-sm mb-1">Active Partnerships</div>
            <div className="text-3xl font-bold text-white">12</div>
            <div className="text-xs text-muted mt-2">3 pending requests</div>
         </div>
         <div className="bg-surface border border-border rounded-xl p-6">
            <div className="text-secondary text-sm mb-1">Backlinks Built</div>
            <div className="text-3xl font-bold text-white">1,240</div>
            <div className="text-xs text-green-400 mt-2 flex items-center"><ArrowUpRight className="w-3 h-3 mr-1"/> +15 this week</div>
         </div>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
         <div className="p-4 border-b border-border bg-main/50 font-medium text-secondary">Available Opportunities</div>
         <div className="divide-y divide-border">
            {[
               { domain: "techcrunch.com", da: 92, relevance: "High", status: "Negotiating" },
               { domain: "indiehackers.com", da: 78, relevance: "High", status: "Available" },
               { domain: "medium.com", da: 95, relevance: "Medium", status: "Available" },
               { domain: "dev.to", da: 85, relevance: "High", status: "Contacted" },
            ].map((item, i) => (
               <div key={i} className="p-4 flex items-center justify-between hover:bg-surface-light/50 transition-colors">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-lg bg-surface-light flex items-center justify-center text-muted font-bold">
                        {item.domain.charAt(0).toUpperCase()}
                     </div>
                     <div>
                        <div className="text-white font-medium">{item.domain}</div>
                        <div className="text-xs text-muted">DA: {item.da} &#8226; Relevance: {item.relevance}</div>
                     </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <span className={`text-xs px-2 py-1 rounded border ${
                        item.status === 'Available' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                        'bg-surface-light border-border text-secondary'
                     }`}>{item.status}</span>
                     <DashboardButton size="sm" variant="ghost" className="h-8">Details</DashboardButton>
                  </div>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
}
