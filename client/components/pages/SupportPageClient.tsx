'use client';

import { useEffect } from 'react';

/**
 * Support page component - redirects to /help
 * This page is kept for backward compatibility with existing routes
 */
export default function SupportPage(): JSX.Element {
  useEffect(() => {
    window.location.href = '/help';
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-muted-foreground">Redirecting...</div>
    </div>
  );
}
