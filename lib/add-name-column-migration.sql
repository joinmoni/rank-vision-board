-- Migration: Add name column to vision_board_jobs table
-- Run this in your Supabase SQL editor

ALTER TABLE vision_board_jobs
ADD COLUMN IF NOT EXISTS name TEXT;

-- Optional: Add index for name lookups if needed
-- CREATE INDEX IF NOT EXISTS idx_vision_board_jobs_name ON vision_board_jobs(name);
