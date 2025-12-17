// API functions for community hub - Backend integration

import { supabase } from '../config/supabaseClient';

const getBackendUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getAuthToken = async (): Promise<string> => {
    const session = await supabase.auth.getSession();
    if (!session.data.session?.access_token) {
        throw new Error('Not authenticated. Please log in.');
    }
    return session.data.session.access_token;
};

export interface CommunityRecipe {
    id: string;
    title: string;
    description: string;
    image_url: string | null;
    tags: string[];
    prep_time: number | null;
    cook_time: number | null;
    serving_size: number | null;
    nutrition: Record<string, any>;
    ingredients: any[];
    steps: any[];
    is_public: boolean;
    created_at: string;
    likes: number;
    views: number;
    shares: number;
    comments_count: number;
    featured: boolean;
    is_ai_generated?: boolean;
    posted_by: {
        id: string;
        name: string;
        avatar: string | null;
    } | null;
}

export interface CommunityRecipesResponse {
    recipes: CommunityRecipe[];
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
}

/**
 * Fetch community recipes with pagination, filtering, and sorting
 */
export const fetchCommunityRecipes = async (
    page: number = 1,
    limit: number = 20,
    sort: 'newest' | 'trending' | 'popular' = 'newest',
    tags?: string[],
    search?: string
): Promise<CommunityRecipesResponse> => {
    try {
        const token = await getAuthToken();
        const backendUrl = getBackendUrl();

        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            sort: sort,
        });

        if (tags && tags.length > 0) {
            params.append('tags', tags.join(','));
        }

        if (search && search.trim()) {
            params.append('search', search.trim());
        }

        const response = await fetch(`${backendUrl}/api/recipes/community?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(errorData.detail || `Failed to fetch recipes: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching community recipes:', error);
        throw error;
    }
};

/**
 * Fetch user's posted recipes
 */
export const fetchUserPostedRecipes = async (
    userId: string,
    page: number = 1,
    limit: number = 20,
    sort: 'newest' | 'trending' | 'popular' = 'newest'
): Promise<CommunityRecipesResponse> => {
    try {
        const token = await getAuthToken();
        const backendUrl = getBackendUrl();

        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            sort: sort,
        });

        const response = await fetch(`${backendUrl}/api/recipes/community/user/${userId}?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(errorData.detail || `Failed to fetch user recipes: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching user posted recipes:', error);
        throw error;
    }
};

/**
 * Delete recipe from community hub (soft delete)
 */
export const deleteRecipeFromCommunity = async (recipeId: string): Promise<void> => {
    try {
        const token = await getAuthToken();
        const backendUrl = getBackendUrl();

        const response = await fetch(`${backendUrl}/api/recipes/community/${recipeId}/delete`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(errorData.detail || `Failed to delete recipe: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error deleting recipe from community:', error);
        throw error;
    }
};