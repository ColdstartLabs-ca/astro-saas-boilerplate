'use client';

import React, { useEffect, useState } from 'react';
import {
  PlayCircle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  FileText,
  BarChart2,
  Calendar as CalendarIcon,
  Search,
  Check,
  LayoutGrid,
  Settings,
  Bell,
  User,
  Zap,
  ChevronDown,
  Plus,
  Filter,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useModalStore } from '@client/store/modalStore';
import { getTranslations } from '@src/i18n/utils';
import { useMemo } from 'react';

// --- Sub-components defined outside to prevent re-renders ---

interface IPipelineViewProps {
  typedText: string;
  cursorVisible: boolean;
}

const PipelineView: React.FC<IPipelineViewProps> = ({ typedText, cursorVisible }) => (
  <div className="h-full flex flex-col animate-fadeIn">
    {/* View Header */}
    <div className="flex justify-between items-center mb-6 px-1">
      <div>
        <h3 className="text-white font-semibold flex items-center gap-2">
          Active Generation Queue
          <span className="px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 text-[10px] font-mono border border-brand-500/30">
            RUNNING
          </span>
        </h3>
        <p className="text-slate-500 text-xs mt-1">
          Processing 3 campaigns • 12 articles remaining
        </p>
      </div>
      <button className="bg-brand-600 text-white text-xs font-semibold px-3 py-1.5 rounded-md h-7 hover:bg-brand-500 transition-colors flex items-center">
        <Plus className="w-3 h-3 mr-1.5" /> New Campaign
      </button>
    </div>

    {/* Main Active Card */}
    <div className="flex-1 bg-slate-900 rounded-xl border border-slate-700/50 p-4 mb-4 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-500 to-transparent animate-progress"></div>

      <div className="flex gap-4 h-full">
        {/* Article Preview */}
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-blue-500/10 text-blue-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-200">The Future of AI SEO</div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
                  Writing Section 3/8
                </div>
              </div>
            </div>
            <div className="text-[10px] font-mono text-slate-500 bg-slate-950 border border-slate-800 rounded px-2 py-1">
              GPT-4o
            </div>
          </div>

          {/* Typing Effect Area */}
          <div className="flex-1 bg-slate-950/50 rounded-lg border border-slate-800/50 p-3 font-mono text-xs text-slate-400 leading-relaxed overflow-hidden relative">
            <span className="opacity-50">
              Search engines are evolving rapidly. To stay ahead, brands must adapt to{' '}
            </span>
            <span className="text-slate-200">{typedText}</span>
            <span
              className={`inline-block w-1.5 h-3 bg-brand-500 ml-0.5 align-middle transition-opacity duration-100 ${cursorVisible ? 'opacity-100' : 'opacity-0'}`}
            ></span>
            <div className="absolute bottom-2 right-2 text-[9px] text-slate-600">428 words</div>
          </div>
        </div>

        {/* Right Sidebar Mockup (Steps) */}
        <div className="w-32 hidden sm:flex flex-col gap-2 border-l border-slate-800 pl-4">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Workflow
          </div>
          {[
            { label: 'Keyword Data', status: 'done' },
            { label: 'Outline Gen', status: 'done' },
            { label: 'Drafting', status: 'active' },
            { label: 'SEO Audit', status: 'pending' },
            { label: 'Publishing', status: 'pending' },
          ].map((step, i) => (
            <div key={i} className="flex items-center justify-between text-[10px]">
              <span
                className={
                  step.status === 'active'
                    ? 'text-brand-400 font-medium'
                    : step.status === 'done'
                      ? 'text-slate-400'
                      : 'text-slate-600'
                }
              >
                {step.label}
              </span>
              {step.status === 'done' && <Check className="w-3 h-3 text-green-500" />}
              {step.status === 'active' && (
                <Loader2 className="w-3 h-3 text-brand-500 animate-spin" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Queue Items */}
    <div className="space-y-2">
      {[
        { title: 'Top 10 CRM Tools 2024', status: 'Queued', badge: 'bg-slate-800 text-slate-400' },
        {
          title: 'Email Marketing Guide',
          status: 'Scheduled',
          badge: 'bg-purple-500/10 text-purple-400',
        },
      ].map((item, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-900/40 text-xs"
        >
          <div className="flex items-center gap-3">
            <span className="text-slate-600 font-mono">0{i + 2}</span>
            <span className="text-slate-300">{item.title}</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${item.badge}`}>
            {item.status}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const KeywordView: React.FC = () => (
  <div className="h-full flex flex-col animate-fadeIn">
    <div className="flex justify-between items-center mb-5 px-1">
      <div>
        <h3 className="text-white font-semibold">Keyword Opportunities</h3>
        <p className="text-slate-500 text-xs mt-1">Identified 42 high-potential topics</p>
      </div>
      <div className="flex gap-2">
        <button className="p-1.5 rounded hover:bg-slate-800 text-slate-400">
          <Filter className="w-4 h-4" />
        </button>
        <button className="p-1.5 rounded hover:bg-slate-800 text-slate-400">
          <LayoutGrid className="w-4 h-4" />
        </button>
      </div>
    </div>

    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex-1 flex flex-col">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-2 p-3 bg-slate-950/50 border-b border-slate-800 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
        <div className="col-span-5">Keyword</div>
        <div className="col-span-2 text-right">Vol</div>
        <div className="col-span-2 text-right">KD</div>
        <div className="col-span-3 text-right">Potential</div>
      </div>

      {/* Table Rows */}
      <div className="flex-1 overflow-hidden">
        {[
          {
            kw: 'programmatic seo guide',
            vol: '2.4k',
            kd: 12,
            trend: [10, 20, 15, 40, 30, 80, 90],
          },
          { kw: 'ai content detector', vol: '12k', kd: 45, trend: [50, 55, 60, 55, 80, 95, 100] },
          { kw: 'automated blogging', vol: '800', kd: 8, trend: [5, 8, 12, 15, 20, 25, 30] },
          { kw: 'seo automation tools', vol: '3.2k', kd: 28, trend: [20, 20, 30, 45, 40, 60, 75] },
          { kw: 'scale organic traffic', vol: '1.1k', kd: 15, trend: [10, 12, 15, 20, 35, 40, 55] },
        ].map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-12 gap-2 p-3 items-center border-b border-slate-800/50 hover:bg-slate-800/30 group transition-colors text-xs"
          >
            <div className="col-span-5 font-medium text-slate-200 group-hover:text-white flex items-center gap-2">
              <div className="w-4 h-4 rounded flex items-center justify-center border border-slate-700 bg-slate-800 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus className="w-3 h-3" />
              </div>
              {row.kw}
            </div>
            <div className="col-span-2 text-right text-slate-400">{row.vol}</div>
            <div className="col-span-2 text-right">
              <span
                className={`px-1.5 py-0.5 rounded ${row.kd < 30 ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}
              >
                {row.kd}
              </span>
            </div>
            <div className="col-span-3 flex justify-end items-center gap-2">
              {/* Fake Sparkline */}
              <div className="h-4 w-12 flex items-end gap-[1px]">
                {row.trend.map((h, j) => (
                  <div
                    key={j}
                    style={{ height: `${h}%` }}
                    className={`w-1.5 rounded-t-[1px] ${row.kd < 30 ? 'bg-brand-500/40' : 'bg-slate-700'}`}
                  ></div>
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
  <div className="h-full flex flex-col animate-fadeIn">
    <div className="flex justify-between items-center mb-5 px-1">
      <div>
        <h3 className="text-white font-semibold">Quality Audit</h3>
        <p className="text-slate-500 text-xs mt-1">Pre-publication checks passed</p>
      </div>
      <div className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs font-medium border border-green-500/20">
        Ready to Publish
      </div>
    </div>

    <div className="flex gap-4 flex-1 min-h-0">
      {/* Document View */}
      <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 p-4 relative overflow-hidden">
        <div className="text-sm font-bold text-slate-200 mb-2">Why Speed Matters</div>
        <div className="text-xs text-slate-400 leading-6">
          <p className="mb-2">
            Page speed is a{' '}
            <span className="bg-yellow-500/20 text-yellow-200 px-0.5 rounded border-b border-yellow-500/40">
              critical ranking factor
            </span>{' '}
            for Google. Slow sites lead to higher bounce rates and lower conversions.
          </p>
          <p>
            To improve performance, focus on{' '}
            <span className="bg-green-500/20 text-green-200 px-0.5 rounded border-b border-green-500/40">
              optimizing images
            </span>{' '}
            and leveraging browser caching.
          </p>
        </div>

        {/* Overlay Gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-900 to-transparent"></div>
      </div>

      {/* Score Sidebar */}
      <div className="w-40 flex flex-col gap-3">
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col items-center justify-center relative overflow-hidden group min-h-[140px]">
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
                  className="text-slate-400"
                  transform={`rotate(${i * 9} 50 50)`}
                />
              ))}
            </svg>

            {/* Main Progress SVG */}
            <svg
              className="w-20 h-20 -rotate-90 relative z-10 drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]"
              viewBox="0 0 100 100"
            >
              <defs>
                <linearGradient id="scoreGradientUnique" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#86efac" />
                </linearGradient>
              </defs>
              {/* Background Track */}
              <circle cx="50" cy="50" r="40" stroke="#0f172a" strokeWidth="8" fill="transparent" />
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
            <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">
              SEO Health
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-3 flex-1 overflow-y-auto no-scrollbar">
          <div className="space-y-2">
            {[
              { label: 'Keywords', count: '12/12', col: 'text-green-400' },
              { label: 'Readability', count: 'Good', col: 'text-green-400' },
              { label: 'Links', count: '5', col: 'text-blue-400' },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400">{item.label}</span>
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
  <div className="h-full flex flex-col animate-fadeIn">
    <div className="flex justify-between items-center mb-5 px-1">
      <div>
        <h3 className="text-white font-semibold">Editorial Calendar</h3>
        <p className="text-slate-500 text-xs mt-1">October 2024</p>
      </div>
      <div className="flex gap-2 text-slate-400">
        <button className="p-1.5 rounded hover:bg-slate-800">
          <ChevronDown className="rotate-90 w-4 h-4" />
        </button>
        <button className="p-1.5 rounded hover:bg-slate-800">
          <ChevronDown className="-rotate-90 w-4 h-4" />
        </button>
      </div>
    </div>

    <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 p-3">
      <div className="grid grid-cols-7 gap-1 h-full auto-rows-fr">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
          <div
            key={d}
            className="h-6 text-[10px] font-bold text-slate-600 text-center flex items-center justify-center"
          >
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
              className={`min-h-[40px] rounded border ${isToday ? 'border-brand-500/30 bg-brand-500/5' : 'border-slate-800/50 bg-slate-950/30'} relative group hover:border-slate-600 transition-colors p-1 flex flex-col`}
            >
              <span
                className={`text-[9px] ${isToday ? 'text-brand-400 font-bold' : 'text-slate-500'} mb-1`}
              >
                {day}
              </span>

              {scheduled && (
                <div className="mt-0.5 bg-brand-900/30 border border-brand-500/20 rounded-[2px] p-0.5 mb-0.5">
                  <div className="h-1 w-full bg-brand-500/50 rounded-full"></div>
                </div>
              )}

              {drafted && (
                <div className="mt-0.5 bg-slate-800 border border-slate-700 border-dashed rounded-[2px] p-0.5">
                  <div className="h-1 w-2/3 bg-slate-500/50 rounded-full"></div>
                </div>
              )}

              {published && (
                <div className="absolute bottom-1 right-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>

    <div className="mt-3 flex gap-4 text-[10px] text-slate-500 px-1">
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded bg-brand-500"></div> Scheduled
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded bg-slate-600 border border-slate-500 border-dashed"></div>{' '}
        Draft
      </div>
    </div>
  </div>
);

export function HeroSection(): JSX.Element {
  const { openAuthModal } = useModalStore();
  useMemo(() => getTranslations('homepage'), []);

  // Typewriter state
  const fullText = 'generative search experiences (SGE).';
  const [typedText, setTypedText] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);

    // Rotate slides
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % 4);
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
      setCursorVisible(v => !v);
    }, 500);
    return () => clearInterval(blinkInterval);
  }, []);

  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-40 overflow-hidden bg-slate-900">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0 bg-grid-pattern opacity-30 h-[800px] pointer-events-none"></div>

      {/* Animated Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-brand-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        {/* Animated Badge */}
        <div
          className={`transition-all duration-700 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
        >
          <div className="inline-flex items-center space-x-2 bg-slate-900/50 border border-slate-700/50 rounded-full px-4 py-1.5 mb-8 backdrop-blur-md shadow-lg shadow-brand-500/10 hover:border-brand-500/50 transition-colors cursor-default group">
            <span className="flex relative h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
              Trusted by 500+ businesses
            </span>
            <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-brand-400 transition-colors ml-1" />
          </div>
        </div>

        {/* Headline */}
        <h1
          className={`text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.15] transition-all duration-700 delay-100 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
        >
          Scale Your Organic Traffic <br className="hidden md:block" />
          <span className="gradient-text">on Autopilot—With Quality That Doesn&apos;t Sound Like AI</span>
        </h1>

        {/* Subheadline */}
        <p
          className={`max-w-2xl mx-auto text-lg md:text-xl text-slate-400 mb-10 leading-relaxed transition-all duration-700 delay-200 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
        >
          Multi-model AI engine + humanizer for undetectable content + native CMS publishing. All the automation, none of the &ldquo;this was obviously written by AI&rdquo; problems.
        </p>

        {/* CTAs */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-16 transition-all duration-700 delay-300 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
        >
          <motion.button
            onClick={() => openAuthModal('register')}
            className="block w-full sm:w-auto bg-brand-600 text-white font-semibold text-center py-3 rounded-lg shadow-lg shadow-brand-900/20 hover:bg-brand-500 transition-colors px-8 py-4 text-lg"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Start Free Trial
          </motion.button>
          <motion.button
            className="block w-full sm:w-auto px-8 py-4 text-lg bg-slate-950/50 backdrop-blur-sm border border-slate-700 hover:bg-slate-800 hover:text-white transition-all duration-300 group flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <PlayCircle className="text-slate-400 group-hover:text-brand-400 transition-colors" />
            Watch Demo
          </motion.button>
        </div>

        {/* Trust Badges */}
        <div
          className={`flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm text-slate-500 mb-20 transition-all duration-700 delay-400 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
        >
          <div className="flex items-center hover:text-slate-300 transition-colors">
            <CheckCircle2 className="h-4 w-4 mr-2 text-brand-500" /> No credit card required
          </div>
          <div className="flex items-center hover:text-slate-300 transition-colors">
            <CheckCircle2 className="h-4 w-4 mr-2 text-brand-500" /> 14-day free trial
          </div>
          <div className="flex items-center hover:text-slate-300 transition-colors">
            <CheckCircle2 className="h-4 w-4 mr-2 text-brand-500" /> Cancel anytime
          </div>
        </div>

        {/* 3D Dashboard Container */}
        <div
          className={`relative mx-auto max-w-5xl transition-all duration-1000 delay-500 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
        >
          <div className="relative rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl shadow-black/80 aspect-[16/10] sm:aspect-[16/9] flex flex-col overflow-hidden group hover:border-slate-700 transition-colors">
            {/* Window Controls / Header */}
            <div className="h-10 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-4 select-none">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-md px-3 py-1">
                <Zap className="w-3 h-3 text-brand-500" />
                <span className="text-[10px] text-slate-400 font-medium">
                  app.autopilotrank.com
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Bell className="w-3.5 h-3.5 text-slate-600" />
                <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <User className="w-3 h-3 text-slate-400" />
                </div>
              </div>
            </div>

            {/* App Interface */}
            <div className="flex-1 flex overflow-hidden">
              {/* Navigation Sidebar */}
              <div className="w-16 sm:w-48 bg-slate-900/30 border-r border-slate-800 flex flex-col py-4 px-2 sm:px-3 gap-1">
                {[
                  { icon: <LayoutGrid className="w-4 h-4" />, label: 'Dashboard', id: 0 },
                  { icon: <Search className="w-4 h-4" />, label: 'Keywords', id: 1 },
                  { icon: <CheckCircle2 className="w-4 h-4" />, label: 'Quality Audit', id: 2 },
                  { icon: <CalendarIcon className="w-4 h-4" />, label: 'Calendar', id: 3 },
                  { icon: <BarChart2 className="w-4 h-4" />, label: 'Analytics', id: 4 },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSlide(i)}
                    className={`w-full flex items-center gap-3 px-2 sm:px-3 py-2 rounded-md transition-all duration-200 group ${activeSlide === item.id ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                  >
                    <span
                      className={
                        activeSlide === item.id ? 'text-brand-400' : 'group-hover:text-slate-300'
                      }
                    >
                      {item.icon}
                    </span>
                    <span className="hidden sm:block text-xs font-medium">{item.label}</span>
                    {activeSlide === item.id && (
                      <div className="ml-auto w-1 h-1 rounded-full bg-brand-500 hidden sm:block"></div>
                    )}
                  </button>
                ))}
                <div className="mt-auto">
                  <button className="w-full flex items-center gap-3 px-2 sm:px-3 py-2 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors">
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:block text-xs font-medium">Settings</span>
                  </button>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col">
                {/* Top Bar */}
                <div className="h-12 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/50 backdrop-blur-sm z-10">
                  <h2 className="text-sm font-semibold text-white">
                    {activeSlide === 0
                      ? 'Dashboard'
                      : activeSlide === 1
                        ? 'Keyword Research'
                        : activeSlide === 2
                          ? 'Optimization'
                          : 'Calendar'}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">LIVE</span>
                  </div>
                </div>

                {/* Dynamic View Content */}
                <div className="flex-1 p-6 overflow-hidden relative">
                  {activeSlide === 0 && (
                    <PipelineView typedText={typedText} cursorVisible={cursorVisible} />
                  )}
                  {activeSlide === 1 && <KeywordView />}
                  {activeSlide === 2 && <AuditView />}
                  {activeSlide === 3 && <CalendarView />}

                  {/* Default fallback for analytics view if added later */}
                  {activeSlide > 3 && (
                    <div className="flex items-center justify-center h-full text-slate-600 text-sm">
                      Analytics Module Loading...
                    </div>
                  )}
                </div>

                {/* Decorative Scan Line */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-brand-500/50 shadow-[0_0_20px_rgba(34,197,94,0.5)] animate-scan pointer-events-none z-20 opacity-50"></div>
              </div>
            </div>
          </div>

          {/* Reflection Effect below dashboard */}
          <div className="absolute -bottom-4 left-4 right-4 h-4 bg-slate-950/20 blur-xl rounded-[100%]"></div>
        </div>
      </div>
    </section>
  );
}
