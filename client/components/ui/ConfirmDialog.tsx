'use client';

import { Modal } from '@client/components/modal/Modal';
import { AlertTriangle, Info } from 'lucide-react';
import React, { useState } from 'react';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info';

interface IConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message?: string;
  /** Bullet points to display under the main message */
  items?: string[];
  /** Rich details content (React node) for complex layouts like credit breakdowns */
  details?: React.ReactNode;
  /** Optional type-to-confirm requirement */
  confirmText?: {
    /** The text the user must type to confirm */
    matchValue: string;
    /** Label for the input field (use {value} placeholder for the match value) */
    label: string;
    /** Placeholder text for the input */
    placeholder: string;
  };
  /** Visual variant for the dialog */
  variant?: ConfirmDialogVariant;
  /** Labels for the action buttons */
  labels?: {
    confirm?: string;
    cancel?: string;
    confirming?: string;
  };
  /** Whether the confirm action is currently processing */
  isConfirming?: boolean;
}

/**
 * Reusable confirmation dialog with optional type-to-confirm pattern.
 *
 * @example
 * ```tsx
 * // Simple confirmation
 * <ConfirmDialog
 *   isOpen={showDelete}
 *   onClose={() => setShowDelete(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Item"
 *   message="This will permanently delete the item."
 *   variant="danger"
 * />
 *
 * // Type-to-confirm with details
 * <ConfirmDialog
 *   isOpen={showDeleteProject}
 *   onClose={() => setShowDeleteProject(false)}
 *   onConfirm={handleDeleteProject}
 *   title="Delete Project"
 *   message="This will permanently delete this project and ALL its data:"
 *   items={[
 *     "• All campaigns",
 *     "• All articles and generated content",
 *     "• All keyword research",
 *   ]}
 *   confirmText={{
 *     matchValue: project.name,
 *     label: 'Type "{value}" to confirm deletion:',
 *     placeholder: 'Project name',
 *   }}
 *   variant="danger"
 *   labels={{
 *     confirm: 'Delete',
 *     confirming: 'Deleting...',
 *   }}
 *   isConfirming={isDeleting}
 * />
 * ```
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  items,
  details,
  confirmText,
  variant = 'danger',
  labels = {},
  isConfirming = false,
}: IConfirmDialogProps): JSX.Element | null {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  // Reset input when dialog opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setInputValue('');
      setError('');
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (confirmText && inputValue !== confirmText.matchValue) {
      return;
    }

    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const canConfirm = !confirmText || inputValue === confirmText.matchValue;

  const variantStyles = {
    danger: {
      icon: AlertTriangle,
      iconClass: 'text-red-400',
      bgClass: 'bg-red-500/10',
      borderClass: 'border-red-500/20',
      buttonClass: 'bg-red-500 hover:bg-red-600 text-white',
    },
    warning: {
      icon: AlertTriangle,
      iconClass: 'text-yellow-400',
      bgClass: 'bg-yellow-500/10',
      borderClass: 'border-yellow-500/20',
      buttonClass: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    },
    info: {
      icon: Info,
      iconClass: 'text-blue-400',
      bgClass: 'bg-blue-500/10',
      borderClass: 'border-blue-500/20',
      buttonClass: 'bg-accent hover:bg-accent-hover text-white',
    },
  };

  const style = variantStyles[variant];
  const Icon = style.icon;

  const defaultLabels = {
    confirm: variant === 'danger' ? 'Delete' : 'Confirm',
    cancel: 'Cancel',
    confirming: isConfirming ? 'Processing...' : '',
  };

  const finalLabels = { ...defaultLabels, ...labels };

  // Build the label with the match value interpolated
  const inputLabel = confirmText?.label.replace('{value}', confirmText.matchValue);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      showCloseButton={!isConfirming}
      showLogo={false}
      size="sm"
    >
      <div className="space-y-4">
        {/* Icon and Title */}
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-full ${style.bgClass} flex items-center justify-center shrink-0`}
          >
            <Icon className={`w-6 h-6 ${style.iconClass}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {message && <p className="text-secondary text-sm mt-1">{message}</p>}
          </div>
        </div>

        {/* Bullet points */}
        {items && items.length > 0 && (
          <ul className="text-secondary text-sm space-y-1 pl-4 list-disc">
            {items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        )}

        {/* Rich details content */}
        {details && <div className="text-secondary">{details}</div>}

        {/* Warning text */}
        {variant === 'danger' && (
          <p className="text-red-400 text-sm">This action cannot be undone.</p>
        )}

        {/* Type-to-confirm input */}
        {confirmText && (
          <div>
            <label className="block text-sm font-medium text-white mb-2">{inputLabel}</label>
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder={confirmText.placeholder}
              className="w-full px-3 py-2 bg-elevated border border-border rounded-lg text-white placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent/50"
              autoFocus
              disabled={isConfirming}
            />
          </div>
        )}

        {/* Error message */}
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="flex-1 py-2.5 text-sm font-medium text-secondary hover:text-white bg-elevated hover:bg-surface-light rounded-lg transition-colors disabled:opacity-50"
          >
            {finalLabels.cancel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || isConfirming}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${style.buttonClass}`}
          >
            {isConfirming && finalLabels.confirming ? finalLabels.confirming : finalLabels.confirm}
          </button>
        </div>
      </div>
    </Modal>
  );
}
