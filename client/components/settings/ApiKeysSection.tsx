/**
 * ApiKeysSection Component
 *
 * Displays API keys for the current user with:
 * - List of existing keys with last-used timestamp
 * - Create key button that opens a dialog
 * - Revoke button with confirmation
 *
 * Features:
 * - React Hook Form for create dialog
 * - Shows full key once after creation (Stripe-style)
 * - i18n support via settings namespace
 */

'use client';

import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import { ConfirmDialog } from '@client/components/ui/ConfirmDialog';
import { Modal } from '@client/components/modal/Modal';
import { useApiKeys } from '@client/hooks/useApiKeys';
import { useTranslations } from '@client/hooks/useTranslations';
import { useLogger } from '@client/utils/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { ALL_API_KEY_SCOPES, type ApiKeyScope, type IApiKey, type ICreateApiKeyResponse } from '@shared/types/api-key.types';
import { Copy, Key, Loader2, Plus, Trash2, Check, AlertTriangle } from 'lucide-react';
import React, { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

// =============================================================================
// Validation Schema
// =============================================================================

const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  scopes: z.array(z.string()).min(1, 'Select at least one permission'),
});

type ICreateApiKeyForm = z.infer<typeof createApiKeySchema>;

// =============================================================================
// Create API Key Modal
// =============================================================================

interface ICreateApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: { name: string; scopes: ApiKeyScope[] }) => Promise<ICreateApiKeyResponse | null>;
}

