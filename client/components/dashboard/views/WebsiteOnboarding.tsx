'use client';

import { useState } from 'react';
import { X, Loader2, Check, ArrowRight, Globe, Code, ShoppingBag, Database, Zap } from 'lucide-react';
import { DashboardButton } from '../ui/DashboardButton';

interface IWebsiteOnboardingProps {
  onClose: () => void;
  onComplete: (siteData: Record<string, unknown>) => void;
}

export function WebsiteOnboarding({ onClose, onComplete }: IWebsiteOnboardingProps): JSX.Element {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    industry: '',
    cms: 'wordpress',
    cmsConfig: {},
    frequency: 'weekly',
    tone: 'professional'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    onComplete(formData);
  };

  return (
    <div className="fixed inset-0 bg-main/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
       <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-6 border-b border-border flex justify-between items-center bg-main/30 rounded-t-2xl">
             <div>
                <h2 className="text-xl font-bold text-white">Add New Website</h2>
                <p className="text-secondary text-sm mt-1">Step {step} of 3</p>
             </div>
             <button onClick={onClose} className="text-muted hover:text-white p-2 hover:bg-surface-light rounded-full transition-colors">
                <X className="w-5 h-5" />
             </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-surface-light h-1">
             <div
               className="bg-accent h-1 transition-all duration-300 ease-out"
               style={{ width: `${(step / 3) * 100}%` }}
             ></div>
          </div>

          {/* Body */}
          <div className="p-8 overflow-y-auto flex-1">
             {step === 1 && (
               <div className="space-y-6 animate-fadeIn">
                  <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-secondary mb-1.5">Website Name</label>
                        <input
                          type="text"
                          placeholder="My Tech Blog"
                          className="w-full bg-main border border-border rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          autoFocus
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-secondary mb-1.5">Domain URL</label>
                        <input
                          type="text"
                          placeholder="https://example.com"
                          className="w-full bg-main border border-border rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                          value={formData.url}
                          onChange={(e) => setFormData({...formData, url: e.target.value})}
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-secondary mb-1.5">Industry / Niche</label>
                        <select
                          className="w-full bg-main border border-border rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                          value={formData.industry}
                          onChange={(e) => setFormData({...formData, industry: e.target.value})}
                        >
                            <option value="">Select an industry...</option>
                            <option value="tech">Technology &amp; SaaS</option>
                            <option value="health">Health &amp; Wellness</option>
                            <option value="finance">Finance &amp; Investing</option>
                            <option value="lifestyle">Lifestyle &amp; Travel</option>
                            <option value="other">Other</option>
                        </select>
                     </div>
                  </div>
               </div>
             )}

             {step === 2 && (
               <div className="space-y-6 animate-fadeIn">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-4">Choose Platform</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {[
                          { id: 'wordpress', name: 'WordPress', icon: <Globe className="w-8 h-8 mb-2 text-blue-400" /> },
                          { id: 'webflow', name: 'Webflow', icon: <Code className="w-8 h-8 mb-2 text-blue-500" /> },
                          { id: 'shopify', name: 'Shopify', icon: <ShoppingBag className="w-8 h-8 mb-2 text-green-400" /> },
                          { id: 'custom', name: 'Custom/API', icon: <Database className="w-8 h-8 mb-2 text-purple-400" /> },
                        ].map(cms => (
                          <button
                            key={cms.id}
                            onClick={() => setFormData({...formData, cms: cms.id})}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                              formData.cms === cms.id
                              ? 'bg-accent/20 border-accent ring-1 ring-accent/50'
                              : 'bg-main border-border hover:border-border hover:bg-surface'
                            }`}
                          >
                             {cms.icon}
                             <span className={`text-sm font-medium ${formData.cms === cms.id ? 'text-accent-light' : 'text-secondary'}`}>{cms.name}</span>
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* CMS Specific Config */}
                  {formData.cms === 'wordpress' && (
                     <div className="bg-main/50 border border-border rounded-xl p-4 space-y-3 animate-fadeIn">
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                           <Globe className="w-4 h-4 text-blue-400" /> WordPress Configuration
                        </h4>
                        <div className="grid grid-cols-1 gap-3">
                           <input type="text" placeholder="WP Admin URL (e.g. site.com/wp-json)" className="bg-surface border border-border rounded px-3 py-2 text-sm text-white focus:border-accent outline-none" />
                           <input type="text" placeholder="Username" className="bg-surface border border-border rounded px-3 py-2 text-sm text-white focus:border-accent outline-none" />
                           <input type="password" placeholder="Application Password" className="bg-surface border border-border rounded px-3 py-2 text-sm text-white focus:border-accent outline-none" />
                        </div>
                        <p className="text-xs text-muted">We recommend creating a specific user for API access.</p>
                     </div>
                  )}
                  {formData.cms === 'webflow' && (
                     <div className="bg-main/50 border border-border rounded-xl p-4 space-y-3 animate-fadeIn">
                         <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                           <Code className="w-4 h-4 text-blue-500" /> Webflow Configuration
                        </h4>
                        <input type="password" placeholder="Webflow API Key" className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-white focus:border-accent outline-none" />
                     </div>
                  )}
               </div>
             )}

             {step === 3 && (
               <div className="space-y-6 animate-fadeIn">
                  <div className="bg-main/50 border border-border rounded-xl p-6 mb-6">
                     <h3 className="text-lg font-medium text-white mb-4">Content Strategy</h3>

                     <div className="space-y-5">
                        <div>
                           <label className="text-sm font-medium text-secondary block mb-2">Publishing Frequency</label>
                           <div className="grid grid-cols-3 gap-3">
                              {['Daily', '3x / Week', 'Weekly'].map(freq => (
                                 <button
                                   key={freq}
                                   onClick={() => setFormData({...formData, frequency: freq})}
                                   className={`py-2 px-3 text-sm rounded-lg border transition-colors ${
                                     formData.frequency === freq
                                     ? 'bg-accent text-white border-accent'
                                     : 'bg-surface text-secondary border-border hover:border-border'
                                   }`}
                                 >
                                   {freq}
                                 </button>
                              ))}
                           </div>
                        </div>

                        <div>
                           <label className="text-sm font-medium text-secondary block mb-2">Tone of Voice</label>
                           <select
                              className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                              value={formData.tone}
                              onChange={(e) => setFormData({...formData, tone: e.target.value})}
                           >
                              <option value="professional">Professional &amp; Authoritative</option>
                              <option value="casual">Casual &amp; Friendly</option>
                              <option value="witty">Witty &amp; Humorous</option>
                              <option value="academic">Academic &amp; Technical</option>
                           </select>
                        </div>
                     </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-blue-900/20 border border-blue-500/20 rounded-lg text-sm text-blue-200">
                      <Zap className="w-5 h-5 shrink-0 text-blue-400" />
                      <p>Once connected, AutopilotRank will start analyzing your niche and generating topic ideas immediately. The first draft will be ready for review in ~10 minutes.</p>
                  </div>
               </div>
             )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border flex justify-between bg-main/30 rounded-b-2xl">
             <DashboardButton
               variant="ghost"
               onClick={step === 1 ? onClose : () => setStep(step - 1)}
               disabled={isSubmitting}
             >
               {step === 1 ? 'Cancel' : 'Back'}
             </DashboardButton>

             <DashboardButton onClick={handleNext} disabled={isSubmitting} className="min-w-[120px]">
               {isSubmitting ? (
                 <>
                   <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Setting up...
                 </>
               ) : step === 3 ? (
                 <>
                   Complete Setup <Check className="w-4 h-4 ml-2" />
                 </>
               ) : (
                 <>
                   Next Step <ArrowRight className="w-4 h-4 ml-2" />
                 </>
               )}
             </DashboardButton>
          </div>
       </div>
    </div>
  );
}
