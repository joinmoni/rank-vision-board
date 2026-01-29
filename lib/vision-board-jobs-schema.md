# Vision Board Jobs Database Schema

This document contains the SQL schema for storing vision board generation jobs in Supabase.

## Table: `vision_board_jobs`

This table stores job records for vision board image generation, tracking the status and results of each generation request.

### Schema

```sql
-- Create vision_board_jobs table
CREATE TABLE IF NOT EXISTS vision_board_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- User information
  email TEXT,
  name TEXT,
  rank_tag TEXT,  -- User's Rank tag (e.g. @aadebola), optional
  
  -- Job status: 'pending', 'processing', 'complete', 'failed'
  status VARCHAR(20) DEFAULT 'pending' NOT NULL,
  
  -- Goals data (stored as JSON array)
  goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Generated image information
  image_url TEXT,
  image_storage_path TEXT, -- Path in storage bucket if using Supabase Storage
  
  -- Error handling
  error_message TEXT,
  
  -- Job tracking
  qstash_message_id TEXT, -- Upstash QStash message ID for tracking
  
  -- Optional: For future authentication
  -- user_id UUID REFERENCES auth.users(id),
  
  -- Optional: Expiration
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Index for status lookups (for querying pending/processing jobs)
CREATE INDEX IF NOT EXISTS idx_vision_board_jobs_status ON vision_board_jobs(status);

-- Index for email lookups (for finding user's jobs)
CREATE INDEX IF NOT EXISTS idx_vision_board_jobs_email ON vision_board_jobs(email);

-- Index for QStash message ID (for tracking/debugging)
CREATE INDEX IF NOT EXISTS idx_vision_board_jobs_qstash_id ON vision_board_jobs(qstash_message_id);

-- Index for created_at (for cleanup of old jobs)
CREATE INDEX IF NOT EXISTS idx_vision_board_jobs_created_at ON vision_board_jobs(created_at);

-- Optional: Enable Row Level Security (RLS) if needed
-- ALTER TABLE vision_board_jobs ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (uncomment and adjust as needed):
-- CREATE POLICY "Users can view their own jobs"
--   ON vision_board_jobs FOR SELECT
--   USING (auth.uid() = user_id OR email = auth.jwt() ->> 'email');
--
-- CREATE POLICY "Service role can manage all jobs"
--   ON vision_board_jobs FOR ALL
--   USING (auth.role() = 'service_role');
```

## Status Values

- `pending`: Job created, waiting to be processed
- `processing`: Job is currently being processed by AWS Lambda Function
- `complete`: Image generation successful, image_url populated
- `failed`: Image generation failed, error_message populated

## Usage Notes

1. **Job Creation**: When a user submits goals, create a record with status `'pending'`
2. **Status Updates**: AWS Lambda Function updates status to `'processing'` → `'complete'` or `'failed'`
3. **Image Storage**: Store either:
   - Public URL in `image_url` (if using external storage/CDN)
   - Storage path in `image_storage_path` (if using Supabase Storage)
4. **Cleanup**: Optionally delete or archive old jobs based on `expires_at` or `created_at`

## Example Queries

```sql
-- Create a new job
INSERT INTO vision_board_jobs (email, goals, status)
VALUES ('user@example.com', '["Goal 1", "Goal 2"]'::jsonb, 'pending')
RETURNING id;

-- Update job status to processing
UPDATE vision_board_jobs
SET status = 'processing', updated_at = NOW()
WHERE id = 'job-uuid-here';

-- Update job with completed image
UPDATE vision_board_jobs
SET status = 'complete',
    image_url = 'https://storage.url/path/to/image.png',
    updated_at = NOW()
WHERE id = 'job-uuid-here';

-- Get user's completed jobs
SELECT * FROM vision_board_jobs
WHERE email = 'user@example.com'
  AND status = 'complete'
ORDER BY created_at DESC;

-- Get job by ID
SELECT * FROM vision_board_jobs WHERE id = 'job-uuid-here';
```




