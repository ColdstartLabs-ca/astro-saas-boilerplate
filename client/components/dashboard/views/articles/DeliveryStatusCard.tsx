'use client';

import {
  ExternalLink,
  RotateCcw,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Globe,
  Webhook,
} from 'lucide-react';
import type { IIntegrationDeliveryWithDetails } from '@shared/types/integration.types';
import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import dayjs from 'dayjs';

interface IDeliveryStatusCardProps {
  deliveries: IIntegrationDeliveryWithDetails[];
  isLoading: boolean;
  retryingId: string | null;
  onRetry: (deliveryId: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  delivered: { icon: CheckCircle, color: 'text-green-400', label: 'Delivered' },
  failed: { icon: XCircle, color: 'text-red-400', label: 'Failed' },
  delivering: { icon: Send, color: 'text-blue-400', label: 'Delivering' },
  pending: { icon: Clock, color: 'text-yellow-400', label: 'Pending' },
};

export function DeliveryStatusCard({
  deliveries,
  isLoading,
  retryingId,
  onRetry,
  t,
}: IDeliveryStatusCardProps): JSX.Element | null {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2 className="w-4 h-4 animate-spin text-muted" />
        <span className="text-sm text-muted">Loading delivery status...</span>
      </div>
    );
  }

  if (deliveries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">
        {t('integrations.deliveryStatus')}
      </h4>
      <div className="space-y-2">
        {deliveries.map(delivery => {
          const config = statusConfig[delivery.status] ?? statusConfig.pending;
          const StatusIcon = config.icon;
          const TypeIcon = delivery.integration?.type === 'wordpress' ? Globe : Webhook;

          return (
            <div
              key={delivery.id}
              className="flex items-center justify-between bg-main/30 border border-border rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-3 min-w-0">
                <TypeIcon className="w-4 h-4 text-muted flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white truncate">
                      {delivery.integration?.name ?? 'Unknown'}
                    </span>
                    <StatusIcon className={`w-3.5 h-3.5 ${config.color} flex-shrink-0`} />
                  </div>
                  {delivery.status === 'failed' && delivery.error && (
                    <p className="text-xs text-red-400 truncate mt-0.5" title={delivery.error}>
                      {delivery.error}
                    </p>
                  )}
                  {delivery.delivered_at && (
                    <p className="text-xs text-muted mt-0.5">
                      {t('integrations.deliveredAt')}:{' '}
                      {dayjs(delivery.delivered_at).format('MMM D, HH:mm')}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                {delivery.external_url && (
                  <a
                    href={delivery.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-hover hover:text-accent transition-colors"
                    title={t('integrations.viewExternal')}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {delivery.status === 'failed' && (
                  <DashboardButton
                    variant="secondary"
                    size="sm"
                    onClick={() => onRetry(delivery.id)}
                    disabled={retryingId === delivery.id}
                  >
                    {retryingId === delivery.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3 h-3" />
                    )}
                    {t('integrations.retryDelivery')}
                  </DashboardButton>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
