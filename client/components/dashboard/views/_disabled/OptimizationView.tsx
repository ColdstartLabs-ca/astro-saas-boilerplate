'use client';

import { useState } from 'react';
import { Filter, RefreshCw, Globe, Check, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { DashboardButton } from '../../ui/DashboardButton';

interface IPost {
    id: number;
    title: string;
    slug: string;
    score: number;
    status: string;
    issues: number;
    date: string;
}

export function OptimizationView(): JSX.Element {
    const [selectedPost, setSelectedPost] = useState<IPost | null>(null);

    const posts: IPost[] = [
        { id: 1, title: "The Ultimate Guide to Automated Blogging in 2024", slug: "/blog/automated-blogging", score: 96, status: "Published", issues: 0, date: "Oct 24, 2024" },
        { id: 2, title: "10 Best SEO Tools for Small Businesses", slug: "/blog/best-seo-tools", score: 45, status: "Draft", issues: 8, date: "Oct 23, 2024" },
        { id: 3, title: "How to Scale Organic Traffic with AI", slug: "/blog/scale-organic-traffic", score: 82, status: "Published", issues: 2, date: "Oct 20, 2024" },
        { id: 4, title: "Understanding Google's SGE Update", slug: "/blog/sge-update-explained", score: 68, status: "Draft", issues: 5, date: "Oct 18, 2024" },
        { id: 5, title: "Programmatic SEO: A Beginner's Guide", slug: "/blog/programmatic-seo", score: 92, status: "Published", issues: 1, date: "Oct 15, 2024" },
    ];

    if (!selectedPost) {
        return (
            <div className="space-y-4 animate-fadeIn h-[calc(100vh-140px)] flex flex-col">
                <div className="flex justify-between items-center mb-2">
                     <div>
                        <h2 className="text-xl font-bold text-white">Content Audit</h2>
                        <p className="text-secondary text-sm">Monitor SEO health and optimize content across your site.</p>
                     </div>
                     <div className="flex gap-2">
                         <DashboardButton variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" /> Filters</DashboardButton>
                         <DashboardButton variant="primary" size="sm"><RefreshCw className="w-4 h-4 mr-2" /> Scan Site</DashboardButton>
                     </div>
                </div>

                <div className="bg-surface border border-border rounded-xl overflow-hidden flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-main/50 text-muted font-medium border-b border-border">
                            <tr>
                                <th className="px-6 py-4">Page / Post</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">SEO Score</th>
                                <th className="px-6 py-4">Issues</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {posts.map((post) => (
                                <tr
                                    key={post.id}
                                    onClick={() => setSelectedPost(post)}
                                    className="hover:bg-surface-light/50 cursor-pointer transition-colors group"
                                >
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-white group-hover:text-white transition-colors">{post.title}</div>
                                        <div className="text-xs text-muted flex items-center gap-1 mt-1">
                                            <Globe className="w-3 h-3" /> {post.slug}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${
                                            post.status === 'Published'
                                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                            : 'bg-surface-light text-secondary border-border'
                                        }`}>
                                            {post.status === 'Published' && <Check className="w-3 h-3 mr-1" />}
                                            {post.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-2 bg-surface-light rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${
                                                        post.score > 80 ? 'bg-green-500' :
                                                        post.score > 50 ? 'bg-yellow-500' : 'bg-red-500'
                                                    }`}
                                                    style={{ width: `${post.score}%` }}
                                                ></div>
                                            </div>
                                            <span className={`font-mono text-xs ${
                                                post.score > 80 ? 'text-green-400' :
                                                post.score > 50 ? 'text-yellow-400' : 'text-red-400'
                                            }`}>{post.score}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {post.issues > 0 ? (
                                            <span className="flex items-center text-red-400 text-xs">
                                                <AlertCircle className="w-3 h-3 mr-1" /> {post.issues} Critical
                                            </span>
                                        ) : (
                                            <span className="flex items-center text-green-500 text-xs">
                                                <CheckCircle2 className="w-3 h-3 mr-1" /> Healthy
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <DashboardButton size="sm" variant="ghost" className="hover:bg-accent/10 hover:text-accent-hover">
                                            Optimize <ArrowRight className="w-3 h-3 ml-1" />
                                        </DashboardButton>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // Detail Editor View
    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] animate-fadeIn">
            {/* Main Editor */}
            <div className="flex-1 bg-surface rounded-xl border border-border flex flex-col overflow-hidden">
                <div className="border-b border-border p-4 flex justify-between items-center bg-main/30">
                    <div className="flex items-center gap-4">
                        <DashboardButton variant="ghost" size="sm" onClick={() => setSelectedPost(null)} className="h-8 px-2 text-muted hover:text-white">
                            <ArrowLeft className="w-4 h-4 mr-1" /> Back
                        </DashboardButton>
                        <div className="h-4 w-px bg-border"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-secondary hidden sm:inline">Target Keyword:</span>
                            <span className="bg-accent/20 text-accent-hover px-2 py-1 rounded text-xs font-mono border border-accent/20 truncate max-w-[150px]">
                                {selectedPost.slug.replace('/blog/', '').replace(/-/g, ' ')}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <DashboardButton variant="ghost" size="sm">Save Draft</DashboardButton>
                        <DashboardButton variant="primary" size="sm">Update Post</DashboardButton>
                    </div>
                </div>
                <div className="flex-1 p-8 overflow-y-auto font-serif text-lg leading-relaxed text-secondary max-w-3xl mx-auto w-full">
                    <h1 className="text-4xl font-bold text-white mb-6 font-sans">{selectedPost.title}</h1>
                    <p className="mb-6">
                        Blogging has evolved. Gone are the days of manually typing out every single word. In the era of AI, <span className="bg-green-500/20 text-green-200 border-b-2 border-green-500/50">automated blogging</span> is the secret weapon for scaling content marketing efforts without burning out your team.
                    </p>
                    <h2 className="text-2xl font-bold text-white mb-4 font-sans">Why Automation Matters</h2>
                    <p className="mb-6">
                        Consistency is key in SEO. Search engines reward sites that publish fresh, relevant content regularly. However, maintaining a daily publishing schedule is nearly impossible for small teams. This is where automation tools come in.
                    </p>
                    <p className="mb-6">
                        By leveraging tools like AutopilotRank, you can ensure a steady stream of high-quality articles that rank. But it&#39;s not just about quantity; it&#39;s about maintaining <span className="bg-yellow-500/20 text-yellow-200 border-b-2 border-yellow-500/50">human-level quality</span> at scale.
                    </p>
                    <div className="bg-surface-light p-6 rounded-lg my-8 border-l-4 border-accent">
                        <p className="italic text-secondary">
                            &#34;Automation isn&#39;t about replacing creativity; it&#39;s about removing the friction between your ideas and the publish button.&#34;
                        </p>
                    </div>
                    <p>
                        In this guide, we will explore the best strategies for setting up an automated workflow that actually works...
                    </p>
                </div>
            </div>

            {/* SEO Sidebar */}
            <div className="w-full lg:w-80 flex flex-col gap-4">
                {/* Score Card */}
                <div className="bg-surface rounded-xl border border-border p-6 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="relative w-32 h-32 flex items-center justify-center mb-2">
                        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100">
                            {Array.from({length: 40}).map((_, i) => (
                                <line key={i} x1="50" y1="2" x2="50" y2="8" stroke="currentColor" strokeWidth="1.5" className="text-secondary" transform={`rotate(${i * 9} 50 50)`} />
                            ))}
                        </svg>
                        <svg className="w-24 h-24 -rotate-90 relative z-10 drop-shadow-[0_0_15px_rgba(34,197,94,0.4)]" viewBox="0 0 100 100">
                            <defs>
                                <linearGradient id="scoreGradientMain" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#22c55e" />
                                    <stop offset="100%" stopColor="#86efac" />
                                </linearGradient>
                            </defs>
                            <circle cx="50" cy="50" r="40" stroke="#0f172a" strokeWidth="8" fill="transparent" />
                            <circle cx="50" cy="50" r="40" stroke="url(#scoreGradientMain)" strokeWidth="8" fill="transparent" strokeDasharray="251.3" strokeDashoffset={251.3 * (1 - selectedPost.score / 100)} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                            <span className="text-3xl font-bold text-white tracking-tighter">{selectedPost.score}</span>
                        </div>
                    </div>
                    <div className="text-xs uppercase tracking-widest font-bold text-muted">SEO Health</div>
                </div>

                {/* Checklist */}
                <div className="bg-surface rounded-xl border border-border flex-1 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-border bg-main/30 font-semibold text-secondary">Optimization Checklist</div>
                    <div className="p-4 overflow-y-auto space-y-4">
                        {[
                            { label: "Keyword in Title", passed: true },
                            { label: "Keyword in First 100 words", passed: true },
                            { label: "Content Length > 1500 words", passed: selectedPost.score > 80 },
                            { label: "Images with Alt Text", passed: true },
                            { label: "Internal Links Added", passed: selectedPost.score > 60 },
                            { label: "Meta Description Optimized", passed: true },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <span className={`text-sm ${item.passed ? 'text-secondary' : 'text-muted'}`}>{item.label}</span>
                                {item.passed ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <span className="w-4 h-4 rounded-full border border-border"></span>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
