'use client';

import { useState } from 'react';
import { ArrowLeft, Settings, Plus, Clock, Loader2, AlertCircle, CheckCircle2, Search, Filter, Edit2, ExternalLink, Trash2, Layers, MoreHorizontal, Play, Pause, Cpu } from 'lucide-react';
import { DashboardButton } from '../ui/DashboardButton';

interface ICampaignsViewProps {
    onNewCampaign: () => void;
}

interface ICampaign {
    id: string;
    name: string;
    status: 'active' | 'paused' | 'completed';
    articlesGenerated: number;
    totalKeywords: number;
    lastUpdated: string;
    model: string;
}

interface IArticle {
    id: string;
    keyword: string;
    status: 'queued' | 'generating' | 'draft' | 'reviewed' | 'published';
    wordCount?: number;
    publishedDate?: string;
}

export function CampaignsView({ onNewCampaign }: ICampaignsViewProps): JSX.Element {
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [selectedCampaign, setSelectedCampaign] = useState<ICampaign | null>(null);

    // Mock Data
    const campaigns: ICampaign[] = [
        { id: 'c1', name: 'Q4 Product Reviews', status: 'active', articlesGenerated: 12, totalKeywords: 50, lastUpdated: '2 mins ago', model: 'GPT-4o' },
        { id: 'c2', name: 'SaaS Competitor Comparison', status: 'paused', articlesGenerated: 45, totalKeywords: 45, lastUpdated: '2 days ago', model: 'Claude 3.5' },
        { id: 'c3', name: 'Programmatic Local SEO', status: 'active', articlesGenerated: 150, totalKeywords: 2000, lastUpdated: 'Running...', model: 'GPT-4 Turbo' },
    ];

    const articles: IArticle[] = [
        { id: 'a1', keyword: 'best crm for small business', status: 'published', wordCount: 1850, publishedDate: 'Oct 24' },
        { id: 'a2', keyword: 'salesforce vs hubspot 2024', status: 'reviewed', wordCount: 2100 },
        { id: 'a3', keyword: 'free crm software', status: 'draft', wordCount: 1200 },
        { id: 'a4', keyword: 'crm implementation guide', status: 'generating' },
        { id: 'a5', keyword: 'customer retention strategies', status: 'queued' },
        { id: 'a6', keyword: 'email automation tools', status: 'queued' },
    ];

    const handleCampaignClick = (c: ICampaign) => {
        setSelectedCampaign(c);
        setViewMode('detail');
    };

    if (viewMode === 'detail' && selectedCampaign) {
        return (
            <div className="h-full flex flex-col animate-fadeIn">
                {/* Detail Header */}
                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setViewMode('list')} className="text-secondary hover:text-white transition-colors flex items-center text-sm">
                            <ArrowLeft className="w-4 h-4 mr-1" /> Campaigns
                        </button>
                    </div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                {selectedCampaign.name}
                                <span className={`text-xs px-2 py-1 rounded-full border ${selectedCampaign.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'} capitalize`}>
                                    {selectedCampaign.status}
                                </span>
                            </h2>
                            <div className="flex items-center gap-4 mt-2 text-sm text-secondary">
                                <span className="flex items-center"><Cpu className="w-3 h-3 mr-1.5" /> Model: {selectedCampaign.model}</span>
                                <span className="flex items-center"><Layers className="w-3 h-3 mr-1.5" /> {selectedCampaign.articlesGenerated} / {selectedCampaign.totalKeywords} Articles</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <DashboardButton variant="outline" size="sm"><Settings className="w-4 h-4 mr-2" /> Settings</DashboardButton>
                            <DashboardButton variant="primary" size="sm"><Plus className="w-4 h-4 mr-2" /> Add Keywords</DashboardButton>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Queued', val: 24, icon: Clock, color: 'text-secondary' },
                        { label: 'Generating', val: 1, icon: Loader2, color: 'text-accent-hover', spin: true },
                        { label: 'Needs Review', val: 5, icon: AlertCircle, color: 'text-yellow-400' },
                        { label: 'Published', val: 12, icon: CheckCircle2, color: 'text-green-400' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-surface border border-border p-4 rounded-xl flex items-center justify-between">
                            <div>
                                <div className="text-muted text-xs font-medium uppercase tracking-wider mb-1">{stat.label}</div>
                                <div className="text-2xl font-bold text-white">{stat.val}</div>
                            </div>
                            <div className={`p-2 rounded-lg bg-surface-light ${stat.color}`}>
                                <stat.icon className={`w-5 h-5 ${stat.spin ? 'animate-spin' : ''}`} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Article Queue Table */}
                <div className="bg-surface border border-border rounded-xl overflow-hidden flex-1 flex flex-col">
                    <div className="p-4 border-b border-border flex justify-between items-center bg-main/30">
                        <h3 className="font-semibold text-white">Article Queue</h3>
                        <div className="flex gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                                <input type="text" placeholder="Search keywords..." className="bg-main border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-secondary focus:border-accent outline-none w-48" />
                            </div>
                            <DashboardButton variant="ghost" size="sm" className="h-8 w-8 p-0"><Filter className="w-4 h-4" /></DashboardButton>
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-main/50 text-muted font-medium border-b border-border text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3">Keyword</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Word Count</th>
                                    <th className="px-6 py-3 text-right">Published</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {articles.map((article) => (
                                    <tr key={article.id} className="hover:bg-surface-light/30 transition-colors group">
                                        <td className="px-6 py-3 font-medium text-secondary">{article.keyword}</td>
                                        <td className="px-6 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wide ${
                                                article.status === 'published' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                article.status === 'draft' ? 'bg-surface-light text-secondary border-border' :
                                                article.status === 'generating' ? 'bg-accent/10 text-accent-hover border-accent/20' :
                                                article.status === 'reviewed' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                'bg-surface text-muted border-border'
                                            }`}>
                                                {article.status === 'generating' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                                                {article.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-muted font-mono text-xs">{article.wordCount ? article.wordCount.toLocaleString() : '-'}</td>
                                        <td className="px-6 py-3 text-right text-muted text-xs">{article.publishedDate || '-'}</td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {article.status === 'draft' || article.status === 'reviewed' ? (
                                                    <button className="p-1.5 hover:bg-surface-light rounded text-secondary hover:text-white"><Edit2 className="w-3.5 h-3.5" /></button>
                                                ) : null}
                                                {article.status === 'published' ? (
                                                    <button className="p-1.5 hover:bg-surface-light rounded text-secondary hover:text-white"><ExternalLink className="w-3.5 h-3.5" /></button>
                                                ) : null}
                                                <button className="p-1.5 hover:bg-red-900/30 rounded text-secondary hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-white">Campaigns</h2>
                    <p className="text-secondary text-sm">Manage your content generation queues.</p>
                </div>
                <DashboardButton size="sm" onClick={onNewCampaign}>
                    <Plus className="w-4 h-4 mr-2" /> New Campaign
                </DashboardButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {campaigns.map((campaign) => (
                    <div
                        key={campaign.id}
                        onClick={() => handleCampaignClick(campaign)}
                        className="bg-surface border border-border rounded-xl p-6 hover:border-border transition-all cursor-pointer group hover:shadow-xl hover:shadow-black/20"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-main border border-border rounded-lg text-secondary group-hover:text-accent-hover group-hover:border-accent/30 transition-colors">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white group-hover:text-accent-hover transition-colors">{campaign.name}</h3>
                                    <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                                        <Clock className="w-3 h-3" /> {campaign.lastUpdated}
                                    </div>
                                </div>
                            </div>
                            <button className="text-muted hover:text-white" onClick={(e) => { e.stopPropagation(); }}>
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                            <div className="flex justify-between text-xs mb-2">
                                <span className="text-secondary">Progress</span>
                                <span className="text-white font-mono">{campaign.articlesGenerated} / {campaign.totalKeywords}</span>
                            </div>
                            <div className="w-full bg-main rounded-full h-2 overflow-hidden border border-border">
                                <div
                                    className={`h-full rounded-full ${campaign.status === 'active' ? 'bg-accent' : 'bg-muted'}`}
                                    style={{ width: `${(campaign.articlesGenerated / campaign.totalKeywords) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-border pt-4 mt-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                campaign.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                            }`}>
                                {campaign.status === 'active' ? <Play className="w-3 h-3 mr-1.5 fill-current" /> : <Pause className="w-3 h-3 mr-1.5 fill-current" />}
                                {campaign.status.toUpperCase()}
                            </span>

                            <div className="flex items-center text-xs text-muted">
                                <Cpu className="w-3 h-3 mr-1" /> {campaign.model}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Add New Card */}
                <button
                    onClick={onNewCampaign}
                    className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center text-muted hover:border-accent/50 hover:text-accent-hover hover:bg-surface/50 transition-all gap-3 group h-full min-h-[200px]"
                >
                    <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus className="w-6 h-6" />
                    </div>
                    <span className="font-medium">Create New Campaign</span>
                </button>
            </div>
        </div>
    );
}
