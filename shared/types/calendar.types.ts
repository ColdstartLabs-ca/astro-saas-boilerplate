import type { ArticleStatus } from './article.types';

export interface ICalendarArticle {
  id: string;
  title: string | null;
  primaryKeyword: string;
  scheduledPublishAt: string;
  status: ArticleStatus;
  campaignId: string | null;
  campaignName: string | null;
  campaignColor: string; // dynamically assigned from hash
}

export interface ICalendarArticlesResponse {
  articles: ICalendarArticle[];
  total: number;
}

export type CalendarView = 'month' | 'week' | 'day';

export interface ICalendarStatusConfig {
  label: string;
  dotColor: string; // Tailwind color class for dot
  bgClass: string; // Tailwind bg class for event card
  textClass: string; // Tailwind text class
  borderClass: string; // Tailwind border class
}

export interface IPlanContentResponse {
  planned: number;
  startDate: string | null;
  endDate: string | null;
  message?: string;
}
