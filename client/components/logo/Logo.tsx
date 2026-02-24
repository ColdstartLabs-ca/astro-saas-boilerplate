'use client';

import React from 'react';

interface IProps {
  className?: string;
  variant?: 'full' | 'compact';
}

export function Logo({ className = '', variant = 'full' }: IProps): JSX.Element {
  const isCompact = variant === 'compact';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Icon: lightning bolt — autopilot speed */}
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
            d="M18 8L10 22H18L16 32L28 16H20L22 8H18Z"
            fill="white"
            stroke="white"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {/* AutopilotRank wordmark */}
      {!isCompact && (
        <span className="text-white font-bold text-xl tracking-tight">
          Autopilot<span className="text-accent">Rank</span>
        </span>
      )}
    </div>
  );
}
