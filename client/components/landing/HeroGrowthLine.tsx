'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface IHeroGrowthLineProps {
  className?: string;
}

// Smooth easing matching MotionWrappers.tsx
const smoothEasing: [number, number, number, number] = [0.25, 0.4, 0.25, 1];

// Two slightly different growth curves for subtle morphing animation.
// Control points shift by ~10-20px vertically to create a gentle breathing effect.
const GROWTH_PATH_A =
  'M 0 350 C 100 340 150 320 200 300 C 280 270 320 280 400 250 C 450 230 480 210 550 180 C 600 160 650 170 700 150 C 780 120 850 100 950 70 C 1020 50 1100 30 1200 10';

const GROWTH_PATH_B =
  'M 0 345 C 100 330 150 310 200 295 C 280 280 320 270 400 255 C 450 240 480 220 550 190 C 600 165 650 160 700 140 C 780 115 850 110 950 75 C 1020 55 1100 25 1200 15';

const GROWTH_AREA_A = `${GROWTH_PATH_A} L 1200 400 L 0 400 Z`;
const GROWTH_AREA_B = `${GROWTH_PATH_B} L 1200 400 L 0 400 Z`;

export const HeroGrowthLine: React.FC<IHeroGrowthLineProps> = ({ className = '' }) => {
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 1200 400"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Stroke gradient - fades at horizontal edges */}
          <linearGradient id="heroGrowthStroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
            <stop offset="15%" stopColor="#22c55e" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#4ade80" stopOpacity="0.6" />
            <stop offset="85%" stopColor="#22c55e" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="heroGrowthGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feComposite in="blur" in2="SourceGraphic" operator="over" />
          </filter>

          {/* Area fill gradient - subtle fade downward */}
          <linearGradient id="heroGrowthArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Subtle area fill under the curve */}
        <motion.path
          fill="url(#heroGrowthArea)"
          initial={{ opacity: 0, d: GROWTH_AREA_A }}
          animate={{ opacity: 1, d: [GROWTH_AREA_A, GROWTH_AREA_B, GROWTH_AREA_A] }}
          transition={{
            opacity: { duration: 2, delay: 1.5, ease: 'easeOut' },
            d: { duration: 8, delay: 3.5, ease: 'easeInOut', repeat: Infinity },
          }}
        />

        {/* Glow layer - blurred wider stroke */}
        <motion.path
          stroke="#22c55e"
          strokeWidth="4"
          strokeLinecap="round"
          filter="url(#heroGrowthGlow)"
          opacity="0.3"
          initial={{ pathLength: 0, d: GROWTH_PATH_A }}
          animate={{
            pathLength: 1,
            d: [GROWTH_PATH_A, GROWTH_PATH_B, GROWTH_PATH_A],
          }}
          transition={{
            pathLength: { duration: 2.5, delay: 0.8, ease: smoothEasing },
            d: { duration: 8, delay: 3.5, ease: 'easeInOut', repeat: Infinity },
          }}
        />

        {/* Main growth line */}
        <motion.path
          stroke="url(#heroGrowthStroke)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0, d: GROWTH_PATH_A }}
          animate={{
            pathLength: 1,
            d: [GROWTH_PATH_A, GROWTH_PATH_B, GROWTH_PATH_A],
          }}
          transition={{
            pathLength: { duration: 2.5, delay: 0.8, ease: smoothEasing },
            d: { duration: 8, delay: 3.5, ease: 'easeInOut', repeat: Infinity },
          }}
        />
      </svg>
    </div>
  );
};
