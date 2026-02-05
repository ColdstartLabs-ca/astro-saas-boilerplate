'use client';

import type { ReactNode } from 'react';

interface IProps {
  children: ReactNode;
}

function AdminDashboardLayout({ children }: IProps) {
  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-semibold text-primary">Admin Panel</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage users, subscriptions, and credits
        </p>
      </div>
      {children}
    </div>
  );
}

export default AdminDashboardLayout;
