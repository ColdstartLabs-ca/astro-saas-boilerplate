'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, ArrowRight } from 'lucide-react';
import { BlogSearch } from './BlogSearch';

interface IBlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  category: string;
  tags: string[];
  image?: string;
  readingTime: string;
}

interface IBlogGridProps {
  posts: IBlogPostMeta[];
  postsPerPage?: number;
}

const POSTS_PER_PAGE = 6;

export function BlogGrid({ posts, postsPerPage = POSTS_PER_PAGE }: IBlogGridProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(posts.map(p => p.category));
    return ['All', ...Array.from(cats)];
  }, [posts]);

  // Filter posts
  const filteredPosts = useMemo(() => {
    let result = posts;

    if (activeCategory !== 'All') {
      result = result.filter(p => p.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    return result;
  }, [posts, activeCategory, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const displayedPosts = filteredPosts.slice(startIndex, startIndex + postsPerPage);

  // Reset page when filters change
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setCurrentPage(1);
  };

  return (
    <div>
      {/* Section Header + Filters */}
      <div className="flex flex-col gap-6 mb-10">
        <h2 className="font-display text-2xl font-bold text-white">More Articles</h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-surface border border-border text-text-secondary hover:border-accent/50 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search */}
          <BlogSearch value={searchQuery} onChange={handleSearch} />
        </div>
      </div>

      {/* Posts Grid */}
      {displayedPosts.length > 0 ? (
        <div
          className={`grid gap-8 ${
            displayedPosts.length === 1
              ? 'grid-cols-1 max-w-2xl'
              : displayedPosts.length === 2
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {displayedPosts.map(post => (
            <a key={post.slug} href={`/blog/${post.slug}`} className="group">
              <article className="h-full bg-surface rounded-2xl border border-border overflow-hidden hover:border-accent/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                {/* Cover Image */}
                <div className="aspect-[16/9] relative overflow-hidden">
                  {post.image ? (
                    <img
                      src={post.image}
                      alt={post.title}
                      className="object-cover group-hover:scale-105 transition-transform duration-500 w-full h-full"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-secondary/5 to-surface-light flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-accent/30"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
                </div>

                <div className="p-6">
                  {/* Category & Reading Time */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent">
                      {post.category}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.readingTime}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-display text-lg font-semibold text-white mb-2 group-hover:text-accent transition-colors line-clamp-2 leading-snug">
                    {post.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-text-secondary mb-4 line-clamp-2 leading-relaxed">
                    {post.description}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <span className="text-xs text-text-secondary">
                      {new Date(post.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-sm text-accent font-medium flex items-center gap-1 group-hover:gap-2 transition-all whitespace-nowrap">
                      Read
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </span>
                  </div>
                </div>
              </article>
            </a>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-surface rounded-2xl border border-border">
          <p className="text-text-secondary text-lg mb-2">No articles found</p>
          <p className="text-muted-foreground text-sm">Try adjusting your search or filter.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-12 flex items-center justify-center gap-2">
          {/* Previous */}
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface border border-border rounded-lg hover:border-accent/50 hover:bg-accent/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:bg-surface"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`min-w-[2.5rem] h-10 flex items-center justify-center rounded-lg font-medium text-sm transition-all ${
                  currentPage === pageNum
                    ? 'bg-accent text-white shadow-md'
                    : 'bg-surface border border-border hover:border-accent/50 hover:bg-accent/5 text-text-secondary'
                }`}
              >
                {pageNum}
              </button>
            ))}
          </div>

          {/* Next */}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface border border-border rounded-lg hover:border-accent/50 hover:bg-accent/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:bg-surface"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
