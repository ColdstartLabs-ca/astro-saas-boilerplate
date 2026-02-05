'use client';

import { useEffect, useState } from 'react';
import React from 'react';
import {
  CheckCircle2,
  Loader2,
  FileText,
  BarChart2,
  Calendar as CalendarIcon,
  Search,
  Check,
  ChevronDown,
  LayoutGrid,
  Settings,
  Bell,
  User,
  Zap,
} from 'lucide-react';
import { Plus as PlusIcon } from 'lucide-react';
import { Filter as FilterIcon } from 'lucide-react';

interface IProps {
  className?: string;
}

// --- Sub-components defined outside to prevent re-renders ---

interface IPipelineViewProps {
  typedText: string;
  cursorVisible: boolean;
}

const PipelineView: React.FC<IPipelineViewProps> = ({ typedText, cursorVisible }) => (
  <div className="h-full flex flex-col animate-fade-in">
    {/* View Header */}
    <div className="flex justify-between items-center mb-6 px-1">
      <div>
        <h3 className="text-text-primary font-semibold flex items-center gap-2">
          Active Generation Queue
          <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent text-[10px] font-mono border border-accent/30">
            RUNNING
          </span>
        </h3>
        <p className="text-text-muted text-xs mt-1">Processing 3 campaigns • 12 articles remaining</p>
      </div>
      <button className="h-7 text-xs px-3 bg-accent hover:bg-accent-hover text-white rounded-md transition-colors flex items-center gap-1.5">
        <PlusIcon className="w-3 h-3" /> New Campaign
      </button>
    </div>

    {/* Main Active Card */}
    <div className="flex-1 bg-elevated rounded-xl border border-border/50 p-4 mb-4 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent to-transparent animate-progress"></div>

      <div className="flex gap-4 h-full">
        {/* Article Preview */}
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-accent/10 text-accent">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-text-primary">The Future of AI SEO</div>
                <div className="text-[10px] text-text-muted flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
                  Writing Section 3/8
                </div>
              </div>
            </div>
            <div className="text-[10px] font-mono text-text-muted bg-main border border-border rounded px-2 py-1">
              GPT-4o
            </div>
          </div>

          {/* Typing Effect Area */}
          <div className="flex-1 bg-main/50 rounded-lg border border-border/50 p-3 font-mono text-xs text-text-secondary leading-relaxed overflow-hidden relative">
            <span className="opacity-50">Search engines are evolving rapidly. To stay ahead, brands must adapt to </span>
            <span className="text-text-primary">{typedText}</span>
            <span className={`inline-block w-1.5 h-3 bg-accent ml-0.5 align-middle transition-opacity duration-100 ${cursorVisible ? 'opacity-100' : 'opacity-0'}`}></span>
            <div className="absolute bottom-2 right-2 text-[9px] text-text-muted">428 words</div>
          </div>
        </div>

        {/* Right Sidebar Mockup (Steps) */}
        <div className="w-32 hidden sm:flex flex-col gap-2 border-l border-border pl-4">
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Workflow</div>
          {[
            { label: 'Keyword Data', status: 'done' },
            { label: 'Outline Gen', status: 'done' },
            { label: 'Drafting', status: 'active' },
            { label: 'SEO Audit', status: 'pending' },
            { label: 'Publishing', status: 'pending' },
          ].map((step, i) => (
            <div key={i} className="flex items-center justify-between text-[10px]">
              <span className={step.status === 'active' ? 'text-accent font-medium' : step.status === 'done' ? 'text-text-secondary' : 'text-text-muted'}>
                {step.label}
              </span>
              {step.status === 'done' && <Check className="w-3 h-3 text-success" />}
              {step.status === 'active' && <Loader2 className="w-3 h-3 text-accent animate-spin" />}
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Queue Items */}
    <div className="space-y-2">
      {[
        { title: 'Top 10 CRM Tools 2024', status: 'Queued', badge: 'bg-main text-text-muted' },
        { title: 'Email Marketing Guide', status: 'Scheduled', badge: 'bg-secondary/10 text-secondary' },
      ].map((item, i) => (
        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-elevated/40 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-text-muted font-mono">0{i + 1}</span>
            <span className="text-text-secondary">{item.title}</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${item.badge}`}>{item.status}</span>
        </div>
      ))}
    </div>
  </div>
);

const KeywordView: React.FC = () => (
  <div className="h-full flex flex-col animate-fade-in">
    <div className="flex justify-between items-center mb-5 px-1">
      <div>
        <h3 className="text-text-primary font-semibold">Keyword Opportunities</h3>
        <p className="text-text-muted text-xs mt-1">Identified 42 high-potential topics</p>
      </div>
      <div className="flex gap-2">
        <button className="p-1.5 rounded hover:bg-elevated text-text-secondary">
          <FilterIcon className="w-4 h-4" />
        </button>
        <button className="p-1.5 rounded hover:bg-elevated text-text-secondary">
          <LayoutGrid className="w-4 h-4" />
        </button>
      </div>
    </div>

    <div className="bg-elevated rounded-xl border border-border overflow-hidden flex-1 flex flex-col">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-2 p-3 bg-main/50 border-b border-border text-[10px] font-semibold text-text-muted uppercase tracking-wider">
        <div className="col-span-5">Keyword</div>
        <div className="col-span-2 text-right">Vol</div>
        <div className="col-span-2 text-right">KD</div>
        <div className="col-span-3 text-right">Potential</div>
      </div>

      {/* Table Rows */}
      <div className="flex-1 overflow-hidden">
        {[
          { kw: 'programmatic seo guide', vol: '2.4k', kd: 12, trend: [10, 20, 15, 40, 30, 80, 90] },
          { kw: 'ai content detector', vol: '12k', kd: 45, trend: [50, 55, 60, 55, 80, 95, 100] },
          { kw: 'automated blogging', vol: '800', kd: 8, trend: [5, 8, 12, 15, 20, 25, 30] },
          { kw: 'seo automation tools', vol: '3.2k', kd: 28, trend: [20, 20, 30, 45, 40, 60, 75] },
          { kw: 'scale organic traffic', vol: '1.1k', kd: 15, trend: [10, 12, 15, 20, 35, 40, 55] },
        ].map((row, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 p-3 items-center border-b border-border/50 hover:bg-elevated/30 group transition-colors text-xs">
            <div className="col-span-5 font-medium text-text-primary group-hover:text-white flex items-center gap-2">
              <div className="w-4 h-4 rounded flex items-center justify-center border border-border bg-main text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                <PlusIcon className="w-3 h-3" />
              </div>
              {row.kw}
            </div>
            <div className="col-span-2 text-right text-text-secondary">{row.vol}</div>
            <div className="col-span-2 text-right">
              <span className={`px-1.5 py-0.5 rounded ${row.kd < 30 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                {row.kd}
              </span>
            </div>
            <div className="col-span-3 flex justify-end items-center gap-2">
              {/* Fake Sparkline */}
              <div className="h-4 w-12 flex items-end gap-[1px]">
                {row.trend.map((h, j) => (
                  <div key={j} style={{ height: `${h}%` }} className={`w-1.5 rounded-t-[1px] ${row.kd < 30 ? 'bg-accent/40' : 'bg-surface'}`}></div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const AuditView: React.FC = () => (
  <div className="h-full flex flex-col animate-fade-in">
    <div className="flex justify-between items-center mb-5 px-1">
      <div>
        <h3 className="text-text-primary font-semibold">Quality Audit</h3>
        <p className="text-text-muted text-xs mt-1">Pre-publication checks passed</p>
      </div>
      <div className="px-2 py-1 bg-success/10 text-success rounded text-xs font-medium border border-success/20">
        Ready to Publish
      </div>
    </div>

    <div className="flex gap-4 flex-1 min-h-0">
      {/* Document View */}
      <div className="flex-1 bg-elevated rounded-xl border border-border p-4 relative overflow-hidden">
        <div className="text-sm font-bold text-text-primary mb-2">Why Speed Matters</div>
        <div className="text-xs text-text-secondary leading-6">
          <p className="mb-2">
            Page speed is a{' '}
            <span className="bg-warning/20 text-warning px-0.5 rounded border-b border-warning/40">critical ranking factor</span> for Google.
            Slow sites lead to higher bounce rates and lower conversions.
          </p>
          <p>
            To improve performance, focus on{' '}
            <span className="bg-success/20 text-success px-0.5 rounded border-b border-success/40">optimizing images</span> and leveraging browser caching.
          </p>
        </div>

        {/* Overlay Gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-elevated to-transparent"></div>
      </div>

      {/* Score Sidebar */}
      <div className="w-40 flex flex-col gap-3">
        <div className="bg-elevated rounded-xl border border-border p-4 flex flex-col items-center justify-center relative overflow-hidden group min-h-[140px]">
          <div className="relative w-28 h-28 flex items-center justify-center mb-1">
            {/* Decorative Ticks Ring - Static for stability */}
            <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100">
              {Array.from({ length: 40 }).map((_, i) => (
                <line
                  key={i}
                  x1="50"
                  y1="2"
                  x2="50"
                  y2="8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-text-muted"
                  transform={`rotate(${i * 9} 50 50)`}
                />
              ))}
            </svg>

            {/* Main Progress SVG */}
            <svg className="w-20 h-20 -rotate-90 relative z-10" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="scoreGradientUnique" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgb(var(--color-success))" />
                  <stop offset="100%" stopColor="rgb(var(--color-success) / 0.7)" />
                </linearGradient>
              </defs>
              {/* Background Track */}
              <circle cx="50" cy="50" r="40" stroke="rgb(var(--color-bg-surface-light))" strokeWidth="8" fill="transparent" />
              {/* Progress - 96% of 251.2 (circumference) is ~241 */}
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="url(#scoreGradientUnique)"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray="251.3"
                strokeDashoffset="10"
                strokeLinecap="round"
              />
            </svg>

            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
              <span className="text-2xl font-bold text-white tracking-tighter">96</span>
            </div>
          </div>

          <div className="flex flex-col items-center relative z-10">
            <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-1">SEO Health</div>
          </div>
        </div>

        <div className="bg-elevated rounded-xl border border-border p-3 flex-1 overflow-y-auto no-scrollbar">
          <div className="space-y-2">
            {[
              { label: 'Keywords', count: '12/12', col: 'text-success' },
              { label: 'Readability', count: 'Good', col: 'text-success' },
              { label: 'Links', count: '5', col: 'text-accent' },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center text-[10px]">
                <span className="text-text-secondary">{item.label}</span>
                <span className={`font-mono ${item.col}`}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const CalendarView: React.FC = () => (
  <div className="h-full flex flex-col animate-fade-in">
    <div className="flex justify-between items-center mb-5 px-1">
      <div>
        <h3 className="text-text-primary font-semibold">Editorial Calendar</h3>
        <p className="text-text-muted text-xs mt-1">October 2024</p>
      </div>
      <div className="flex gap-2 text-text-secondary">
        <button className="h-7 w-7 p-0 bg-transparent hover:bg-elevated rounded transition-colors">
          <ChevronDown className="rotate-90 w-4 h-4" />
        </button>
        <button className="h-7 w-7 p-0 bg-transparent hover:bg-elevated rounded transition-colors">
          <ChevronDown className="-rotate-90 w-4 h-4" />
        </button>
      </div>
    </div>

    <div className="flex-1 bg-elevated rounded-xl border border-border p-3">
      <div className="grid grid-cols-7 gap-1 h-full auto-rows-fr">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
          <div key={d} className="h-6 text-[10px] font-bold text-text-muted text-center flex items-center justify-center">
            {d}
          </div>
        ))}

        {/* Calendar Grid Generation */}
        {Array.from({ length: 30 }).map((_, i) => {
          const day = i + 1;
          // Simulate some scheduled data
          const scheduled = [2, 8, 9, 15, 16, 22, 29].includes(day);
          const drafted = [5, 12, 19, 23, 26].includes(day);
          const published = [1, 3, 4, 6, 7].includes(day);

          const isToday = day === 15;

          return (
            <div
              key={i}
              className={`min-h-[40px] rounded border ${isToday ? 'border-accent/30 bg-accent/5' : 'border-border/50 bg-main/30'} relative group hover:border-text-muted transition-colors p-1 flex flex-col`}
            >
              <span className={`text-[9px] ${isToday ? 'text-accent font-bold' : 'text-text-muted'} mb-1`}>{day}</span>

              {scheduled && (
                <div className="mt-0.5 bg-secondary/30 border border-accent/20 rounded-[2px] p-0.5 mb-0.5">
                  <div className="h-1 w-full bg-accent/50 rounded-full"></div>
                </div>
              )}

              {drafted && (
                <div className="mt-0.5 bg-surface border border-border border-dashed rounded-[2px] p-0.5">
                  <div className="h-1 w-2/3 bg-text-muted/50 rounded-full"></div>
                </div>
              )}

              {published && (
                <div className="absolute bottom-1 right-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>

    <div className="mt-3 flex gap-4 text-[10px] text-text-muted px-1">
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded bg-accent"></div> Scheduled
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded bg-surface border border-text-muted border-dashed"></div> Draft
      </div>
    </div>
  </div>
);

export function HeroDashboardPreview({ className = '' }: IProps): JSX.Element {
  const [activeSlide, setActiveSlide] = useState(0);

  // Typewriter state
  const fullText = "generative search experiences (SGE).";
  const [typedText, setTypedText] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    // Rotate slides
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 4);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  // Handle Typewriter effect when slide 0 is active
  useEffect(() => {
    if (activeSlide === 0) {
      setTypedText(''); // Reset
      let index = 0;
      const typeInterval = setInterval(() => {
        if (index <= fullText.length) {
          setTypedText(fullText.slice(0, index));
          index++;
        } else {
          clearInterval(typeInterval);
        }
      }, 50); // Speed of typing
      return () => clearInterval(typeInterval);
    }
  }, [activeSlide]);

  // Blinking cursor effect
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 500);
    return () => clearInterval(blinkInterval);
  }, []);

  return (
    <div className={`relative mx-auto max-w-5xl ${className}`}>
      <div className="relative rounded-2xl bg-main border border-border shadow-2xl aspect-[16/10] sm:aspect-[16/9] flex flex-col overflow-hidden group hover:border-text-muted/30 transition-colors">
        {/* Window Controls / Header */}
        <div className="h-10 border-b border-border bg-elevated/50 flex items-center justify-between px-4 select-none">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-error/20 border border-error/50"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-warning/20 border border-warning/50"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-success/20 border border-success/50"></div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-main border border-border rounded-md px-3 py-1">
            <Zap className="w-3 h-3 text-accent" />
            <span className="text-[10px] text-text-secondary font-medium">app.autopilotrank.com</span>
          </div>
          <div className="flex items-center gap-3">
            <Bell className="w-3.5 h-3.5 text-text-muted" />
            <div className="w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center">
              <User className="w-3 h-3 text-text-secondary" />
            </div>
          </div>
        </div>

        {/* App Interface */}
        <div className="flex-1 flex overflow-hidden">
          {/* Navigation Sidebar */}
          <div className="w-16 sm:w-48 bg-elevated/30 border-r border-border flex flex-col py-4 px-2 sm:px-3 gap-1">
            {[
              { icon: <LayoutGrid className="w-4 h-4" />, label: 'Dashboard', id: 0 },
              { icon: <Search className="w-4 h-4" />, label: 'Keywords', id: 1 },
              { icon: <CheckCircle2 className="w-4 h-4" />, label: 'Quality Audit', id: 2 },
              { icon: <CalendarIcon className="w-4 h-4" />, label: 'Calendar', id: 3 },
              { icon: <BarChart2 className="w-4 h-4" />, label: 'Analytics', id: 4 },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(item.id)}
                className={`w-full flex items-center gap-3 px-2 sm:px-3 py-2 rounded-md transition-all duration-200 group ${activeSlide === item.id ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary hover:bg-surface/50'}`}
              >
                <span className={activeSlide === item.id ? 'text-accent' : 'group-hover:text-text-secondary'}>{item.icon}</span>
                <span className="hidden sm:block text-xs font-medium">{item.label}</span>
                {activeSlide === item.id && <div className="ml-auto w-1 h-1 rounded-full bg-accent hidden sm:block"></div>}
              </button>
            ))}
            <div className="mt-auto">
              <button className="w-full flex items-center gap-3 px-2 sm:px-3 py-2 rounded-md text-text-muted hover:text-text-secondary hover:bg-surface/50 transition-colors">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:block text-xs font-medium">Settings</span>
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 bg-main relative overflow-hidden flex flex-col">
            {/* Top Bar */}
            <div className="h-12 border-b border-border flex items-center justify-between px-6 bg-main/50 backdrop-blur-sm z-10">
              <h2 className="text-sm font-semibold text-text-primary">
                {activeSlide === 0 ? 'Dashboard' : activeSlide === 1 ? 'Keyword Research' : activeSlide === 2 ? 'Optimization' : 'Calendar'}
              </h2>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                </span>
                <span className="text-[10px] text-text-secondary font-mono">LIVE</span>
              </div>
            </div>

            {/* Dynamic View Content */}
            <div className="flex-1 p-6 overflow-hidden relative">
              {activeSlide === 0 && <PipelineView typedText={typedText} cursorVisible={cursorVisible} />}
              {activeSlide === 1 && <KeywordView />}
              {activeSlide === 2 && <AuditView />}
              {activeSlide === 3 && <CalendarView />}

              {/* Default fallback for analytics view if added later */}
              {activeSlide > 3 && <div className="flex items-center justify-center h-full text-text-muted text-sm">Analytics Module Loading...</div>}
            </div>

            {/* Decorative Scan Line */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-accent/50 shadow-[0_0_20px_rgba(var(--color-accent),0.5)] animate-scan pointer-events-none z-20 opacity-50"></div>
          </div>
        </div>
      </div>

      {/* Reflection Effect below dashboard */}
      <div className="absolute -bottom-4 left-4 right-4 h-4 bg-main/20 blur-xl rounded-[100%]"></div>
    </div>
  );
}

