'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DashboardButton } from '../ui/DashboardButton';
import { useCalendarArticles } from '@client/hooks/useCalendarArticles';
import { MonthView } from './calendar/MonthView';
import { WeekView } from './calendar/WeekView';
import { DayView } from './calendar/DayView';
import { CalendarFilters, filterArticlesByStatus } from './calendar/CalendarFilters';
import { CampaignLegend } from './calendar/CampaignLegend';
import { ArticleDetailModal } from './calendar/ArticleDetailModal';
import { useArticleActions } from '@client/hooks/useArticleActions';
import type { ICalendarArticle } from '@shared/types/calendar.types';
import type { CalendarView as CalendarViewType } from '@shared/types/calendar.types';
import type { CalendarStatusFilter } from './calendar/CalendarFilters';

// --- Date range helpers ---

function getMonthRange(date: Date): { dateFrom: string; dateTo: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0, 23, 59, 59);
  return {
    dateFrom: first.toISOString().split('T')[0],
    dateTo: last.toISOString().split('T')[0],
  };
}

function getWeekRange(date: Date): { dateFrom: string; dateTo: string } {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  const sunday = d;
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59);
  return {
    dateFrom: sunday.toISOString().split('T')[0],
    dateTo: saturday.toISOString().split('T')[0],
  };
}

function getDayRange(date: Date): { dateFrom: string; dateTo: string } {
  const dateStr = date.toISOString().split('T')[0];
  return { dateFrom: dateStr, dateTo: dateStr };
}

function getDateRange(view: CalendarViewType, date: Date): { dateFrom: string; dateTo: string } {
  if (view === 'week') return getWeekRange(date);
  if (view === 'day') return getDayRange(date);
  return getMonthRange(date);
}

// --- Title helpers ---

function getWeekTitle(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  const sunday = d;
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);

  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  const yearFmt = new Intl.DateTimeFormat('en-US', { year: 'numeric' });

  const startLabel = fmt.format(sunday);
  const endLabel = fmt.format(saturday);
  const year = yearFmt.format(saturday);

  return `${startLabel} – ${endLabel}, ${year}`;
}

function getDisplayTitle(view: CalendarViewType, date: Date): string {
  if (view === 'month') {
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
  }
  if (view === 'week') {
    return getWeekTitle(date);
  }
  // day
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}

// --- Navigation helpers ---

function navigatePrev(view: CalendarViewType, date: Date): Date {
  const d = new Date(date);
  if (view === 'month') return new Date(d.getFullYear(), d.getMonth() - 1, 1);
  if (view === 'week') { d.setDate(d.getDate() - 7); return d; }
  d.setDate(d.getDate() - 1);
  return d;
}

function navigateNext(view: CalendarViewType, date: Date): Date {
  const d = new Date(date);
  if (view === 'month') return new Date(d.getFullYear(), d.getMonth() + 1, 1);
  if (view === 'week') { d.setDate(d.getDate() + 7); return d; }
  d.setDate(d.getDate() + 1);
  return d;
}

