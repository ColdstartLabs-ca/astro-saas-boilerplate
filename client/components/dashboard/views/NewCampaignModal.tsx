'use client';

import { useState } from 'react';
import { X, ArrowRight, Loader2, Zap, FileSpreadsheet, Cpu } from 'lucide-react';
import { DashboardButton } from '../ui/DashboardButton';

interface INewCampaignModalProps {
  onClose: () => void;
}

export function NewCampaignModal({ onClose }: INewCampaignModalProps): JSX.Element {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [keywords, setKeywords] = useState("");

  const handleLaunch = async () => {
      setLoading(true);
      // Simulate API call
      await new Promise(r => setTimeout(r, 2000));
      setLoading(false);
      onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4">
       <div className="bg-surface border border-border rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-border">
             <div>
                <h2 className="text-xl font-bold text-white">Create New Campaign</h2>
                <p className="text-secondary text-sm mt-1">Step {step} of 2</p>
             </div>
             <button onClick={onClose} className="text-muted hover:text-white"><X className="w-5 h-5"/></button>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8 flex-1 overflow-y-auto">
             {step === 1 && (
                <div className="space-y-6 animate-fadeIn">
                    <div>
                        <label className="block text-sm font-medium text-secondary mb-2">Campaign Name</label>
                        <input
                           type="text"
                           placeholder="e.g. Best Coffee Machines Q4"
                           className="w-full bg-main border border-border rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-accent outline-none"
                           autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-secondary mb-2">Target Keywords</label>
                        <div className="space-y-4">
                            {/* Tabs for Input Method */}
                            <div className="flex border-b border-border">
                                <button className="px-4 py-2 text-sm text-accent-hover border-b-2 border-accent font-medium">Manual Input</button>
                                <button className="px-4 py-2 text-sm text-muted hover:text-secondary">CSV Upload</button>
                            </div>

                            <textarea
                               className="w-full h-32 bg-main border border-border rounded-lg p-4 text-white focus:ring-1 focus:ring-accent outline-none resize-none font-mono text-sm"
                               placeholder={"Enter one keyword per line...\nbest espresso machine\nhow to clean coffee maker"}
                               value={keywords}
                               onChange={(e) => setKeywords(e.target.value)}
                            ></textarea>

                            <div className="flex items-center justify-center border-2 border-dashed border-border rounded-lg p-6 hover:border-border transition-colors cursor-pointer bg-surface/50">
                                <div className="text-center">
                                    <FileSpreadsheet className="w-8 h-8 text-muted mx-auto mb-2" />
                                    <span className="text-sm text-secondary block">Drag &amp; drop CSV file here</span>
                                    <span className="text-xs text-muted block mt-1">or click to browse</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-muted mt-2 flex items-center">
                            <Zap className="w-3 h-3 mr-1 text-accent" />
                            We&#39;ll automatically cluster keywords to prevent cannibalization.
                        </p>
                    </div>
                </div>
             )}

             {step === 2 && (
                 <div className="space-y-6 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            <label className="block text-sm font-medium text-secondary mb-2">AI Model</label>
                            <select className="w-full bg-main border border-border rounded-lg px-3 py-2.5 text-white focus:ring-1 focus:ring-accent outline-none">
                                <option value="gpt-4o">GPT-4o (Best Overall)</option>
                                <option value="claude-3-5">Claude 3.5 Sonnet (More Human)</option>
                                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                            </select>
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-secondary mb-2">Word Count Target</label>
                            <select className="w-full bg-main border border-border rounded-lg px-3 py-2.5 text-white focus:ring-1 focus:ring-accent outline-none">
                                <option value="auto">Auto (Based on SERP)</option>
                                <option value="short">Short (~800 words)</option>
                                <option value="medium">Medium (~1500 words)</option>
                                <option value="long">Long (~2500+ words)</option>
                            </select>
                         </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-secondary mb-2">Tone of Voice</label>
                        <div className="grid grid-cols-2 gap-3">
                            {['Professional', 'Conversational', 'Witty', 'First-Person POV'].map((t, i) => (
                                <label key={i} className="flex items-center p-3 bg-main border border-border rounded-lg cursor-pointer hover:border-border hover:bg-surface transition-colors">
                                    <input type="radio" name="tone" defaultChecked={i===0} className="mr-3 text-accent focus:ring-accent"/>
                                    <span className="text-sm text-secondary">{t}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-lg">
                        <div className="flex items-start gap-3">
                            <Cpu className="w-5 h-5 text-blue-400 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-medium text-blue-200">Autopilot Settings</h4>
                                <div className="mt-2 space-y-2">
                                    <label className="flex items-center text-xs text-secondary cursor-pointer">
                                        <input type="checkbox" defaultChecked className="mr-2 rounded border-border bg-surface text-accent focus:ring-0" />
                                        Auto-insert internal links
                                    </label>
                                    <label className="flex items-center text-xs text-secondary cursor-pointer">
                                        <input type="checkbox" defaultChecked className="mr-2 rounded border-border bg-surface text-accent focus:ring-0" />
                                        Add AI-generated featured images
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
             )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border bg-main/30 rounded-b-xl flex justify-between">
              {step === 1 ? (
                 <DashboardButton variant="ghost" onClick={onClose}>Cancel</DashboardButton>
              ) : (
                 <DashboardButton variant="ghost" onClick={() => setStep(1)} disabled={loading}>Back</DashboardButton>
              )}

              {step === 1 ? (
                 <DashboardButton onClick={() => setStep(2)}>Next Step <ArrowRight className="w-4 h-4 ml-2"/></DashboardButton>
              ) : (
                 <DashboardButton onClick={handleLaunch} disabled={loading} className="min-w-[140px]">
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Processing...</> : <><Zap className="w-4 h-4 mr-2"/> Launch Campaign</>}
                 </DashboardButton>
              )}
          </div>
       </div>
    </div>
  );
}
