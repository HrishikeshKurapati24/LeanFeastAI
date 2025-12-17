-- Migration: Add 'progress' to allowed action_type values in user_recipe_actions table
-- This allows the Feast Guide progress tracking feature to work

-- Drop the existing check constraint
ALTER TABLE user_recipe_actions 
DROP CONSTRAINT IF EXISTS user_recipe_actions_action_type_check;

-- Add the new check constraint with 'progress' included
ALTER TABLE user_recipe_actions
ADD CONSTRAINT user_recipe_actions_action_type_check 
CHECK (action_type IN (
    'step-by-step',
    'optimize_recipe',
    'like',
    'save',
    'view',
    'create',
    'share',
    'comment',
    'unlike',
    'unsave',
    'progress'
));