export function CalendarView(): JSX.Element {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeView, setActiveView] = useState<CalendarViewType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calendar-view');
      if (saved === 'month' || saved === 'week' || saved === 'day') return saved;
    }
    return 'month';
  });
  const [selectedArticle, setSelectedArticle] = useState<ICalendarArticle | null>(null);
  const [statusFilter, setStatusFilter] = useState<CalendarStatusFilter>('all');
  const [hiddenCampaignIds, setHiddenCampaignIds] = useState<Set<string>>(new Set());

  const { dateFrom, dateTo } = getDateRange(activeView, currentDate);
  const { articles, isLoading, error, refetch } = useCalendarArticles({ dateFrom, dateTo });
  const { reschedule, publishNow, isRescheduling, isPublishing } = useArticleActions({ onSuccess: refetch });

  const filteredArticles = useMemo(() => {
    let result = filterArticlesByStatus(articles, statusFilter);
    if (hiddenCampaignIds.size > 0) {
      result = result.filter(a => !a.campaignId || !hiddenCampaignIds.has(a.campaignId));
    }
    return result;
  }, [articles, statusFilter, hiddenCampaignIds]);

  const goToPrev = useCallback(() => setCurrentDate(d => navigatePrev(activeView, d)), [activeView]);
  const goToNext = useCallback(() => setCurrentDate(d => navigateNext(activeView, d)), [activeView]);
  const goToToday = useCallback(() => setCurrentDate(new Date()), []);

  const handleToggleCampaign = useCallback((campaignId: string) => {
    setHiddenCampaignIds(prev => {
      const next = new Set(prev);
      if (next.has(campaignId)) next.delete(campaignId);
      else next.add(campaignId);
      return next;
    });
  }, []);

  const handleShowAll = useCallback(() => {
    setHiddenCampaignIds(new Set());
  }, []);

  const handleViewChange = useCallback((view: CalendarViewType) => {
    setActiveView(view);
    if (typeof window !== 'undefined') {
      localStorage.setItem('calendar-view', view);
    }
  }, []);

  const handleArticleClick = useCallback((article: ICalendarArticle) => {
    setSelectedArticle(article);
  }, []);

  const handleArticleDrop = useCallback(async (articleId: string, newDate: Date) => {
    // Validate: not a past date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newDate < today) {
      return;
    }
    const isoDate = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), 9, 0, 0).toISOString();
    try {
      await reschedule(articleId, isoDate);
    } catch {
      // reschedule already sets error state; refetch to restore correct data
      refetch();
    }
  }, [reschedule, refetch]);

  const displayTitle = getDisplayTitle(activeView, currentDate);

  const prevLabel = activeView === 'month' ? 'Previous month' : activeView === 'week' ? 'Previous week' : 'Previous day';
  const nextLabel = activeView === 'month' ? 'Next month' : activeView === 'week' ? 'Next week' : 'Next day';

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col animate-fadeIn" data-testid="calendar-view">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-white">{displayTitle}</h2>
          <div className="flex bg-surface rounded-lg border border-border p-0.5">
            <button
              onClick={goToPrev}
              className="p-1.5 hover:bg-surface-light text-secondary hover:text-white rounded"
              aria-label={prevLabel}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToNext}
              className="p-1.5 hover:bg-surface-light text-secondary hover:text-white rounded"
              aria-label={nextLabel}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <DashboardButton variant="outline" size="sm" onClick={goToToday} className="h-8">Today</DashboardButton>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex bg-surface rounded-lg border border-border p-0.5">
            {(['month', 'week', 'day'] as CalendarViewType[]).map(view => (
              <button
                key={view}
                onClick={() => handleViewChange(view)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors capitalize
                  ${activeView === view ? 'bg-accent text-white' : 'text-secondary hover:text-white'}`}
              >
                {view}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters + Legend row */}
      <div className="flex flex-col gap-2 mb-3">
        <CalendarFilters activeStatusFilter={statusFilter} onStatusFilterChange={setStatusFilter} />
        <CampaignLegend
          articles={articles}
          hiddenCampaignIds={hiddenCampaignIds}
          onToggleCampaign={handleToggleCampaign}
          onShowAll={handleShowAll}
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center text-secondary" data-testid="calendar-loading">
          Loading calendar...
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="flex-1 flex items-center justify-center text-red-400">
          Failed to load calendar: {error}
        </div>
      )}

      {/* Views */}
      {!isLoading && !error && activeView === 'month' && (
        <MonthView
          currentDate={currentDate}
          articles={filteredArticles}
          onArticleClick={handleArticleClick}
          onDateDrop={handleArticleDrop}
        />
      )}

      {!isLoading && !error && activeView === 'week' && (
        <WeekView
          currentDate={currentDate}
          articles={filteredArticles}
          onArticleClick={handleArticleClick}
        />
      )}

      {!isLoading && !error && activeView === 'day' && (
        <DayView
          currentDate={currentDate}
          articles={filteredArticles}
          onArticleClick={handleArticleClick}
        />
      )}

      {/* Article detail modal */}
      {selectedArticle && (
        <ArticleDetailModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          onReschedule={reschedule}
          onPublishNow={publishNow}
          isRescheduling={isRescheduling}
          isPublishing={isPublishing}
        />
      )}
    </div>
  );
}
