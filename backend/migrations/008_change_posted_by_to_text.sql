-- Migration: Change posted_by column from UUID to TEXT to support soft-delete prefix
-- This allows prepending 'deleted_' to the user ID for soft-delete functionality

-- Step 1: Drop RLS policies that depend on posted_by column
-- These policies need to be recreated after the column type change
DROP POLICY IF EXISTS "Users can insert own community posts" ON community;
DROP POLICY IF EXISTS "Users can update own community posts" ON community;
DROP POLICY IF EXISTS "Users can delete own community posts" ON community;

-- Step 2: Drop the foreign key constraint
ALTER TABLE community DROP CONSTRAINT IF EXISTS community_posted_by_fkey;

-- Step 3: Change the column type from UUID to TEXT
-- Convert existing UUID values to text format
ALTER TABLE community ALTER COLUMN posted_by TYPE TEXT USING posted_by::text;

-- Step 4: Update the index to work with TEXT
DROP INDEX IF EXISTS idx_community_posted_by;
CREATE INDEX IF NOT EXISTS idx_community_posted_by ON community(posted_by);

-- Step 5: Recreate RLS policies with TEXT comparison
-- Note: auth.uid() returns UUID, so we cast it to TEXT for comparison with posted_by
-- Also exclude soft-deleted records (where posted_by starts with 'deleted_')

-- Policy: Users can insert their own community posts
CREATE POLICY "Users can insert own community posts"
    ON community FOR INSERT
    WITH CHECK (auth.uid()::text = posted_by);

-- Policy: Users can update their own community posts (only non-deleted ones)
CREATE POLICY "Users can update own community posts"
    ON community FOR UPDATE
    USING (auth.uid()::text = posted_by AND posted_by NOT LIKE 'deleted_%');

-- Policy: Users can delete their own community posts (only non-deleted ones)
CREATE POLICY "Users can delete own community posts"
    ON community FOR DELETE
    USING (auth.uid()::text = posted_by AND posted_by NOT LIKE 'deleted_%');

-- Note: The "Users can view community posts" policy doesn't need to be recreated
-- as it uses USING (true) and doesn't depend on posted_by column