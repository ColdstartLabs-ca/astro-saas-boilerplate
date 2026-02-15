-- Create blog tables for internal CMS
-- This migration creates a hybrid blog system that works alongside the existing MDX pipeline

-- ============================================
-- Blog Categories Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for slug lookups
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON public.blog_categories(slug);

-- ============================================
-- Blog Media Table (Image Library)
-- ============================================
CREATE TABLE IF NOT EXISTS public.blog_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  alt_text TEXT,
  tags TEXT[] DEFAULT '{}',
  mime_type TEXT,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for media library search
CREATE INDEX IF NOT EXISTS idx_blog_media_tags ON public.blog_media USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_blog_media_alt_text ON public.blog_media USING gin(to_tsvector('english', alt_text));
CREATE INDEX IF NOT EXISTS idx_blog_media_uploaded_by ON public.blog_media(uploaded_by);

-- ============================================
-- Blog Posts Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  content TEXT,
  content_html TEXT,
  author TEXT,
  category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  cover_image_id UUID REFERENCES public.blog_media(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  reading_time TEXT,
  meta_title TEXT,
  meta_description TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for blog posts
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON public.blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category_id ON public.blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_by ON public.blog_posts(created_by);

-- ============================================
-- Blog Post Tags Junction Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.blog_post_tags (
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (post_id, tag)
);

-- Index for tag-based queries
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag ON public.blog_post_tags(tag);

-- ============================================
-- Row Level Security Policies
-- ============================================

-- Blog Categories: readable by everyone, writable by admins only
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blog categories are readable by everyone" ON public.blog_categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage blog categories" ON public.blog_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Blog Media: readable by admins only, writable by admins only
ALTER TABLE public.blog_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read blog media" ON public.blog_media
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage blog media" ON public.blog_media
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Blog Posts: published posts readable by everyone, all posts writable by admins only
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published blog posts are readable by everyone" ON public.blog_posts
  FOR SELECT USING (status = 'published');

CREATE POLICY "Admins can read all blog posts" ON public.blog_posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage blog posts" ON public.blog_posts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Blog Post Tags: same as parent post
ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blog post tags readable when post is published" ON public.blog_post_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.blog_posts
      WHERE id = post_id AND status = 'published'
    )
  );

CREATE POLICY "Admins can manage blog post tags" ON public.blog_post_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- Triggers for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION public.update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_blog_posts_updated_at();

-- ============================================
-- Grant permissions to service role for admin operations
-- ============================================
-- The service role key bypasses RLS, so these are for authenticated users
-- RLS policies above handle the actual access control
