'use client';

import { useState } from 'react';
import { useTranslations } from '@client/hooks/useTranslations';
import { AlertTriangle } from 'lucide-react';
import dayjs from 'dayjs';
import { ModalHeader } from './ModalHeader';

interface ICancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
  planName: string;
  periodEnd: string;
}

function getCancellationReasons(t: ReturnType<typeof useTranslations>) {
  return [
    t('reasons.tooExpensive'),
    t('reasons.notUsingEnough'),
    t('reasons.missingFeatures'),
    t('reasons.switchingCompetitor'),
    t('reasons.technicalIssues'),
    t('reasons.other'),
  ];
}

/**
 * Modal for canceling a subscription with optional reason
 *
 * Features:
 * - Shows clear information about cancellation (keeps access until period end)
 * - Optional reason selection with custom text input
 * - Confirmation step to prevent accidental cancellations
 */
export function CancelSubscriptionModal({
  isOpen,
  onClose,
  onConfirm,
  planName,
  periodEnd,
}: ICancelSubscriptionModalProps): JSX.Element | null {
  const t = useTranslations('stripe.cancelSubscription');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (!isOpen) return null;

  const handleReasonChange = (reason: string) => {
    setSelectedReason(reason);
    if (reason !== t('reasons.other')) {
      setCustomReason('');
    }
  };

  const handleCancel = async () => {
    try {
      setLoading(true);
      const reason = selectedReason === t('reasons.other') ? customReason : selectedReason;
      await onConfirm(reason || undefined);
      onClose();
    } catch (error) {
      console.error('Error canceling subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const formattedEndDate = dayjs(periodEnd).format('MMMM D, YYYY');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <ModalHeader
          title={t('title')}
          icon={AlertTriangle}
          iconClassName="text-error"
          onClose={onClose}
          disabled={loading}
        />

        <div className="p-6 space-y-6">
          {!showConfirmation ? (
            <CancellationReasonForm
              planName={planName}
              formattedEndDate={formattedEndDate}
              selectedReason={selectedReason}
              customReason={customReason}
              loading={loading}
              onReasonChange={handleReasonChange}
              onCustomReasonChange={setCustomReason}
              onClose={onClose}
              onContinue={() => setShowConfirmation(true)}
            />
          ) : (
            <CancellationConfirmation
              formattedEndDate={formattedEndDate}
              loading={loading}
              onGoBack={() => setShowConfirmation(false)}
              onConfirm={handleCancel}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface ICancellationReasonFormProps {
  planName: string;
  formattedEndDate: string;
  selectedReason: string;
  customReason: string;
  loading: boolean;
  onReasonChange: (reason: string) => void;
  onCustomReasonChange: (reason: string) => void;
  onClose: () => void;
  onContinue: () => void;
}

function CancellationReasonForm({
  planName,
  formattedEndDate,
  selectedReason,
  customReason,
  loading,
  onReasonChange,
  onCustomReasonChange,
  onClose,
  onContinue,
}: ICancellationReasonFormProps): JSX.Element {
  const t = useTranslations('stripe.cancelSubscription');
  const reasons = getCancellationReasons(t);

  return (
    <>
      {/* Cancellation Info */}
      <div className="bg-info/10 border border-info/20 rounded-lg p-4">
        <p className="text-sm text-info">
          <strong>{t('info', { planName, formattedEndDate })}</strong>
          <br />
          <br />
          {t('keepAccess')}
        </p>
      </div>

      {/* Optional Reason */}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-3">
          {t('helpUsImprove')}
        </label>
        <div className="space-y-2">
          {reasons.map(reason => (
            <label
              key={reason}
              className="flex items-center p-3 border border-border rounded-lg hover:bg-surface cursor-pointer transition-colors"
            >
              <input
                type="radio"
                name="reason"
                value={reason}
                checked={selectedReason === reason}
                onChange={e => onReasonChange(e.target.value)}
                className="w-4 h-4 text-accent border-border focus:ring-accent"
              />
              <span className="ml-3 text-sm text-muted-foreground">{reason}</span>
            </label>
          ))}
        </div>

        {/* Custom Reason Input */}
        {selectedReason === t('reasons.other') && (
          <textarea
            value={customReason}
            onChange={e => onCustomReasonChange(e.target.value)}
            placeholder={t('otherPlaceholder')}
            className="mt-3 w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
            rows={3}
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-3 bg-surface-light hover:bg-surface-light text-muted-foreground font-medium rounded-lg transition-colors"
          disabled={loading}
        >
          {t('keepSubscription')}
        </button>
        <button
          onClick={onContinue}
          className="flex-1 px-4 py-3 bg-error hover:bg-error/80 text-white font-medium rounded-lg transition-colors"
          disabled={loading}
        >
          {t('continue')}
        </button>
      </div>
    </>
  );
}

interface ICancellationConfirmationProps {
  formattedEndDate: string;
  loading: boolean;
  onGoBack: () => void;
  onConfirm: () => void;
}

function CancellationConfirmation({
  formattedEndDate,
  loading,
  onGoBack,
  onConfirm,
}: ICancellationConfirmationProps): JSX.Element {
  const t = useTranslations('stripe.cancelSubscription');

  return (
    <>
      {/* Confirmation Step */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="h-8 w-8 text-error" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2">{t('confirmationTitle')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('confirmationText', { formattedEndDate })}
          </p>
        </div>
      </div>

      {/* Final Actions */}
      <div className="flex gap-3">
        <button
          onClick={onGoBack}
          className="flex-1 px-4 py-3 bg-surface-light hover:bg-surface-light text-muted-foreground font-medium rounded-lg transition-colors"
          disabled={loading}
        >
          {t('goBack')}
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 px-4 py-3 bg-error hover:bg-error/80 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? t('canceling') : t('yesCancel')}
        </button>
      </div>
    </>
  );
}
