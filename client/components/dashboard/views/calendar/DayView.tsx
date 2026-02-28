'use client';

import React from 'react';
import { getCampaignColorPalette, getCalendarStatusConfig } from '@client/utils/calendarHelpers';
import type { ICalendarArticle } from '@shared/types/calendar.types';

interface IDayViewProps {
  currentDate: Date;
  articles: ICalendarArticle[];
  onArticleClick: (article: ICalendarArticle) => void;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM

function formatHour(hour: number): string {
  if (hour === 12) return '12 PM';
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
}

export function DayView({ currentDate, articles, onArticleClick }: IDayViewProps): JSX.Element {
  const dayStart = new Date(currentDate);
  dayStart.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = dayStart.getTime() === today.getTime();

  const headerLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(currentDate);

  // Filter articles for this day and group by clamped hour
  const articlesByHour = articles.reduce<Record<number, ICalendarArticle[]>>((acc, article) => {
    const articleDate = new Date(article.scheduledPublishAt);
    const articleDay = new Date(articleDate);
    articleDay.setHours(0, 0, 0, 0);

    if (articleDay.getTime() !== dayStart.getTime()) return acc;

    const rawHour = articleDate.getHours();
    const hour = Math.min(22, Math.max(6, rawHour));
    if (!acc[hour]) acc[hour] = [];
    acc[hour].push(article);
    return acc;
  }, {});

  const hasAnyArticles = Object.keys(articlesByHour).length > 0;

  return (
    <div className="flex-1 bg-surface rounded-xl border border-border flex flex-col overflow-hidden" data-testid="calendar-day-view">
      {/* Day header */}
      <div className={`border-b border-border px-4 py-3 ${isToday ? 'bg-accent/10' : 'bg-main/50'}`}>
        <div className="flex items-center gap-2">
          {isToday && (
            <span className="text-xs font-semibold text-accent uppercase tracking-wider">Today</span>
          )}
          <span className="text-sm font-semibold text-white">{headerLabel}</span>
        </div>
      </div>

      {/* Scrollable time grid */}
      <div className="flex-1 overflow-y-auto">
        {!hasAnyArticles && (
          <div className="flex flex-col items-center justify-center h-48 text-muted text-sm gap-2">
            <div>No articles scheduled for this day</div>
          </div>
        )}

        {HOURS.map(hour => {
          const slotArticles = articlesByHour[hour] ?? [];

          return (
            <div
              key={hour}
              className="flex border-b border-border/50"
              style={{ minHeight: '72px' }}
            >
              {/* Time label */}
              <div className="w-16 px-2 py-2 text-[10px] text-muted text-right leading-none pt-2.5 flex-shrink-0 border-r border-border/50">
                {formatHour(hour)}
              </div>

              {/* Article slot */}
              <div className={`flex-1 p-2 space-y-1.5 ${isToday ? 'bg-accent/5' : ''}`}>
                {slotArticles.map(article => {
                  const statusConfig = getCalendarStatusConfig(article.status);
                  const campaignColors = getCampaignColorPalette(article.campaignId);
                  const articleDate = new Date(article.scheduledPublishAt);
                  const timeLabel = articleDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

                  return (
                    <div
                      key={article.id}
                      onClick={() => onArticleClick(article)}
                      className={`p-3 rounded-lg border cursor-pointer shadow-sm hover:scale-[1.005] transition-all
                        ${statusConfig.bgClass} ${statusConfig.borderClass}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${statusConfig.dotColor}`} />
                          <span className={`text-sm font-semibold leading-snug truncate ${statusConfig.textClass}`}>
                            {article.title ?? article.primaryKeyword}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusConfig.bgClass} ${statusConfig.textClass} border ${statusConfig.borderClass}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                      </div>

                      {article.primaryKeyword && article.title && (
                        <div className="ml-4 mt-1 text-xs text-muted truncate">{article.primaryKeyword}</div>
                      )}

                      <div className="ml-4 mt-1.5 flex items-center gap-3 flex-wrap">
                        {article.campaignName && (
                          <div className="flex items-center gap-1 text-xs text-secondary">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${campaignColors.dot}`} />
                            <span className="truncate">{article.campaignName}</span>
                          </div>
                        )}
                        <div className="text-[10px] text-muted">{timeLabel}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
