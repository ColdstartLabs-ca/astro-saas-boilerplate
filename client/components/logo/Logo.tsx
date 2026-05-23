'use client';

import React from 'react';
import { clientEnv, getAppLogoAbbr } from '@shared/config/env';

interface IProps {
  className?: string;
  variant?: 'full' | 'compact';
}

export function Logo({ className = '', variant = 'full' }: IProps): JSX.Element {
  const isCompact = variant === 'compact';
  const [firstWord, ...restWords] = clientEnv.APP_NAME.split(' ');
  const accentText = restWords.join(' ');

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className="rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          width: 36,
          height: 36,
          background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20 8L8 16V30L20 38L32 30V16L20 8ZM20 13L27 17.5V26.5L20 31L13 26.5V17.5L20 13Z"
            fill="white"
            stroke="white"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {!isCompact && (
        <span className="text-white font-bold text-xl tracking-tight">
          {firstWord}
          {accentText && <span className="text-accent"> {accentText}</span>}
        </span>
      )}
      {isCompact && <span className="sr-only">{getAppLogoAbbr()}</span>}
    </div>
  );
}
