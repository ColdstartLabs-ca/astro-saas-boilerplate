import { cn } from '@client/utils/cn';
import { motion } from 'framer-motion';
import React from 'react';

interface DashboardCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  onClick?: () => void;
  gradient?: boolean;
}

export function DashboardCard({
  title,
  subtitle,
  children,
  className,
  icon: Icon,
  action,
  onClick,
  gradient = false,
}: DashboardCardProps) {
  const CardContent = (
    <div className="relative z-10">
      {(title || Icon || action) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 rounded-lg bg-surface-light text-accent">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              {title && <h3 className="text-base font-semibold text-white">{title}</h3>}
              {subtitle && (
                <div className="text-xs text-secondary font-medium uppercase tracking-wider mt-0.5">
                  {subtitle}
                </div>
              )}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );

  return (
    <motion.div
      whileHover={onClick ? { y: -2, transition: { duration: 0.2 } } : undefined}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-xl border border-border/50 bg-surface/50 backdrop-blur-sm p-4',
        'transition-all duration-300 ease-out',
        onClick && 'cursor-pointer hover:border-accent/20 hover:bg-surface/80 hover:shadow-lg hover:shadow-accent/5',
        gradient && 'bg-gradient-to-br from-surface/80 to-surface-light/50 border-accent/10',
        className
      )}
    >
      {gradient && (
        <>
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
        </>
      )}
      {CardContent}
    </motion.div>
  );
}
