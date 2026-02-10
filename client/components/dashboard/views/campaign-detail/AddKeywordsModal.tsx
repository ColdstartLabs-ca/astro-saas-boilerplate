'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import { useTranslations } from '@client/hooks/useTranslations';

interface IAddKeywordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (keywords: string[]) => void | Promise<void>;
}

/**
 * Modal for adding new keywords to a campaign.
 * Users can enter multiple keywords, one per line.
 *
 * @example
 * ```tsx
 * <AddKeywordsModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onAdd={handleAddKeywords}
 * />
 * ```
 */
export function AddKeywordsModal({
  isOpen,
  onClose,
  onAdd,
}: IAddKeywordsModalProps): JSX.Element | null {
  const t = useTranslations('dashboard');
  const [newKeywords, setNewKeywords] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async () => {
    const parsed = newKeywords
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (parsed.length === 0) return;

    setIsSubmitting(true);
    try {
      await onAdd(parsed);
      setNewKeywords('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h3 className="text-lg font-bold text-white">{t('campaigns.keywords.title')}</h3>
          <button onClick={onClose} className="text-muted hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <textarea
            value={newKeywords}
            onChange={e => setNewKeywords(e.target.value)}
            placeholder={t('campaigns.keywords.placeholder')}
            className="w-full h-32 bg-main border border-border rounded-lg p-4 text-white focus:ring-1 focus:ring-accent outline-none resize-none font-mono text-sm"
          />
        </div>
        <div className="p-6 border-t border-border flex justify-end gap-2">
          <DashboardButton variant="ghost" onClick={onClose} disabled={isSubmitting}>
            {t('campaigns.keywords.cancel')}
          </DashboardButton>
          <DashboardButton onClick={handleAdd} disabled={isSubmitting || !newKeywords.trim()}>
            {isSubmitting ? 'Adding...' : t('campaigns.keywords.add')}
          </DashboardButton>
        </div>
      </div>
    </div>
  );
}
