/**
 * SEOScoreDisplay Component
 *
 * Displays SEO analysis for articles including overall score,
 * individual metrics, and actionable issues.
 */

'use client';

import { memo, type ComponentType, type ReactNode } from 'react';
import type { IArticle } from '@shared/types/article.types';
import {
  calculateOverallSEOScore,
  getSEOScoreColor,
  getSEOScoreBgColor,
  getSEOScoreBorderColor,
} from '@shared/utils/seo';
import { useTranslations } from '@client/hooks/useTranslations';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Heading,
  FileText,
  AlignLeft,
  Type,
  Hash,
} from 'lucide-react';

interface IProps {
  article: IArticle;
}

export const SEOScoreDisplay = memo(function SEOScoreDisplay({ article }: IProps) {
  const t = useTranslations('dashboard.articles.seo');

  const seoResult = calculateOverallSEOScore(article);
  const { overallScore, metrics, grade } = seoResult;

  const getGradeLabel = () => {
    switch (grade) {
      case 'A':
        return t('gradeA');
      case 'B':
        return t('gradeB');
      case 'C':
        return t('gradeC');
      case 'D':
        return t('gradeD');
      case 'F':
        return t('gradeF');
      default:
        return '';
    }
  };

  const MetricIcon = {
    keywordDensity: Hash,
    headingStructure: Heading,
    wordCount: FileText,
    metaDescription: AlignLeft,
    title: Type,
  } as const;

  const _renderMetricStatus = (score: number, issues: string[]) => {
    if (issues.length === 0 && score >= 80) {
      return (
        <div className="flex items-center gap-1 text-brand-400">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs">{t('gradeA')}</span>
        </div>
      );
    }
    if (score >= 60) {
      return (
        <div className="flex items-center gap-1 text-yellow-400">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-xs">
            {t('issues')}: {issues.length}
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-red-400">
        <XCircle className="w-4 h-4" />
        <span className="text-xs">
          {t('issues')}: {issues.length}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Overall Score */}
      <div
        className={`p-3 rounded-lg border ${getSEOScoreBgColor(overallScore)} ${getSEOScoreBorderColor(overallScore)}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-muted">{t('overall')}</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-bold ${getSEOScoreColor(overallScore)}`}>
                {overallScore}
              </span>
              <span className={`text-sm font-medium ${getSEOScoreColor(overallScore)}`}>
                /100 - {getGradeLabel()}
              </span>
            </div>
          </div>
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${getSEOScoreBorderColor(overallScore)} ${getSEOScoreBgColor(overallScore)}`}
          >
            <span className={`text-xl font-bold ${getSEOScoreColor(overallScore)}`}>{grade}</span>
          </div>
        </div>
      </div>

      {/* Individual Metrics */}
      <div className="space-y-2">
        {/* Keyword Density */}
        <MetricRow
          title={t('metrics.keywordDensity.title')}
          score={metrics.keywordDensity.score}
          issues={metrics.keywordDensity.issues}
          icon={MetricIcon.keywordDensity}
        >
          <span className="text-sm text-text-secondary">
            {t('metrics.keywordDensity.density', {
              density: metrics.keywordDensity.density.toFixed(2),
            })}
          </span>
          {metrics.keywordDensity.density >= 1 && metrics.keywordDensity.density <= 2 && (
            <span className="text-xs text-brand-400 ml-2">{t('metrics.keywordDensity.ideal')}</span>
          )}
        </MetricRow>

        {/* Heading Structure */}
        <MetricRow
          title={t('metrics.headingStructure.title')}
          score={metrics.headingStructure.score}
          issues={metrics.headingStructure.analysis.issues}
          icon={MetricIcon.headingStructure}
        >
          <span className="text-sm text-text-secondary">
            H1: {metrics.headingStructure.analysis.h1Count} | H2:{' '}
            {metrics.headingStructure.analysis.h2Count} | H3:{' '}
            {metrics.headingStructure.analysis.h3Count}
          </span>
        </MetricRow>

        {/* Word Count */}
        <MetricRow
          title={t('metrics.wordCount.title')}
          score={metrics.wordCount.score}
          issues={metrics.wordCount.issues}
          icon={MetricIcon.wordCount}
        >
          <span className="text-sm text-text-secondary">
            {t('metrics.wordCount.words', { count: metrics.wordCount.count || 0 })}
          </span>
        </MetricRow>

        {/* Meta Description */}
        <MetricRow
          title={t('metrics.metaDescription.title')}
          score={metrics.metaDescription.score}
          issues={metrics.metaDescription.issues}
          icon={MetricIcon.metaDescription}
        >
          <span className="text-sm text-text-secondary">
            {metrics.metaDescription.length > 0
              ? `${metrics.metaDescription.length} chars`
              : t('metrics.metaDescription.missing')}
          </span>
        </MetricRow>

        {/* Title */}
        <MetricRow
          title={t('metrics.title.title')}
          score={metrics.title.score}
          issues={metrics.title.issues}
          icon={MetricIcon.title}
        >
          <span className="text-sm text-text-secondary">
            {metrics.title.length > 0
              ? `${metrics.title.length} chars`
              : t('metrics.title.missing')}
          </span>
        </MetricRow>
      </div>

      {/* Issues Summary */}
      {overallScore < 80 && (
        <div className="p-3 bg-surface-light rounded-lg border border-border">
          <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            {t('issues')}
          </h4>
          <ul className="space-y-1">
            {[
              ...metrics.keywordDensity.issues,
              ...metrics.headingStructure.analysis.issues,
              ...metrics.wordCount.issues,
              ...metrics.metaDescription.issues,
              ...metrics.title.issues,
            ]
              .slice(0, 5)
              .map((issue, index) => (
                <li key={index} className="text-xs text-muted flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">•</span>
                  <span>{issue}</span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
});

interface IMetricRowProps {
  title: string;
  score: number;
  issues: string[];
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}

function MetricRow({ title, score, issues, icon: Icon, children }: IMetricRowProps) {
  return (
    <div className="flex items-center justify-between p-2 rounded bg-surface-light/50">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Icon className="w-4 h-4 text-muted flex-shrink-0" />
        <span className="text-sm font-medium text-text-primary truncate">{title}</span>
        <div className="flex-shrink-0">{renderMetricStatus(score, issues)}</div>
      </div>
      <div className="flex items-center gap-2 ml-2">{children}</div>
    </div>
  );
}

function renderMetricStatus(score: number, issues: string[]) {
  if (issues.length === 0 && score >= 80) {
    return (
      <div className="flex items-center gap-1 text-brand-400">
        <CheckCircle2 className="w-4 h-4" />
      </div>
    );
  }
  if (score >= 60) {
    return (
      <div className="flex items-center gap-1 text-yellow-400">
        <AlertTriangle className="w-4 h-4" />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-red-400">
      <XCircle className="w-4 h-4" />
    </div>
  );
}
