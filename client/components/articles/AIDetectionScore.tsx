/**
 * AIDetectionScore Component
 *
 * Displays AI detection score with visual indicators and improvement suggestions.
 */

'use client';

import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Info,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import type { IAIDetectionDetails } from '@shared/types/article.types';

interface IAIDetectionScoreProps {
  score: number | null;
  details?: IAIDetectionDetails | null;
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
}

// AI Detection scoring thresholds
const PASS_THRESHOLD = 80;
const BORDERLINE_THRESHOLD = 60;

// Score level configuration
type ScoreLevel = 'pass' | 'borderline' | 'fail';

interface IScoreConfig {
  level: ScoreLevel;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof CheckCircle2;
}

/**
 * Get text color class for AI detection score (for table display).
 * Uses semantic tokens: success (pass), warning (borderline), error (fail).
 */
export function getAIScoreColor(score: number): string {
  if (score >= PASS_THRESHOLD) return 'text-success';
  if (score >= BORDERLINE_THRESHOLD) return 'text-warning';
  return 'text-error';
}

/**
 * Get border color class for AI detection score (for table display).
 */
export function getAIScoreBorderColor(score: number): string {
  if (score >= PASS_THRESHOLD) return 'border-success/30';
  if (score >= BORDERLINE_THRESHOLD) return 'border-warning/30';
  return 'border-error/30';
}

/**
 * Get background color class for AI detection score (for table display).
 */
export function getAIScoreBgColor(score: number): string {
  if (score >= PASS_THRESHOLD) return 'bg-success/10';
  if (score >= BORDERLINE_THRESHOLD) return 'bg-warning/10';
  return 'bg-error/10';
}

// Get score configuration based on score value
function getScoreConfig(score: number | null): IScoreConfig {
  if (score === null) {
    return {
      level: 'fail',
      label: 'Not Analyzed',
      description: 'AI detection score not available',
      color: 'text-muted',
      bgColor: 'bg-surface-light',
      borderColor: 'border-border',
      icon: Info,
    };
  }

  if (score >= PASS_THRESHOLD) {
    return {
      level: 'pass',
      label: 'Human-Like',
      description: 'Content appears to be written by a human',
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/30',
      icon: CheckCircle2,
    };
  }

  if (score >= BORDERLINE_THRESHOLD) {
    return {
      level: 'borderline',
      label: 'Borderline',
      description: 'Content may be detected as AI-generated',
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/30',
      icon: AlertTriangle,
    };
  }

  return {
    level: 'fail',
    label: 'AI-Detected',
    description: 'Content is likely to be flagged as AI-generated',
    color: 'text-error',
    bgColor: 'bg-error/10',
    borderColor: 'border-error/30',
    icon: XCircle,
  };
}

// Improvement suggestions based on score
function getImprovementSuggestions(score: number | null): string[] {
  if (score === null) {
    return ['Run AI detection analysis to get a score'];
  }

  if (score >= PASS_THRESHOLD) {
    return [];
  }

  const suggestions: string[] = [];

  if (score < BORDERLINE_THRESHOLD) {
    suggestions.push('Add more personal anecdotes and experiences');
    suggestions.push('Include varied sentence structures and lengths');
    suggestions.push('Add specific examples and real-world data');
    suggestions.push('Incorporate emotional language and storytelling');
  } else {
    suggestions.push('Add more personal voice and opinion');
    suggestions.push('Include current events or timely references');
    suggestions.push('Vary paragraph lengths for natural flow');
  }

  suggestions.push('Consider manual editing to add human touch');
  suggestions.push('Regenerate with different tone or style settings');

  return suggestions;
}

export function AIDetectionScore({
  score,
  details,
  onAnalyze,
  isAnalyzing = false,
}: IAIDetectionScoreProps): JSX.Element {
  const config = getScoreConfig(score);
  const suggestions = getImprovementSuggestions(score);

  return (
    <div className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
      {/* Header with score display */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className={`w-5 h-5 ${config.color}`} />
          <h3 className="text-sm font-semibold text-text-primary">AI Detection Score</h3>
        </div>
        {score !== null && (
          <div className={`px-2.5 py-1 rounded-md ${config.bgColor} ${config.borderColor} border`}>
            <span className={`text-lg font-bold ${config.color}`}>{score}</span>
            <span className="text-xs text-muted ml-1">/100</span>
          </div>
        )}
      </div>

      {/* Status indicator */}
      <div className={`flex items-center gap-2 mb-3 ${config.color}`}>
        <config.icon className="w-4 h-4" />
        <span className="text-sm font-medium">{config.label}</span>
        <span className="text-xs text-muted">- {config.description}</span>
      </div>

      {/* Score meter (when score is available) */}
      {score !== null && (
        <div className="mb-3">
          <div className="w-full h-2 bg-surface-light rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                score >= PASS_THRESHOLD
                  ? 'bg-success'
                  : score >= BORDERLINE_THRESHOLD
                    ? 'bg-warning'
                    : 'bg-error'
              }`}
              style={{ width: `${score}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted">AI-Detected</span>
            <span className="text-xs text-muted">Human-Like</span>
          </div>
        </div>
      )}

      {/* Confidence level and provider */}
      {score !== null && (
        <div className="flex items-center gap-3 mb-3">
          <div className="text-xs text-muted">
            Confidence:{' '}
            {details?.confidence ??
              (score >= PASS_THRESHOLD ? 'High' : score >= BORDERLINE_THRESHOLD ? 'Medium' : 'Low')}
          </div>
          {details?.provider && (
            <div className="text-xs px-2 py-0.5 rounded bg-surface-light text-muted border border-border">
              {details.provider === 'originality' ? 'Originality.ai' : 'Heuristic'}
            </div>
          )}
        </div>
      )}

      {/* Detected patterns (if available) */}
      {details?.detectedPatterns && details.detectedPatterns.length > 0 && (
        <div className="mt-3 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <span className="text-xs font-semibold text-text-primary">Detected Patterns:</span>
          </div>
          <ul className="space-y-1">
            {details.detectedPatterns.map((pattern, index) => (
              <li key={index} className="text-xs text-secondary flex items-start gap-2">
                <span className="text-warning mt-0.5">•</span>
                <span>{pattern}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvement suggestions (if score is below passing) */}
      {suggestions.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            <span className="text-xs font-semibold text-text-primary">Suggestions to Improve:</span>
          </div>
          <ul className="space-y-1.5">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="text-xs text-secondary flex items-start gap-2">
                <span className="text-accent mt-0.5">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Analyze button */}
      {onAnalyze && (
        <div className="mt-4 pt-3 border-t border-border">
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : score === null ? (
              <>
                <RefreshCw className="w-4 h-4" />
                Run Analysis
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Re-analyze
              </>
            )}
          </button>
        </div>
      )}

      {/* Historical note (placeholder for future feature) */}
      {score !== null && score >= PASS_THRESHOLD && (
        <div className="mt-3 pt-3 border-t border-border text-xs text-muted">
          Historical score tracking coming soon.
        </div>
      )}
    </div>
  );
}
