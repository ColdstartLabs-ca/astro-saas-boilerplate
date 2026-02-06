'use client';

import { CampaignsView } from '@client/components/dashboard/views/CampaignsView';

export default function CampaignsPage(): JSX.Element {
  return <CampaignsView onNewCampaign={() => console.log('New campaign')} />;
}
