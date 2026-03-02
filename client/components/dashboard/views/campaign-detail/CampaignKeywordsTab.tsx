import { useMemo, useState } from 'react';
import { Search, Plus, Trash2, Loader2 } from 'lucide-react';
import type { IKeyword, KeywordStatus } from '@shared/types/campaign.types';
import dayjs from 'dayjs';

interface ICampaignKeywordsTabProps {
  keywords: IKeyword[];
  onRemoveKeyword: (id: string) => Promise<void>;
  onAddKeywords: () => void;
}

const STATUS_STYLE: Record<KeywordStatus, string> = {
  pending: 'text-muted border-border',
  queued: 'text-blue-300 border-blue-500/30 bg-blue-500/10',
  generating: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
  generated: 'text-green-300 border-green-500/30 bg-green-500/10',
  failed: 'text-red-300 border-red-500/30 bg-red-500/10',
};

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'text-green-400',
  medium: 'text-yellow-400',
  hard: 'text-red-400',
  unknown: 'text-muted',
};

const STATUS_ORDER: Record<string, number> = {
  generating: 0,
  queued: 1,
  pending: 2,
  generated: 3,
  failed: 4,
};

export function CampaignKeywordsTab({
  keywords,
  onRemoveKeyword,
  onAddKeywords,
}: ICampaignKeywordsTabProps): JSX.Element {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: keywords.length };
    for (const k of keywords) {
      c[k.status] = (c[k.status] ?? 0) + 1;
    }
    return c;
  }, [keywords]);

  const filtered = useMemo(() => {
    let result = keywords;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(k => k.keyword.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') {
      result = result.filter(k => k.status === statusFilter);
    }
    return [...result].sort(
      (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
    );
  }, [keywords, search, statusFilter]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onRemoveKeyword(id);
    } finally {
      setDeletingId(null);
    }
  };

  const canDelete = (status: KeywordStatus) => status !== 'generating' && status !== 'queued';

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border flex justify-between items-center gap-3 bg-main/30 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-white">Keywords</h3>
          <span className="text-xs bg-surface-light text-muted px-2 py-0.5 rounded-full">
            {keywords.length}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
            <input
              type="text"
              placeholder="Search keywords..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-main border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-secondary focus:border-accent outline-none w-44"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="appearance-none bg-main border border-border rounded-lg px-3 py-1.5 text-xs text-secondary focus:border-accent outline-none cursor-pointer"
          >
            <option value="all">All ({counts.all})</option>
            {(['pending', 'queued', 'generating', 'generated', 'failed'] as KeywordStatus[]).map(
              s =>
                counts[s] ? (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s]})
                  </option>
                ) : null
            )}
          </select>
          <button
            type="button"
            onClick={onAddKeywords}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Keywords
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-sm text-left">
          <thead className="bg-main/50 text-muted font-medium border-b border-border text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Keyword</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Difficulty</th>
              <th className="px-6 py-3">Volume</th>
              <th className="px-6 py-3 text-right">Added</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-muted text-sm">
                  {search || statusFilter !== 'all'
                    ? 'No keywords match your filters.'
                    : 'No keywords yet. Add some to get started.'}
                </td>
              </tr>
            ) : (
              filtered.map(kw => (
                <tr
                  key={kw.id}
                  className="hover:bg-surface-light/30 transition-colors group"
                >
                  <td className="px-6 py-3 font-medium text-white">{kw.keyword}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wide ${STATUS_STYLE[kw.status]}`}
                    >
                      {kw.status === 'generating' && (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      )}
                      {kw.status}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`text-xs font-medium capitalize ${DIFFICULTY_COLOR[kw.difficulty]}`}
                    >
                      {kw.difficulty === 'unknown' ? '—' : kw.difficulty}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-muted text-xs font-mono">
                    {kw.search_volume != null ? kw.search_volume.toLocaleString() : '—'}
                  </td>
                  <td className="px-6 py-3 text-right text-muted text-xs">
                    {dayjs(kw.created_at).format('MMM D')}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleDelete(kw.id)}
                        disabled={deletingId === kw.id || !canDelete(kw.status)}
                        title={
                          !canDelete(kw.status)
                            ? 'Cannot delete while processing'
                            : 'Delete keyword'
                        }
                        className="p-1.5 rounded text-muted hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        {deletingId === kw.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
