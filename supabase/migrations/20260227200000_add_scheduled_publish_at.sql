-- Add scheduled_publish_at column to articles table
-- This enables the Content Calendar System to track when articles are scheduled to publish

ALTER TABLE articles ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_articles_scheduled_publish_at
  ON articles(scheduled_publish_at)
  WHERE scheduled_publish_at IS NOT NULL;
