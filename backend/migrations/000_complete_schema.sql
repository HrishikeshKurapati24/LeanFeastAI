-- Complete Database Schema Migration
-- This file creates all tables, indexes, triggers, and RLS policies for LeanFeastAI
-- Note: auth.users table is managed by Supabase Auth and already exists
-- Run this file to recreate all tables at once

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- TABLES
-- ============================================================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    bio TEXT,
    dietary_preferences TEXT[] DEFAULT '{}',
    taste_preferences TEXT[] DEFAULT '{}',
    goals TEXT[] DEFAULT '{}',
    allergies TEXT[] DEFAULT '{}',
    saved_recipes JSONB DEFAULT '[]'::jsonb,
    liked_recipes JSONB DEFAULT '[]'::jsonb,
    role VARCHAR(50) DEFAULT 'user',
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_profile UNIQUE(user_id)
);

-- Create recipes table (needed for other tables)
CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    meal_type TEXT,
    serving_size INTEGER,
    ingredients JSONB DEFAULT '[]'::jsonb,
    steps JSONB DEFAULT '[]'::jsonb,
    nutrition JSONB DEFAULT '{}'::jsonb,
    tags TEXT[] DEFAULT '{}',
    prep_time INTEGER,
    cook_time INTEGER,
    ai_context JSONB DEFAULT '{}'::jsonb,
    is_public BOOLEAN DEFAULT false,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics_user_activity table (recipe_id FK added later)
CREATE TABLE IF NOT EXISTS analytics_user_activity (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    recipe_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    device_type TEXT,
    session_id TEXT,
    location TEXT,
    referrer TEXT
);

-- Create community table
CREATE TABLE IF NOT EXISTS community (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    posted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    likes INTEGER DEFAULT 0,
    comments JSONB DEFAULT '[]'::jsonb,
    views INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    role_level TEXT,
    permissions JSONB DEFAULT '{}'::jsonb,
    assigned_sections TEXT[] DEFAULT '{}',
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics_recipe_performance table
CREATE TABLE IF NOT EXISTS analytics_recipe_performance (
    id BIGSERIAL PRIMARY KEY,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    average_rating NUMERIC(3,2),
    comments_count INTEGER DEFAULT 0,
    ai_generated BOOLEAN DEFAULT false,
    ai_model_used TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    feedback_text TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Add foreign key constraint to analytics_user_activity.recipe_id (after recipes table exists)
ALTER TABLE analytics_user_activity 
ADD CONSTRAINT fk_analytics_recipe_id 
FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Indexes for profiles table
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- Indexes for recipes table
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_meal_type ON recipes(meal_type);
CREATE INDEX IF NOT EXISTS idx_recipes_is_public ON recipes(is_public);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at);
CREATE INDEX IF NOT EXISTS idx_recipes_tags ON recipes USING GIN(tags);

-- Indexes for analytics_user_activity table
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_recipe_id ON analytics_user_activity(recipe_id);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_user_activity(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_action_type ON analytics_user_activity(action_type);
CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON analytics_user_activity(session_id);

-- Indexes for community table
CREATE INDEX IF NOT EXISTS idx_community_recipe_id ON community(recipe_id);
CREATE INDEX IF NOT EXISTS idx_community_posted_by ON community(posted_by);
CREATE INDEX IF NOT EXISTS idx_community_is_featured ON community(is_featured);
CREATE INDEX IF NOT EXISTS idx_community_created_at ON community(created_at);
CREATE INDEX IF NOT EXISTS idx_community_likes ON community(likes DESC);

-- Indexes for admin_users table
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role_level ON admin_users(role_level);

-- Indexes for analytics_recipe_performance table
CREATE INDEX IF NOT EXISTS idx_analytics_recipe_performance_recipe_id ON analytics_recipe_performance(recipe_id);
CREATE INDEX IF NOT EXISTS idx_analytics_recipe_performance_created_at ON analytics_recipe_performance(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_recipe_performance_ai_generated ON analytics_recipe_performance(ai_generated);

-- Indexes for feedback table
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_recipe_id ON feedback(recipe_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback(rating);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to automatically update updated_at for profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at for recipes
CREATE TRIGGER update_recipes_updated_at
    BEFORE UPDATE ON recipes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at for community
CREATE TRIGGER update_community_updated_at
    BEFORE UPDATE ON community
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at for admin_users
CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at for analytics_recipe_performance
CREATE TRIGGER update_analytics_recipe_performance_updated_at
    BEFORE UPDATE ON analytics_recipe_performance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Enable RLS for analytics_user_activity
ALTER TABLE analytics_user_activity ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own activity logs
CREATE POLICY "Users can view own activity"
    ON analytics_user_activity FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own activity logs
CREATE POLICY "Users can insert own activity"
    ON analytics_user_activity FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Enable RLS for recipes
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own recipes
CREATE POLICY "Users can view own recipes"
    ON recipes FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can view public recipes
CREATE POLICY "Users can view public recipes"
    ON recipes FOR SELECT
    USING (is_public = true);

-- Policy: Users can insert their own recipes
CREATE POLICY "Users can insert own recipes"
    ON recipes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own recipes
CREATE POLICY "Users can update own recipes"
    ON recipes FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own recipes
CREATE POLICY "Users can delete own recipes"
    ON recipes FOR DELETE
    USING (auth.uid() = user_id);

-- Enable RLS for community
ALTER TABLE community ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all community posts
CREATE POLICY "Users can view community posts"
    ON community FOR SELECT
    USING (true);

-- Policy: Users can insert their own community posts
CREATE POLICY "Users can insert own community posts"
    ON community FOR INSERT
    WITH CHECK (auth.uid() = posted_by);

-- Policy: Users can update their own community posts
CREATE POLICY "Users can update own community posts"
    ON community FOR UPDATE
    USING (auth.uid() = posted_by);

-- Policy: Users can delete their own community posts
CREATE POLICY "Users can delete own community posts"
    ON community FOR DELETE
    USING (auth.uid() = posted_by);

-- Enable RLS for admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Policy: Admin users can view all admin users
CREATE POLICY "Admin users can view admin users"
    ON admin_users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE id = auth.uid()
        )
    );

-- Policy: Only service role can insert/update/delete admin users
-- Note: This should be handled by backend service role, not RLS
-- RLS policies for admin_users are restrictive by default

-- Enable RLS for analytics_recipe_performance
ALTER TABLE analytics_recipe_performance ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view analytics for recipes they own
CREATE POLICY "Users can view own recipe analytics"
    ON analytics_recipe_performance FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = analytics_recipe_performance.recipe_id
            AND recipes.user_id = auth.uid()
        )
    );

-- Policy: System can insert analytics (handled by backend service role)
-- Note: Insert/update should be done via backend with service role

-- Enable RLS for feedback
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all feedback
CREATE POLICY "Users can view feedback"
    ON feedback FOR SELECT
    USING (true);

-- Policy: Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
    ON feedback FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own feedback
CREATE POLICY "Users can update own feedback"
    ON feedback FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own feedback
CREATE POLICY "Users can delete own feedback"
    ON feedback FOR DELETE
    USING (auth.uid() = user_id);

