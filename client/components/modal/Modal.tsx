'use client';

import { Logo } from '@client/components/logo/Logo';
import { useTranslations } from '@client/hooks/useTranslations';
import { X } from 'lucide-react';
import React, { forwardRef, useEffect, useState } from 'react';

export type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

interface IModalProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  showLogo?: boolean;
  children: React.ReactNode;
  onClose: () => void;
  isOpen: boolean;
  showCloseButton?: boolean;
  /** Disable backdrop click and Escape key from closing the modal */
  preventClose?: boolean;
  modalId?: string;
  size?: ModalSize;
  className?: string;
}

// Store scroll position when modal opens
let scrollPosition = 0;

const sizeClasses: Record<ModalSize, string> = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  '2xl': 'max-w-4xl',
  full: 'max-w-[95vw]',
};

export const Modal = forwardRef<HTMLDivElement, IModalProps>(
  (
    {
      title,
      subtitle,
      icon,
      showLogo = false,
      children,
      onClose,
      isOpen,
      showCloseButton = true,
      preventClose = false,
      modalId,
      size = 'md',
      className = '',
    },
    ref
  ) => {
    const t = useTranslations('modal');
    const [isAnimating, setIsAnimating] = useState(false);
    const [shouldRender, setShouldRender] = useState(isOpen);

    useEffect(() => {
      if (isOpen) {
        // Save current scroll position
        scrollPosition = window.scrollY;

        setShouldRender(true);
        // Small delay to ensure DOM is ready before animation
        const animationFrame = requestAnimationFrame(() => {
          setIsAnimating(true);
        });

        // Lock body scroll
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollPosition}px`;
        document.body.style.width = '100%';

        // Add escape key handler
        const handleEscape = (e: KeyboardEvent) => {
          if (e.key === 'Escape' && !preventClose) {
            onClose();
          }
        };
        document.addEventListener('keydown', handleEscape);

        return () => {
          cancelAnimationFrame(animationFrame);
          document.removeEventListener('keydown', handleEscape);
        };
      } else {
        setIsAnimating(false);

        // Restore scroll position after modal closes
        const timer = setTimeout(() => {
          setShouldRender(false);
          document.body.style.overflow = '';
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.width = '';
          window.scrollTo(0, scrollPosition);
        }, 200);

        return () => clearTimeout(timer);
      }
    }, [isOpen, onClose]);

    if (!shouldRender) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 font-sans">
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
            isAnimating ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={preventClose ? undefined : onClose}
        />

        {/* Modal Content */}
        <div
          ref={ref}
          id={modalId}
          data-testid="modal"
          className={`relative w-full ${sizeClasses[size]} bg-card rounded-2xl shadow-2xl z-[101] max-h-[90vh] flex flex-col overflow-hidden border border-border/50 transition-all duration-300 ${
            isAnimating ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-8'
          } ${className}`}
          role="dialog"
          aria-labelledby="modal-title"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          {(title || icon || showLogo || showCloseButton) && (
            <div
              className={`flex flex-col shrink-0 px-6 py-4 border-b border-border/50 bg-card/50 backdrop-blur-md z-10`}
            >
              {showLogo && (
                <div className="flex justify-center mb-4">
                  <Logo variant="compact" />
                </div>
              )}

              {showCloseButton && (
                <button
                  className="absolute right-4 top-4 text-muted hover:text-white transition-all duration-200 rounded-lg p-2 hover:bg-surface-light group active:scale-95 z-20"
                  onClick={onClose}
                  aria-label={t('aria.close')}
                >
                  <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
                </button>
              )}

              {icon && <div className="flex justify-center mb-2">{icon}</div>}

              <div className="text-center">
                {title && (
                  <h3
                    id="modal-title"
                    className="text-xl sm:text-2xl font-bold text-white leading-tight"
                  >
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-sm text-secondary mt-1 max-w-sm mx-auto">{subtitle}</p>
                )}
              </div>
            </div>
          )}

          {/* Body */}
          <div className="px-6 py-4 overflow-y-auto flex-1 custom-scrollbar">{children}</div>
        </div>
      </div>
    );
  }
);

Modal.displayName = 'Modal';
