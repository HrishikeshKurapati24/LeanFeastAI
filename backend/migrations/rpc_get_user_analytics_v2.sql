-- Drop existing function if it exists
DROP FUNCTION IF EXISTS rpc_get_user_analytics_v2(uuid);

-- Create new RPC function with correct most_cooked_meal logic
CREATE OR REPLACE FUNCTION rpc_get_user_analytics_v2(p_user_id uuid)
RETURNS TABLE (
    total_recipes_created bigint,
    total_recipes_shared bigint,
    total_optimized bigint,
    avg_calories numeric,
    most_cooked_meal jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_most_cooked_recipe_id uuid;
    v_most_cooked_count bigint;
    v_most_cooked_title text;
BEGIN
    -- Count total recipes created by user
    SELECT COUNT(*) INTO total_recipes_created
    FROM recipes
    WHERE user_id = p_user_id;

    -- Count total recipes shared (in community table)
    SELECT COUNT(*) INTO total_recipes_shared
    FROM community
    WHERE posted_by = p_user_id;

    -- Count total optimized recipes
    SELECT COUNT(*) INTO total_optimized
    FROM user_recipe_actions
    WHERE user_id = p_user_id AND action_type = 'optimize_recipe';

    -- Calculate average calories from user's recipes
    SELECT COALESCE(AVG((nutrition->>'calories')::numeric), 0) INTO avg_calories
    FROM recipes
    WHERE user_id = p_user_id AND nutrition IS NOT NULL AND nutrition->>'calories' IS NOT NULL;

    -- Find most cooked meal: recipe with HIGHEST COUNT of step-by-step actions
    -- Group by recipe_id, count occurrences, order by count DESC, take first
    SELECT 
        ura.recipe_id, 
        COUNT(*) as cook_count
    INTO v_most_cooked_recipe_id, v_most_cooked_count
    FROM user_recipe_actions ura
    WHERE ura.user_id = p_user_id 
      AND ura.action_type = 'step-by-step'
      AND ura.recipe_id IS NOT NULL
    GROUP BY ura.recipe_id
    ORDER BY cook_count DESC
    LIMIT 1;

    -- Get the recipe title if we found a most cooked recipe
    IF v_most_cooked_recipe_id IS NOT NULL THEN
        SELECT title INTO v_most_cooked_title
        FROM recipes
        WHERE id = v_most_cooked_recipe_id;
        
        most_cooked_meal := jsonb_build_object(
            'id', v_most_cooked_recipe_id::text,
            'title', COALESCE(v_most_cooked_title, 'Unknown'),
            'count', v_most_cooked_count
        );
    ELSE
        most_cooked_meal := NULL;
    END IF;

    RETURN NEXT;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION rpc_get_user_analytics_v2(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_user_analytics_v2(uuid) TO service_role;
