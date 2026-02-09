/**
 * AIDetectionScore Component
 *
 * Displays AI detection score with visual indicators and improvement suggestions.
 */

'use client';

import { Brain, CheckCircle2, AlertTriangle, XCircle, TrendingUp, Info } from 'lucide-react';

interface IAIDetectionScoreProps {
  score: number | null;
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
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      icon: CheckCircle2,
    };
  }

  if (score >= BORDERLINE_THRESHOLD) {
    return {
      level: 'borderline',
      label: 'Borderline',
      description: 'Content may be detected as AI-generated',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      icon: AlertTriangle,
    };
  }

  return {
    level: 'fail',
    label: 'AI-Detected',
    description: 'Content is likely to be flagged as AI-generated',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
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

export function AIDetectionScore({ score }: IAIDetectionScoreProps): JSX.Element {
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
                score >= PASS_THRESHOLD ? 'bg-green-500' :
                score >= BORDERLINE_THRESHOLD ? 'bg-yellow-500' : 'bg-red-500'
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

      {/* Confidence level */}
      {score !== null && (
        <div className="text-xs text-muted mb-3">
          Confidence: {score >= PASS_THRESHOLD ? 'High' : score >= BORDERLINE_THRESHOLD ? 'Medium' : 'Low'}
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

      {/* Historical note (placeholder for future feature) */}
      {score !== null && score >= PASS_THRESHOLD && (
        <div className="mt-3 pt-3 border-t border-border text-xs text-muted">
          Historical score tracking coming soon.
        </div>
      )}
    </div>
  );
}
