import { Settings, FileText, Hash, Image, Calendar, Clock } from 'lucide-react';
import type { ICampaign } from '@shared/types/campaign.types';
import dayjs from 'dayjs';

interface ICampaignMetadataProps {
  campaign: ICampaign;
  t: (key: string) => string;
}

export function CampaignMetadata({
  campaign,
  t,
}: ICampaignMetadataProps): JSX.Element {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 mb-8">
      <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
        <Settings className="w-4 h-4 text-accent-hover" />
        {t('campaigns.detail.metadata.title')}
      </h3>
      <div className="grid grid-cols-5 gap-4">
        {/* Tone */}
        <div className="bg-main/30 rounded-lg p-3 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-muted uppercase tracking-wider">
              {t('campaigns.detail.metadata.tone')}
            </span>
          </div>
          <div className="text-sm font-semibold text-white capitalize">{campaign.tone}</div>
        </div>

        {/* Target Word Count */}
        <div className="bg-main/30 rounded-lg p-3 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-muted uppercase tracking-wider">
              {t('campaigns.detail.metadata.wordCount')}
            </span>
          </div>
          <div className="text-sm font-semibold text-white">
            {campaign.target_word_count.toLocaleString()}
          </div>
        </div>

        {/* Image Preset */}
        <div className="bg-main/30 rounded-lg p-3 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Image className="w-4 h-4 text-green-400" />
            <span className="text-xs text-muted uppercase tracking-wider">
              {t('campaigns.detail.metadata.images')}
            </span>
          </div>
          <div className="text-sm font-semibold text-white">
            {campaign.image_preset
              ? t('campaigns.detail.metadata.enabled')
              : t('campaigns.detail.metadata.disabled')}
          </div>
        </div>

        {/* Created At */}
        <div className="bg-main/30 rounded-lg p-3 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-muted uppercase tracking-wider">
              {t('campaigns.detail.metadata.created')}
            </span>
          </div>
          <div className="text-sm font-semibold text-white">
            {dayjs(campaign.created_at).format('MMM D, YYYY')}
          </div>
        </div>

        {/* Updated At */}
        <div className="bg-main/30 rounded-lg p-3 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-accent-hover" />
            <span className="text-xs text-muted uppercase tracking-wider">
              {t('campaigns.detail.metadata.updated')}
            </span>
          </div>
          <div className="text-sm font-semibold text-white">
            {dayjs(campaign.updated_at).format('MMM D, YYYY')}
          </div>
        </div>
      </div>
    </div>
  );
}
