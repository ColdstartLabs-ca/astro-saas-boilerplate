'use client';

import { UserActionsDropdown } from '@client/components/admin/UserActionsDropdown';
import { adminFetch } from '@client/utils/admin-api-client';
import { IAdminUserProfile } from '@shared/types/admin.types';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export default function AdminUsersPageClient(): JSX.Element {
  const [users, setUsers] = useState<IAdminUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const limit = 20;

  const t = (key: string, params?: Record<string, string | number>) => {
    // Simple translation function - replace with proper i18n
    const translations: Record<string, string> = {
      'admin.users.title': 'Users',
      'admin.users.searchPlaceholder': 'Search by email...',
      'admin.users.error': 'Failed to load users',
      'admin.users.loading': 'Loading...',
      'admin.users.noUsersFound': 'No users found',
      'admin.users.table.email': 'Email',
      'admin.users.table.role': 'Role',
      'admin.users.table.credits': 'Credits',
      'admin.users.table.subscription': 'Subscription',
      'admin.users.table.joined': 'Joined',
      'admin.users.table.actions': 'Actions',
      'admin.users.table.free': 'Free',
      'admin.users.pagination.showing': 'Showing {from} to {to} of {total}',
      'admin.users.pagination.pageOf': 'Page {current} of {total}',
    };

    let result = translations[key] || key;
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        result = result.replace(`{${param}}`, String(value));
      });
    }
    return result;
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
      });
      const data = await adminFetch<{
        success: boolean;
        data: { users: IAdminUserProfile[]; total: number };
      }>(`/api/admin/users?${queryParams}`);
      if (data.success) {
        setUsers(data.data.users);
        setTotal(data.data.total);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError(err instanceof Error ? err.message : t('admin.users.error'));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, refreshKey]);

  const handleUserUpdate = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-primary">{t('admin.users.title')}</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('admin.users.searchPlaceholder')}
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-surface rounded-lg border border-border">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-surface">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider rounded-tl-lg">
                {t('admin.users.table.email')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('admin.users.table.role')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('admin.users.table.credits')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('admin.users.table.subscription')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('admin.users.table.joined')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider rounded-tr-lg">
                {t('admin.users.table.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-muted-foreground">
                  {t('admin.users.loading')}
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-error">
                  {error}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-muted-foreground">
                  {t('admin.users.noUsersFound')}
                </td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id} className="hover:bg-surface">
                  <td className="px-6 py-4 text-sm text-primary">{user.email}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        user.role === 'admin'
                          ? 'bg-secondary/20 text-secondary'
                          : 'bg-surface-light text-primary'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-primary">
                    {(user.subscription_credits_balance ?? 0) +
                      (user.purchased_credits_balance ?? 0)}
                  </td>
                  <td className="px-6 py-4">
                    {user.subscription_tier ? (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-success/20 text-success">
                        {user.subscription_tier}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">{t('admin.users.table.free')}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {dayjs(user.created_at).format('MMM D, YYYY')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <UserActionsDropdown
                      user={user}
                      onUpdate={handleUserUpdate}
                      navigate={(href: string) => {
                        window.location.href = href;
                      }}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-border flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {t('admin.users.pagination.showing', {
                from: (page - 1) * limit + 1,
                to: Math.min(page * limit, total),
                total,
              })}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded hover:bg-surface-light disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm text-muted-foreground">
                {t('admin.users.pagination.pageOf', { current: page, total: totalPages })}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded hover:bg-surface-light disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
