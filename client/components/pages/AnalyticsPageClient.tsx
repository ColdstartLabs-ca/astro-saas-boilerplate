'use client';

import { BarChart } from 'lucide-react';

export default function AnalyticsPage(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-secondary">
      <BarChart className="w-16 h-16 mb-4 text-muted" />
      <h3 className="text-xl font-medium text-white">Analytics Module</h3>
      <p className="mt-2">Connecting to Google Search Console...</p>
    </div>
  );
}
