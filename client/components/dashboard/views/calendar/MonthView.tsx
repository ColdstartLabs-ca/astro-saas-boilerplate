'use client';

import React from 'react';
import { getCampaignColorPalette, getCalendarStatusConfig } from '@client/utils/calendarHelpers';
import type { ICalendarArticle } from '@shared/types/calendar.types';

interface IMonthViewProps {
  currentDate: Date;
  articles: ICalendarArticle[];
  onArticleClick: (article: ICalendarArticle) => void;
  onDateDrop?: (articleId: string, newDate: Date) => void;
}

function getDaysInMonth(currentDate: Date) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: { date: Date; isCurrentMonth: boolean }[] = [];

  const startPad = firstDay.getDay();
  for (let i = startPad - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
  }
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }
  const endPad = 42 - days.length;
  for (let i = 1; i <= endPad; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }
  return days;
}

export function MonthView({ currentDate, articles, onArticleClick, onDateDrop }: IMonthViewProps): JSX.Element {
  const calendarGrid = getDaysInMonth(currentDate);

  const articlesByDate = articles.reduce<Record<string, ICalendarArticle[]>>((acc, article) => {
    const dateKey = article.scheduledPublishAt.split('T')[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(article);
    return acc;
  }, {});

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, articleId: string) {
    e.dataTransfer.setData('text/plain', articleId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, date: Date) {
    e.preventDefault();
    const articleId = e.dataTransfer.getData('text/plain');
    if (articleId && onDateDrop) {
      onDateDrop(articleId, date);
    }
  }

  return (
    <div className="flex-1 bg-surface rounded-xl border border-border flex flex-col overflow-hidden" data-testid="calendar-month-view">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border bg-main/50">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="py-3 text-center text-xs font-semibold text-muted uppercase tracking-wider">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 grid-rows-6 flex-1">
        {calendarGrid.map((cell, i) => {
          const isToday = new Date().toDateString() === cell.date.toDateString();
          const dateKey = cell.date.toISOString().split('T')[0];
          const dayArticles = articlesByDate[dateKey] ?? [];

          return (
            <div
              key={i}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, cell.date)}
              className={`
                min-h-[100px] border-b border-r border-border p-2 transition-colors
                ${!cell.isCurrentMonth ? 'bg-main/30 text-muted' : 'text-white hover:bg-surface-light/10'}
                ${(i + 1) % 7 === 0 ? 'border-r-0' : ''}
              `}
            >
              <div className="mb-1">
                <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-accent text-white' : ''}`}>
                  {cell.date.getDate()}
                </span>
              </div>

              <div className="space-y-1">
                {dayArticles.slice(0, 3).map(article => {
                  const statusConfig = getCalendarStatusConfig(article.status);
                  const campaignColors = getCampaignColorPalette(article.campaignId);
                  return (
                    <div
                      key={article.id}
                      draggable
                      data-testid="calendar-article-card"
                      data-article-id={article.id}
                      onDragStart={e => handleDragStart(e, article.id)}
                      onClick={() => onArticleClick(article)}
                      className={`text-[10px] p-1.5 rounded border cursor-pointer truncate shadow-sm hover:scale-[1.02] transition-all
                        ${statusConfig.bgClass} ${statusConfig.textClass} ${statusConfig.borderClass}`}
                    >
                      <div className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${campaignColors.dot}`}></div>
                        <span className="font-medium truncate">{article.title ?? article.primaryKeyword}</span>
                      </div>
                      {article.campaignName && (
                        <div className="opacity-60 text-[9px] truncate mt-0.5">{article.campaignName}</div>
                      )}
                    </div>
                  );
                })}
                {dayArticles.length > 3 && (
                  <div className="text-[10px] text-muted">+{dayArticles.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
