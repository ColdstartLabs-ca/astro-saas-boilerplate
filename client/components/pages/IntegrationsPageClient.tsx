'use client';

import { useIntegrations } from '@client/hooks/useIntegrations';
import { IntegrationsView } from '@client/components/dashboard/views/IntegrationsView';
import { IntegrationFormModal } from '@client/components/dashboard/views/integrations/IntegrationFormModal';
import { useState } from 'react';
import type {
  IIntegrationWithCampaigns,
  ICreateIntegrationInput,
} from '@shared/types/integration.types';

export default function IntegrationsPage(): JSX.Element {
  const {
    integrations,
    isLoading,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    testIntegration,
  } = useIntegrations();

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<IIntegrationWithCampaigns | null>(
    null
  );
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  const handleNewIntegration = () => {
    setEditingIntegration(null);
    setFormMode('create');
    setIsFormModalOpen(true);
  };

  const handleEditIntegration = (integration: IIntegrationWithCampaigns) => {
    setEditingIntegration(integration);
    setFormMode('edit');
    setIsFormModalOpen(true);
  };

  const handleCreateIntegration = async (input: ICreateIntegrationInput) => {
    await createIntegration(input);
  };

  const handleUpdateIntegration = async (input: ICreateIntegrationInput) => {
    if (!editingIntegration) return;
    await updateIntegration({
      integrationId: editingIntegration.id,
      name: input.name,
      ...(input.type === 'wordpress' ? { appPassword: input.appPassword } : {}),
      ...(input.type === 'webhook' ? { secret: input.secret } : {}),
    });
  };

  const handleDeleteIntegration = async (integrationId: string) => {
    await deleteIntegration(integrationId);
  };

  const handleTestIntegration = async (integrationId: string) => {
    return await testIntegration(integrationId);
  };

  return (
    <>
      <IntegrationsView
        integrations={integrations}
        isLoading={isLoading}
        onNewIntegration={handleNewIntegration}
        onEditIntegration={handleEditIntegration}
        onDeleteIntegration={handleDeleteIntegration}
        onTestIntegration={handleTestIntegration}
      />
      <IntegrationFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={formMode === 'create' ? handleCreateIntegration : handleUpdateIntegration}
        integration={editingIntegration}
        mode={formMode}
      />
    </>
  );
}
