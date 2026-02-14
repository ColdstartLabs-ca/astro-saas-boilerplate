'use client';

import { useState } from 'react';
import { UserCircle, CreditCard, Globe, BellRing, Key, User, Check, Database } from 'lucide-react';
import { DashboardButton } from '../ui/DashboardButton';
import { InternalTabs } from '../ui/InternalTabs';
import { ApiKeysSection } from '@client/components/settings/ApiKeysSection';
import { RssFeedSection } from '@client/components/settings/RssFeedSection';

export function SettingsView(): JSX.Element {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
     { id: 'profile', label: 'My Profile', icon: <UserCircle className="w-4 h-4"/> },
     { id: 'billing', label: 'Billing & Plans', icon: <CreditCard className="w-4 h-4"/> },
     { id: 'integrations', label: 'Integrations', icon: <Globe className="w-4 h-4"/> },
     { id: 'notifications', label: 'Notifications', icon: <BellRing className="w-4 h-4"/> },
     { id: 'api', label: 'API & Team', icon: <Key className="w-4 h-4"/> },
  ];

  return (
    <div className="max-w-5xl mx-auto pb-10 animate-fadeIn">
        <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>
        <InternalTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className="bg-surface border border-border rounded-xl overflow-hidden min-h-[400px]">
            {activeTab === 'profile' && (
                <div className="p-8 space-y-8 animate-fadeIn">
                    <div className="flex items-start gap-6">
                        <div className="w-24 h-24 rounded-full bg-surface-light flex items-center justify-center border-2 border-border">
                             <User className="w-12 h-12 text-muted" />
                        </div>
                        <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1">Full Name</label>
                                    <input type="text" defaultValue="Demo User" className="w-full bg-main border border-border rounded px-3 py-2 text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary mb-1">Email Address</label>
                                    <input type="email" defaultValue="demo@autopilotrank.com" className="w-full bg-main border border-border rounded px-3 py-2 text-white" />
                                </div>
                            </div>
                            <DashboardButton size="sm">Update Profile</DashboardButton>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-border">
                        <h3 className="text-lg font-medium text-white mb-4">Security</h3>
                        <DashboardButton variant="outline" size="sm">Change Password</DashboardButton>
                    </div>
                </div>
            )}

            {activeTab === 'billing' && (
                <div className="p-8 space-y-8 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-accent/50 to-surface border border-accent/30 rounded-xl p-6 relative overflow-hidden">
                             <div className="relative z-10">
                                 <div className="text-sm text-accent-light font-medium mb-1">Current Plan</div>
                                 <div className="text-3xl font-bold text-white mb-4">Growth</div>
                                 <ul className="text-sm text-secondary space-y-2 mb-6">
                                     <li className="flex items-center"><Check className="w-3 h-3 mr-2 text-accent"/> 150 Articles / mo</li>
                                     <li className="flex items-center"><Check className="w-3 h-3 mr-2 text-accent"/> Priority Support</li>
                                 </ul>
                                 <DashboardButton size="sm" className="w-full">Manage Subscription</DashboardButton>
                             </div>
                        </div>
                        <div className="bg-main border border-border rounded-xl p-6">
                             <h4 className="font-medium text-white mb-4 flex items-center"><CreditCard className="w-4 h-4 mr-2"/> Payment Method</h4>
                             <div className="flex items-center justify-between p-3 border border-border rounded-lg mb-4">
                                 <div className="flex items-center gap-3">
                                     <div className="w-10 h-6 bg-surface-light rounded"></div>
                                     <span className="text-sm text-secondary">&#8226;&#8226;&#8226;&#8226; 4242</span>
                                 </div>
                                 <span className="text-xs text-muted">Exp 12/25</span>
                             </div>
                             <DashboardButton variant="outline" size="sm" className="w-full">Update Card</DashboardButton>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-medium text-white mb-4">Invoice History</h4>
                        <table className="w-full text-sm text-left">
                            <thead className="text-muted border-b border-border">
                                <tr>
                                    <th className="py-2">Date</th>
                                    <th className="py-2">Amount</th>
                                    <th className="py-2">Status</th>
                                    <th className="py-2 text-right">Invoice</th>
                                </tr>
                            </thead>
                            <tbody className="text-secondary">
                                {[
                                    { date: 'Oct 01, 2024', amount: '$99.00', status: 'Paid' },
                                    { date: 'Sep 01, 2024', amount: '$99.00', status: 'Paid' },
                                    { date: 'Aug 01, 2024', amount: '$99.00', status: 'Paid' },
                                ].map((inv, i) => (
                                    <tr key={i} className="border-b border-border last:border-0">
                                        <td className="py-3">{inv.date}</td>
                                        <td className="py-3">{inv.amount}</td>
                                        <td className="py-3"><span className="text-green-400 bg-green-900/20 px-2 py-0.5 rounded text-xs">Paid</span></td>
                                        <td className="py-3 text-right"><DashboardButton variant="ghost" size="sm" className="h-6 text-xs">Download</DashboardButton></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'integrations' && (
                <div className="animate-fadeIn">
                     <div className="p-4 border-b border-border bg-main/30">
                         <h3 className="font-semibold text-white flex items-center gap-2">
                             <Globe className="w-4 h-4 text-accent" /> Publishing Destinations
                         </h3>
                     </div>
                     <div className="p-6 space-y-6">
                         {/* WordPress */}
                         <div className="flex items-center justify-between p-4 bg-surface-light/30 rounded-lg border border-border">
                             <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 bg-blue-600/20 text-blue-500 rounded-lg flex items-center justify-center">
                                    <span className="font-bold">W</span>
                                 </div>
                                 <div>
                                     <div className="text-white font-medium">WordPress</div>
                                     <div className="text-xs text-muted">Connect your WP site via Application Password</div>
                                 </div>
                             </div>
                             <DashboardButton variant="outline" size="sm" className="text-green-400 border-green-500/30 bg-green-500/10 hover:bg-green-500/20">Connected</DashboardButton>
                         </div>

                         {/* Webhook */}
                         <div className="space-y-3">
                             <div className="flex justify-between">
                                <label className="text-sm font-medium text-secondary">Custom Webhook</label>
                                <span className="text-xs text-muted">For Zapier, Make, or custom backends</span>
                             </div>
                             <div className="flex gap-2">
                                 <input type="text" defaultValue="https://hooks.zapier.com/hooks/catch/123456/xxx/" className="flex-1 bg-main border border-border rounded-lg px-3 py-2 text-sm text-secondary font-mono" readOnly />
                                 <DashboardButton size="sm" variant="secondary">Test</DashboardButton>
                             </div>
                         </div>
                     </div>

                     <div className="p-4 border-y border-border bg-main/30">
                         <h3 className="font-semibold text-white flex items-center gap-2">
                             <Database className="w-4 h-4 text-purple-500" /> Media Configuration
                         </h3>
                     </div>
                     <div className="p-6 space-y-6">
                         <div className="grid grid-cols-2 gap-6">
                             <div className="space-y-2">
                                 <label className="text-sm font-medium text-secondary">Image Storage</label>
                                 <select className="w-full bg-main border border-border rounded-lg px-3 py-2 text-sm text-white outline-none">
                                     <option>Supabase Storage</option>
                                     <option>AWS S3</option>
                                 </select>
                             </div>
                         </div>
                     </div>
                </div>
            )}

            {activeTab === 'notifications' && (
                <div className="p-8 space-y-6 animate-fadeIn">
                    {[
                        { title: "Campaign Completed", desc: "Get notified when a batch of articles is ready for review.", default: true },
                        { title: "Weekly Digest", desc: "Summary of SEO performance and published content.", default: true },
                        { title: "SEO Alerts", desc: "Notify me when a keyword rank changes significantly.", default: false },
                        { title: "Product Updates", desc: "News about new features and improvements.", default: true },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between py-4 border-b border-border last:border-0">
                            <div>
                                <h4 className="text-sm font-medium text-white">{item.title}</h4>
                                <p className="text-xs text-secondary">{item.desc}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" defaultChecked={item.default} className="sr-only peer" />
                                <div className="w-11 h-6 bg-surface-light peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                            </label>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'api' && (
                <div className="p-8 space-y-10 animate-fadeIn">
                    <ApiKeysSection />
                    <div className="pt-8 border-t border-border">
                        <RssFeedSection />
                    </div>
                </div>
            )}
        </div>

        <div className="flex justify-end pt-6">
             <DashboardButton>Save Changes</DashboardButton>
        </div>
    </div>
  );
}