function CreateApiKeyModal({ isOpen, onClose, onCreate }: ICreateApiKeyModalProps): JSX.Element {
  const t = useTranslations('settings');
  const logger = useLogger('CreateApiKeyModal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdKey, setCreatedKey] = useState<ICreateApiKeyResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ICreateApiKeyForm>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: {
      name: '',
      scopes: [],
    },
  });

  const selectedScopes = watch('scopes');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setCreatedKey(null);
      setCopied(false);
    }
  }, [isOpen, reset]);

  const handleToggleScope = (scope: ApiKeyScope) => {
    const currentScopes = selectedScopes || [];
    if (currentScopes.includes(scope)) {
      setValue(
        'scopes',
        currentScopes.filter(s => s !== scope)
      );
    } else {
      setValue('scopes', [...currentScopes, scope]);
    }
  };

  const handleSelectAll = () => {
    setValue('scopes', [...ALL_API_KEY_SCOPES]);
  };

  const handleDeselectAll = () => {
    setValue('scopes', []);
  };

  const onSubmit = async (data: ICreateApiKeyForm) => {
    setIsSubmitting(true);
    try {
      const result = await onCreate({
        name: data.name,
        scopes: data.scopes as ApiKeyScope[],
      });
      if (result) {
        setCreatedKey(result);
      }
    } catch (error) {
      logger.error('Failed to create API key', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyKey = async () => {
    if (createdKey?.key.key) {
      await navigator.clipboard.writeText(createdKey.key.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    if (createdKey) {
      // If key was created, close both dialogs
      onClose();
    } else {
      onClose();
    }
  };

  // Show success dialog with the key
  if (createdKey) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={t('apiKeys.createdDialog.title')}
        subtitle={t('apiKeys.createdDialog.subtitle')}
        icon={<Key className="w-8 h-8 text-green-400" />}
        showCloseButton={true}
        showLogo={false}
        size="md"
      >
        <div className="space-y-4">
          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-200">{t('apiKeys.createdDialog.warning')}</p>
          </div>

          {/* API Key Display */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {createdKey.key.name}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={createdKey.key.key}
                readOnly
                className="flex-1 px-3 py-2 bg-main border border-border rounded-lg text-sm text-secondary font-mono"
              />
              <DashboardButton
                variant={copied ? 'secondary' : 'outline'}
                size="sm"
                onClick={handleCopyKey}
                className="min-w-[100px]"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {t('apiKeys.createdDialog.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    {t('apiKeys.createdDialog.copyButton')}
                  </>
                )}
              </DashboardButton>
            </div>
          </div>

          {/* Done Button */}
          <div className="flex justify-end pt-2">
            <DashboardButton onClick={handleClose}>
              {t('apiKeys.createdDialog.done')}
            </DashboardButton>
          </div>
        </div>
      </Modal>
    );
  }

  // Show create form
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('apiKeys.form.title')}
      showCloseButton={true}
      showLogo={false}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name Input */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            {t('apiKeys.form.name')}
          </label>
          <input
            {...register('name')}
            type="text"
            placeholder={t('apiKeys.form.namePlaceholder')}
            className="w-full px-3 py-2 bg-main border border-border rounded-lg text-white placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          <p className="text-xs text-muted mt-1">{t('apiKeys.form.nameHelp')}</p>
          {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>}
        </div>

        {/* Scopes Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-white">
              {t('apiKeys.form.scopes')}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-accent-hover hover:underline"
              >
                {t('apiKeys.form.selectAll')}
              </button>
              <span className="text-muted">|</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-xs text-accent-hover hover:underline"
              >
                {t('apiKeys.form.deselectAll')}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted mb-2">{t('apiKeys.form.scopesHelp')}</p>
          <div className="space-y-2">
            {ALL_API_KEY_SCOPES.map(scope => (
              <label
                key={scope}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedScopes?.includes(scope)
                    ? 'border-accent bg-accent/5'
                    : 'border-border/50 bg-main/40 hover:border-accent/40'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedScopes?.includes(scope) || false}
                  onChange={() => handleToggleScope(scope)}
                  className="w-4 h-4 rounded border-border text-accent focus:ring-accent/50"
                />
                <span className="text-sm text-white">{t(`apiKeys.scopes.${scope}`)}</span>
              </label>
            ))}
          </div>
          {errors.scopes && <p className="text-red-400 text-sm mt-1">{errors.scopes.message}</p>}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <DashboardButton type="button" variant="ghost" size="sm" onClick={handleClose}>
            {t('apiKeys.form.cancel')}
          </DashboardButton>
          <DashboardButton type="submit" size="sm" disabled={isSubmitting} className="min-w-[120px]">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('apiKeys.form.creating')}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                {t('apiKeys.form.create')}
              </>
            )}
          </DashboardButton>
        </div>
      </form>
    </Modal>
  );
}

// =============================================================================
// API Key Row Component
// =============================================================================

interface IApiKeyRowProps {
  apiKey: IApiKey;
  onRevoke: (keyId: string) => void;
  isRevoking: boolean;
}

function ApiKeyRow({ apiKey, onRevoke, isRevoking }: IApiKeyRowProps): JSX.Element {
  const t = useTranslations('settings');
  const [showConfirm, setShowConfirm] = useState(false);

  const formattedLastUsed = apiKey.last_used_at
    ? dayjs(apiKey.last_used_at).fromNow()
    : t('apiKeys.neverUsed');

  const formattedCreated = dayjs(apiKey.created_at).format('MMM D, YYYY');

  const handleConfirmRevoke = () => {
    onRevoke(apiKey.id);
    setShowConfirm(false);
  };

  return (
    <>
      <tr className="border-b border-border/50 hover:bg-surface-light/30 transition-colors">
        <td className="py-3 px-4">
          <div className="text-sm font-medium text-white">{apiKey.name}</div>
        </td>
        <td className="py-3 px-4">
          <code className="text-xs text-secondary bg-main px-2 py-1 rounded font-mono">
            {apiKey.key_prefix}...
          </code>
        </td>
        <td className="py-3 px-4">
          <div className="flex flex-wrap gap-1">
            {apiKey.scopes.slice(0, 2).map(scope => (
              <span
                key={scope}
                className="text-xs bg-surface-light text-secondary px-2 py-0.5 rounded"
              >
                {scope.split(':')[0]}
              </span>
            ))}
            {apiKey.scopes.length > 2 && (
              <span className="text-xs bg-surface-light text-secondary px-2 py-0.5 rounded">
                +{apiKey.scopes.length - 2}
              </span>
            )}
          </div>
        </td>
        <td className="py-3 px-4">
          <span className="text-sm text-muted">{formattedLastUsed}</span>
        </td>
        <td className="py-3 px-4">
          <span className="text-sm text-muted">{formattedCreated}</span>
        </td>
        <td className="py-3 px-4 text-right">
          <DashboardButton
            variant="ghost"
            size="sm"
            onClick={() => setShowConfirm(true)}
            disabled={isRevoking}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            {isRevoking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </DashboardButton>
        </td>
      </tr>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmRevoke}
        title={t('apiKeys.revoke')}
        message={t('apiKeys.revokeConfirm')}
        variant="danger"
        labels={{
          confirm: t('apiKeys.revoke'),
          confirming: t('apiKeys.revoking'),
        }}
        isConfirming={isRevoking}
      />
    </>
  );
}

// =============================================================================
// Main ApiKeysSection Component
// =============================================================================

export function ApiKeysSection(): JSX.Element {
  const t = useTranslations('settings');
  const { apiKeys, isLoading, error, createApiKey, deleteApiKey, refetch } = useApiKeys();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);

  const handleCreate = useCallback(
    async (input: { name: string; scopes: ApiKeyScope[] }) => {
      return createApiKey(input);
    },
    [createApiKey]
  );

  const handleRevoke = useCallback(
    async (keyId: string) => {
      setRevokingKeyId(keyId);
      try {
        await deleteApiKey(keyId);
      } finally {
        setRevokingKeyId(null);
      }
    },
    [deleteApiKey]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-accent" />
            {t('apiKeys.title')}
          </h3>
          <p className="text-sm text-secondary mt-1">{t('apiKeys.description')}</p>
        </div>
        <DashboardButton size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('apiKeys.createButton')}
        </DashboardButton>
      </div>

      {/* API Keys List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-sm text-red-400">{t('apiKeys.loadError')}</p>
          <DashboardButton variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
            Retry
          </DashboardButton>
        </div>
      ) : apiKeys.length === 0 ? (
        <div className="bg-surface-light/30 border border-border/50 rounded-lg p-8 text-center">
          <Key className="w-12 h-12 text-muted mx-auto mb-4" />
          <h4 className="text-white font-medium">{t('apiKeys.empty')}</h4>
          <p className="text-sm text-secondary mt-1">{t('apiKeys.emptyDescription')}</p>
          <DashboardButton size="sm" onClick={() => setShowCreateModal(true)} className="mt-4">
            <Plus className="w-4 h-4 mr-2" />
            {t('apiKeys.createButton')}
          </DashboardButton>
        </div>
      ) : (
        <div className="border border-border/50 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-light/50">
              <tr className="border-b border-border/50">
                <th className="py-3 px-4 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  {t('apiKeys.listHeader.name')}
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  {t('apiKeys.listHeader.key')}
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  {t('apiKeys.listHeader.scopes')}
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  {t('apiKeys.listHeader.lastUsed')}
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted uppercase tracking-wider">
                  {t('apiKeys.listHeader.created')}
                </th>
                <th className="py-3 px-4 text-right text-xs font-medium text-muted uppercase tracking-wider">
                  {t('apiKeys.listHeader.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {apiKeys.map(key => (
                <ApiKeyRow
                  key={key.id}
                  apiKey={key}
                  onRevoke={handleRevoke}
                  isRevoking={revokingKeyId === key.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <CreateApiKeyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
