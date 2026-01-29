-- Migration: Add rank_tag column to vision_board_jobs table
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)

ALTER TABLE vision_board_jobs
ADD COLUMN IF NOT EXISTS rank_tag TEXT;

-- Optional: Add index for rank_tag lookups if needed
-- CREATE INDEX IF NOT EXISTS idx_vision_board_jobs_rank_tag ON vision_board_jobs(rank_tag);
