-- Migration: Change articles.project_id FK from SET NULL to CASCADE DELETE
-- Date: 2026-02-27
--
-- BUG L3 FIX: The articles.project_id foreign key was created with ON DELETE SET NULL
-- (added inline in 20260206100000_add_article_generation_columns.sql). When a project
-- is deleted, articles are left behind with project_id = NULL — orphaned rows that
-- pollute the database and can mislead queries.
--
-- Fix: Drop the auto-generated FK constraint and recreate it with ON DELETE CASCADE
-- so that deleting a project also removes all its associated articles.
--
-- PostgreSQL auto-names inline FK constraints as: <table>_<column>_fkey
-- so the constraint is: articles_project_id_fkey

ALTER TABLE public.articles
  DROP CONSTRAINT IF EXISTS articles_project_id_fkey;

ALTER TABLE public.articles
  ADD CONSTRAINT articles_project_id_fkey
  FOREIGN KEY (project_id)
  REFERENCES public.projects(id)
  ON DELETE CASCADE;
