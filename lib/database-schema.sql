-- Supabase Database Schema for Rank Vision Board
-- This schema is optional and only needed if you want to:
-- 1. Save vision boards for users to access later
-- 2. Enable sharing vision boards via links
-- 3. Store user accounts/sessions

-- For MVP, you can use localStorage instead of a database

-- Vision Boards Table
CREATE TABLE IF NOT EXISTS vision_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Optional: Add user_id if you implement authentication
  -- user_id UUID REFERENCES auth.users(id),
  
  -- Store goals as JSON array
  goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Store the generated image URL or base64
  image_url TEXT,
  
  -- Optional: Public sharing
  is_public BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE,
  
  -- Optional: Expiration for shared boards
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Index for share tokens
CREATE INDEX IF NOT EXISTS idx_vision_boards_share_token ON vision_boards(share_token);

-- Index for user lookup (if you add user_id)
-- CREATE INDEX IF NOT EXISTS idx_vision_boards_user_id ON vision_boards(user_id);

-- Enable Row Level Security (RLS) if needed
-- ALTER TABLE vision_boards ENABLE ROW LEVEL SECURITY;

-- Example policy (adjust based on your needs):
-- CREATE POLICY "Users can view their own vision boards"
--   ON vision_boards FOR SELECT
--   USING (auth.uid() = user_id);

-- CREATE POLICY "Anyone can view public vision boards"
--   ON vision_boards FOR SELECT
--   USING (is_public = true);

