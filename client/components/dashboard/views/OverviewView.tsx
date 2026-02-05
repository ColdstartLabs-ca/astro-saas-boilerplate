'use client';

import { useState, useEffect } from 'react';
import { ArrowUpRight, Clock, FileText, Loader2, Check } from 'lucide-react';

export function OverviewView(): JSX.Element {
  const fullText = "generative search experiences (SGE).";
  const [typedText, setTypedText] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    let index = 0;
    const typeInterval = setInterval(() => {
      if (index <= fullText.length) {
        setTypedText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(typeInterval);
      }
    }, 50);

    const blinkInterval = setInterval(() => {
      setCursorVisible(v => !v);
    }, 500);

    return () => {
      clearInterval(typeInterval);
      clearInterval(blinkInterval);
    };
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Articles Published", val: "128", change: "+12%", trend: "up" },
          { label: "Words Generated", val: "452k", change: "+24%", trend: "up" },
          { label: "Time Saved", val: "186h", change: "This Month", trend: "neutral" },
        ].map((stat, i) => (
          <div key={i} className="bg-surface border border-border p-4 rounded-xl">
             <div className="text-secondary text-xs font-medium uppercase tracking-wider mb-1">{stat.label}</div>
             <div className="flex items-end justify-between">
                <div className="text-3xl font-bold text-white">{stat.val}</div>
                <div className={`flex items-center text-xs font-medium px-2 py-1 rounded ${stat.trend === 'up' ? 'text-green-400 bg-green-400/10' : 'text-secondary bg-surface-light'}`}>
                   {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                   {stat.change}
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* Active Job Card */}
      <div className="bg-surface rounded-xl border border-border p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent to-transparent animate-progress"></div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Main Content Preview */}
          <div className="flex-1">
             <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                   <div className="p-2 rounded bg-blue-500/10 text-blue-400">
                     <FileText className="w-5 h-5" />
                   </div>
                   <div>
                     <h3 className="text-lg font-medium text-white">The Future of AI SEO</h3>
                     <div className="text-xs text-muted flex items-center gap-2">
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
                            Generating Content
                        </span>
                        <span>&#8226;</span>
                        <span>GPT-4o Model</span>
                     </div>
                   </div>
                </div>
                <div className="text-xs font-mono text-secondary bg-main border border-border rounded px-3 py-1.5">
                  03:42 elapsed
                </div>
             </div>

             {/* Editor Window */}
             <div className="bg-main rounded-lg border border-border p-6 font-mono text-sm text-secondary leading-relaxed min-h-[200px] shadow-inner">
               <p className="mb-4 opacity-50">
                 Search engines are evolving rapidly. To stay ahead, brands must adapt to new paradigms where answers are synthesized directly on the results page.
               </p>
               <p>
                 <span className="opacity-50">This shift requires a fundamental rethink of content strategy. It&#39;s no longer just about keywords; it&#39;s about owning the entire topic cluster and preparing for </span>
                 <span className="text-accent-light">{typedText}</span>
                 <span className={`inline-block w-2 h-4 bg-accent ml-1 align-middle transition-opacity duration-100 ${cursorVisible ? 'opacity-100' : 'opacity-0'}`}></span>
               </p>
             </div>
          </div>

          {/* Sidebar Steps */}
          <div className="w-full md:w-64 flex flex-col gap-4 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
             <div className="text-xs font-semibold text-muted uppercase tracking-wider">Workflow Progress</div>
             <div className="space-y-4 relative">
                <div className="absolute left-[11px] top-2 bottom-2 w-[1px] bg-border -z-10"></div>
                {[
                  { label: 'Keyword Research', status: 'done', time: '10:42 AM' },
                  { label: 'Outline Generation', status: 'done', time: '10:43 AM' },
                  { label: 'Drafting Content', status: 'active', time: 'Running...' },
                  { label: 'SEO Optimization', status: 'pending', time: 'Est. 2m' },
                  { label: 'Publish to WordPress', status: 'pending', time: 'Pending' },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-[10px] shrink-0 bg-surface ${
                        step.status === 'done' ? 'border-green-500 text-green-500' :
                        step.status === 'active' ? 'border-accent text-accent' :
                        'border-border text-muted'
                    }`}>
                        {step.status === 'done' && <Check className="w-3 h-3" />}
                        {step.status === 'active' && <Loader2 className="w-3 h-3 animate-spin" />}
                        {step.status === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-muted"></span>}
                    </div>
                    <div>
                        <div className={`text-sm font-medium ${step.status === 'active' ? 'text-white' : 'text-secondary'}`}>{step.label}</div>
                        <div className="text-[10px] text-muted">{step.time}</div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* Recent Queue */}
      <div>
          <h3 className="text-white font-semibold mb-4">Recent Campaigns</h3>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm text-left">
                  <thead className="bg-main/50 text-muted font-medium">
                      <tr>
                          <th className="px-4 py-3">Topic</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Platform</th>
                          <th className="px-4 py-3 text-right">Date</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                      {[
                          { title: "Top 10 CRM Tools 2024", status: "Published", platform: "WordPress", date: "Today, 9:00 AM" },
                          { title: "Email Marketing Guide", status: "Scheduled", platform: "Webflow", date: "Oct 24, 10:00 AM" },
                          { title: "How to Scale SEO", status: "Draft", platform: "Ghost", date: "Oct 23, 4:15 PM" },
                      ].map((row, i) => (
                          <tr key={i} className="hover:bg-surface-light/50 transition-colors">
                              <td className="px-4 py-3 font-medium text-secondary">{row.title}</td>
                              <td className="px-4 py-3">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      row.status === 'Published' ? 'bg-green-500/10 text-green-400' :
                                      row.status === 'Scheduled' ? 'bg-purple-500/10 text-purple-400' :
                                      'bg-surface-light/30 text-secondary'
                                  }`}>{row.status}</span>
                              </td>
                              <td className="px-4 py-3 text-secondary">{row.platform}</td>
                              <td className="px-4 py-3 text-right text-muted">{row.date}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
}
