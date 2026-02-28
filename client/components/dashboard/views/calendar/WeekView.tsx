'use client';

import React from 'react';
import { getCampaignColorPalette, getCalendarStatusConfig } from '@client/utils/calendarHelpers';
import type { ICalendarArticle } from '@shared/types/calendar.types';

interface IWeekViewProps {
  currentDate: Date;
  articles: ICalendarArticle[];
  onArticleClick: (article: ICalendarArticle) => void;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatHour(hour: number): string {
  if (hour === 12) return '12 PM';
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
}

export function WeekView({ currentDate, articles, onArticleClick }: IWeekViewProps): JSX.Element {
  const weekStart = getWeekStart(currentDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  // Group articles by day index (0-6) and clamped hour (6-22)
  const articlesByDayAndHour = articles.reduce<Record<string, ICalendarArticle[]>>((acc, article) => {
    const articleDate = new Date(article.scheduledPublishAt);
    const articleDay = new Date(articleDate);
    articleDay.setHours(0, 0, 0, 0);

    const dayIndex = weekDays.findIndex(d => d.getTime() === articleDay.getTime());
    if (dayIndex === -1) return acc;

    const rawHour = articleDate.getHours();
    const hour = Math.min(22, Math.max(6, rawHour));
    const key = `${dayIndex}-${hour}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(article);
    return acc;
  }, {});

  const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex-1 bg-surface rounded-xl border border-border flex flex-col overflow-hidden" data-testid="calendar-week-view">
      {/* Header row */}
      <div className="grid border-b border-border bg-main/50" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
        {/* Time gutter header */}
        <div className="py-3" />
        {weekDays.map((day, i) => {
          const isToday = day.getTime() === today.getTime();
          return (
            <div key={i} className="py-3 text-center border-l border-border">
              <div className="text-xs font-semibold text-muted uppercase tracking-wider">{DAY_SHORT[i]}</div>
              <div className={`mx-auto mt-1 w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold
                ${isToday ? 'bg-accent text-white' : 'text-secondary'}`}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div className="flex-1 overflow-y-auto">
        {HOURS.map(hour => (
          <div
            key={hour}
            className="grid border-b border-border/50"
            style={{ gridTemplateColumns: '56px repeat(7, 1fr)', minHeight: '64px' }}
          >
            {/* Time label */}
            <div className="px-2 py-1 text-[10px] text-muted text-right leading-none pt-1.5 flex-shrink-0">
              {formatHour(hour)}
            </div>

            {/* Day columns */}
            {weekDays.map((_, dayIndex) => {
              const key = `${dayIndex}-${hour}`;
              const slotArticles = articlesByDayAndHour[key] ?? [];
              const isToday = weekDays[dayIndex].getTime() === today.getTime();

              return (
                <div
                  key={dayIndex}
                  className={`border-l border-border/50 p-1 space-y-1 ${isToday ? 'bg-accent/5' : ''}`}
                >
                  {slotArticles.map(article => {
                    const statusConfig = getCalendarStatusConfig(article.status);
                    const campaignColors = getCampaignColorPalette(article.campaignId);
                    return (
                      <div
                        key={article.id}
                        onClick={() => onArticleClick(article)}
                        className={`text-[10px] p-1.5 rounded border cursor-pointer shadow-sm hover:scale-[1.01] transition-all
                          ${statusConfig.bgClass} ${statusConfig.textClass} ${statusConfig.borderClass}`}
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${campaignColors.dot}`} />
                          <span className="font-medium truncate">{article.title ?? article.primaryKeyword}</span>
                        </div>
                        {article.campaignName && (
                          <div className="opacity-60 text-[9px] truncate mt-0.5">{article.campaignName}</div>
                        )}
                        <div className={`text-[9px] mt-0.5 font-medium ${statusConfig.textClass} opacity-80`}>
                          {statusConfig.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
