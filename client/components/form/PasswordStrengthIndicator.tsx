import { Check, X } from 'lucide-react';
import React, { useMemo } from 'react';
import { useTranslations } from '@client/hooks/useTranslations';

interface IPasswordStrengthIndicatorProps {
  password: string;
}

interface IStrengthResult {
  score: number;
  label: string;
  color: string;
  bgColor: string;
}

interface IRequirement {
  label: string;
  met: boolean;
}

const calculateStrength = (password: string, t: (key: string) => string): IStrengthResult => {
  if (!password) {
    return { score: 0, label: '', color: '', bgColor: 'bg-surface-light' };
  }

  let score = 0;

  // Length checks
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  // Normalize to 0-4 scale
  const normalizedScore = Math.min(4, Math.floor(score / 1.75));

  const strengthLevels: IStrengthResult[] = [
    { score: 0, label: t('password.strength.tooWeak'), color: 'text-error', bgColor: 'bg-error' },
    { score: 1, label: t('password.strength.weak'), color: 'text-warning', bgColor: 'bg-warning' },
    {
      score: 2,
      label: t('password.strength.fair'),
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500',
    },
    {
      score: 3,
      label: t('password.strength.good'),
      color: 'text-lime-400',
      bgColor: 'bg-lime-500',
    },
    {
      score: 4,
      label: t('password.strength.strong'),
      color: 'text-success',
      bgColor: 'bg-success',
    },
  ];

  return strengthLevels[normalizedScore];
};

const getRequirements = (password: string, t: (key: string) => string): IRequirement[] => {
  return [
    { label: t('password.requirements.minLength'), met: password.length >= 6 },
    { label: t('password.requirements.uppercase'), met: /[A-Z]/.test(password) },
    { label: t('password.requirements.lowercase'), met: /[a-z]/.test(password) },
    { label: t('password.requirements.number'), met: /[0-9]/.test(password) },
    { label: t('password.requirements.specialChar'), met: /[^a-zA-Z0-9]/.test(password) },
  ];
};

export const PasswordStrengthIndicator: React.FC<IPasswordStrengthIndicatorProps> = ({
  password,
}) => {
  const t = useTranslations('auth');
  const strength = useMemo(() => calculateStrength(password, t), [password, t]);
  const requirements = useMemo(() => getRequirements(password, t), [password, t]);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(index => (
          <div
            key={index}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              index < strength.score + 1 ? strength.bgColor : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <p className={`text-xs font-medium ${strength.color}`}>{strength.label}</p>
        <p className="text-xs text-text-muted">
          {requirements.filter(r => r.met).length}/{requirements.length}{' '}
          {t('password.requirements.label')}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        {requirements.map((req, index) => (
          <div
            key={index}
            className={`flex items-center gap-1 text-[11px] transition-colors duration-200 ${
              req.met ? 'text-success' : 'text-text-muted'
            }`}
          >
            {req.met ? (
              <Check size={10} className="shrink-0" />
            ) : (
              <X size={10} className="shrink-0" />
            )}
            <span className="truncate">{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
