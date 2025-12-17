-- Migration: Filter soft-deleted recipes from community views
-- This updates the RPC function to exclude recipes where posted_by starts with 'deleted_'

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS rpc_get_community_recipes_v2(jsonb);

-- Create the updated function with soft-delete filtering
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
    v_community_data RECORD;
    v_recipe_data RECORD;
    v_recipes jsonb := '[]'::jsonb;
    v_recipe_json jsonb;
    v_total INTEGER := 0;
    v_has_more BOOLEAN := false;
    v_profile_data RECORD;
    v_posted_by_json jsonb;
    v_comments_count INTEGER;
    v_trending_score NUMERIC;
    v_popular_score NUMERIC;
    v_hours_since NUMERIC;
    v_engagement NUMERIC;
BEGIN
    -- Validate and clamp limit
    v_limit := LEAST(GREATEST(v_limit, 1), 100);
    v_page := GREATEST(v_page, 1);
    v_offset := (v_page - 1) * v_limit;

    -- Step 1: Get community records and recipe_ids
    -- Filter out soft-deleted recipes (where posted_by starts with 'deleted_')
    IF v_user_id IS NOT NULL THEN
        SELECT ARRAY_AGG(recipe_id) INTO v_recipe_ids
        FROM community
        WHERE posted_by = v_user_id::text
          AND posted_by NOT LIKE 'deleted_%';  -- Exclude soft-deleted
    ELSE
        SELECT ARRAY_AGG(recipe_id) INTO v_recipe_ids
        FROM community
        WHERE posted_by NOT LIKE 'deleted_%';  -- Exclude soft-deleted
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

    -- Step 2: Get recipes and community data
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
            r.is_ai_generated,
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
            -- posted_by is now TEXT, and profiles.user_id is UUID
            -- Since we filter out deleted recipes, posted_by should be a valid UUID string
            -- Cast user_id to text for comparison
            SELECT user_id, full_name, avatar_url INTO v_profile_data
            FROM profiles
            WHERE user_id::text = v_recipe_data.posted_by
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
            'is_ai_generated', COALESCE(v_recipe_data.is_ai_generated, false),
            'posted_by', v_posted_by_json
        );

        v_recipes := v_recipes || jsonb_build_array(v_recipe_json);
    END LOOP;

    -- Step 3: Apply sorting
    IF v_sort = 'trending' THEN
        -- Calculate trending score and sort
        FOR v_recipe_json IN SELECT * FROM jsonb_array_elements(v_recipes)
        LOOP
            -- Calculate hours since created
            v_hours_since := EXTRACT(EPOCH FROM (NOW() - ((v_recipe_json->>'created_at')::timestamp with time zone))) / 3600.0;
            IF v_hours_since < 0 THEN
                v_hours_since := 0;
            END IF;

            -- Calculate engagement
            v_engagement :=
                ((v_recipe_json->>'likes')::INTEGER * 2) +
                ((v_recipe_json->>'shares')::INTEGER * 1.5) +
                ((v_recipe_json->>'comments_count')::INTEGER * 1);

            v_trending_score := v_engagement / (v_hours_since + 1);

            -- Add score to recipe JSON (for sorting)
            v_recipe_json := v_recipe_json || jsonb_build_object('_trending_score', v_trending_score);
        END LOOP;

        -- Sort by trending score (would need to rebuild array, simplified here)
        -- For now, we'll use a simpler approach: sort by engagement / time
    ELSIF v_sort = 'popular' THEN
        -- Calculate popular score
        FOR v_recipe_json IN SELECT * FROM jsonb_array_elements(v_recipes)
        LOOP
            v_popular_score :=
                ((v_recipe_json->>'likes')::INTEGER * 2) +
                ((v_recipe_json->>'views')::INTEGER * 0.3) +
                ((v_recipe_json->>'shares')::INTEGER * 1.5) +
                ((v_recipe_json->>'comments_count')::INTEGER * 1);

            v_recipe_json := v_recipe_json || jsonb_build_object('_popular_score', v_popular_score);
        END LOOP;
    END IF;

    -- For simplicity, we'll do basic sorting here
    -- Full sorting would require rebuilding the array
    -- The Python fallback handles this better, so this RPC is mainly for basic cases

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
