-- Migration: Create new RPC function rpc_get_community_recipes_v2 with is_ai_generated field
-- This creates a new function that includes the is_ai_generated field in recipe JSON
-- The existing rpc_get_community_recipes function remains unchanged for backward compatibility

-- Create the new function with is_ai_generated included
CREATE OR REPLACE FUNCTION rpc_get_community_recipes_v2(params jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_page INTEGER := COALESCE((params->>'page')::INTEGER, 1);
    v_limit INTEGER := COALESCE((params->>'limit')::INTEGER, 20);
    v_sort TEXT := COALESCE(params->>'sort', 'newest');
    v_tags TEXT[] := CASE 
        WHEN params->'tags' IS NOT NULL AND jsonb_typeof(params->'tags') = 'array' 
        THEN ARRAY(SELECT jsonb_array_elements_text(params->'tags'))
        ELSE NULL
    END;
    v_search TEXT := COALESCE(params->>'search', '');
    v_user_id UUID := CASE 
        WHEN params->>'user_id' IS NOT NULL AND params->>'user_id' != '' 
        THEN (params->>'user_id')::UUID
        ELSE NULL
    END;
    
    v_offset INTEGER;
    v_recipe_ids UUID[];
    v_recipe_data RECORD;
    v_recipes jsonb := '[]'::jsonb;
    v_recipe_json jsonb;
    v_total INTEGER := 0;
    v_has_more BOOLEAN := false;
    v_profile_data RECORD;
    v_posted_by_json jsonb;
    v_comments_count INTEGER;
BEGIN
    -- Validate and clamp limit
    v_limit := LEAST(GREATEST(v_limit, 1), 100);
    v_page := GREATEST(v_page, 1);
    v_offset := (v_page - 1) * v_limit;
    
    -- Step 1: Get community records and recipe_ids
    IF v_user_id IS NOT NULL THEN
        SELECT ARRAY_AGG(recipe_id) INTO v_recipe_ids
        FROM community
        WHERE posted_by = v_user_id;
    ELSE
        SELECT ARRAY_AGG(recipe_id) INTO v_recipe_ids
        FROM community;
    END IF;
    
    IF v_recipe_ids IS NULL OR array_length(v_recipe_ids, 1) IS NULL THEN
        RETURN jsonb_build_object(
            'recipes', '[]'::jsonb,
            'page', v_page,
            'limit', v_limit,
            'total', 0,
            'has_more', false
        );
    END IF;
    
    -- Step 2: Get recipes and community data with is_ai_generated
    FOR v_recipe_data IN
        SELECT 
            r.id,
            r.title,
            r.description,
            r.image_url,
            r.tags,
            r.prep_time,
            r.cook_time,
            r.serving_size,
            r.nutrition,
            r.ingredients,
            r.steps,
            r.is_public,
            r.created_at,
            r.is_ai_generated,  -- Include is_ai_generated field
            c.likes,
            c.views,
            c.shares,
            c.comments,
            c.is_featured,
            c.posted_by
        FROM recipes r
        INNER JOIN community c ON r.id = c.recipe_id
        WHERE r.id = ANY(v_recipe_ids)
          AND r.is_public = true
        ORDER BY r.created_at DESC
    LOOP
        -- Filter by tags if provided
        IF v_tags IS NOT NULL AND array_length(v_tags, 1) > 0 THEN
            IF NOT (v_recipe_data.tags && v_tags) THEN
                CONTINUE;
            END IF;
        END IF;
        
        -- Filter by search if provided
        IF v_search != '' THEN
            IF NOT (
                LOWER(v_recipe_data.title) LIKE '%' || LOWER(v_search) || '%' OR
                LOWER(v_recipe_data.description) LIKE '%' || LOWER(v_search) || '%' OR
                EXISTS (
                    SELECT 1 FROM unnest(v_recipe_data.tags) AS tag
                    WHERE LOWER(tag) LIKE '%' || LOWER(v_search) || '%'
                )
            ) THEN
                CONTINUE;
            END IF;
        END IF;
        
        -- Get profile data for posted_by
        v_posted_by_json := NULL;
        IF v_recipe_data.posted_by IS NOT NULL THEN
            SELECT user_id, full_name, avatar_url INTO v_profile_data
            FROM profiles
            WHERE user_id = v_recipe_data.posted_by
            LIMIT 1;
            
            IF v_profile_data IS NOT NULL THEN
                v_posted_by_json := jsonb_build_object(
                    'id', v_profile_data.user_id,
                    'name', COALESCE(v_profile_data.full_name, 'Unknown'),
                    'avatar', v_profile_data.avatar_url
                );
            END IF;
        END IF;
        
        -- Calculate comments count
        v_comments_count := 0;
        IF v_recipe_data.comments IS NOT NULL AND jsonb_typeof(v_recipe_data.comments) = 'array' THEN
            v_comments_count := jsonb_array_length(v_recipe_data.comments);
        END IF;
        
        -- Build recipe JSON with is_ai_generated included
        v_recipe_json := jsonb_build_object(
            'id', v_recipe_data.id,
            'title', v_recipe_data.title,
            'description', COALESCE(v_recipe_data.description, ''),
            'image_url', v_recipe_data.image_url,
            'tags', COALESCE(v_recipe_data.tags, ARRAY[]::TEXT[]),
            'prep_time', v_recipe_data.prep_time,
            'cook_time', v_recipe_data.cook_time,
            'serving_size', v_recipe_data.serving_size,
            'nutrition', COALESCE(v_recipe_data.nutrition, '{}'::jsonb),
            'ingredients', COALESCE(v_recipe_data.ingredients, '[]'::jsonb),
            'steps', COALESCE(v_recipe_data.steps, '[]'::jsonb),
            'is_public', COALESCE(v_recipe_data.is_public, false),
            'created_at', v_recipe_data.created_at,
            'likes', COALESCE(v_recipe_data.likes, 0),
            'views', COALESCE(v_recipe_data.views, 0),
            'shares', COALESCE(v_recipe_data.shares, 0),
            'comments_count', v_comments_count,
            'featured', COALESCE(v_recipe_data.is_featured, false),
            'is_ai_generated', COALESCE(v_recipe_data.is_ai_generated, false),  -- Include is_ai_generated
            'posted_by', v_posted_by_json
        );
        
        v_recipes := v_recipes || jsonb_build_array(v_recipe_json);
    END LOOP;
    
    -- Step 3: Apply sorting (simplified - full sorting handled in Python fallback)
    -- For now, we'll keep the order from the query (created_at DESC)
    
    -- Step 4: Apply pagination
    v_total := jsonb_array_length(v_recipes);
    v_has_more := (v_offset + v_limit) < v_total;
    
    -- Extract paginated recipes
    v_recipes := (
        SELECT jsonb_agg(elem)
        FROM (
            SELECT elem
            FROM jsonb_array_elements(v_recipes) AS elem
            ORDER BY (elem->>'created_at') DESC
            LIMIT v_limit OFFSET v_offset
        ) AS paginated
    );
    
    IF v_recipes IS NULL THEN
        v_recipes := '[]'::jsonb;
    END IF;
    
    -- Return result
    RETURN jsonb_build_object(
        'recipes', v_recipes,
        'page', v_page,
        'limit', v_limit,
        'total', v_total,
        'has_more', v_has_more
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION rpc_get_community_recipes_v2(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_community_recipes_v2(jsonb) TO anon;
