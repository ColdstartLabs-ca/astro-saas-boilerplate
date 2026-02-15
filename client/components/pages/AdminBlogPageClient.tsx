'use client';

import { useState } from 'react';
import { PostsList } from '@client/components/admin/blog/PostsList';
import { MediaLibrary } from '@client/components/admin/blog/MediaLibrary';

type Tab = 'posts' | 'media';

export default function AdminBlogPageClient(): JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('posts');

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'posts'
              ? 'border-accent text-accent'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          Posts
        </button>
        <button
          onClick={() => setActiveTab('media')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'media'
              ? 'border-accent text-accent'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          Media Library
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'posts' && <PostsList />}
      {activeTab === 'media' && <MediaLibrary />}
    </div>
  );
}
