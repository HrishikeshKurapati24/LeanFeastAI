import { createAsyncThunk } from '@reduxjs/toolkit';
import type { AppDispatch, RootState } from '../index';
import { fetchUserProfile, fetchUserRecipes } from '../../utils/profileApi';
import { fetchCommunityRecipes } from '../../utils/communityApi';
import type { Profile } from '../../types/profileTypes';
import type { CommunityRecipe } from '../../utils/communityApi';
import {
    setProfile,
    updateProfile,
    setLoading as setProfileLoading,
    setError as setProfileError,
} from '../slices/userProfileSlice';
import {
    setSavedMeals,
    appendSavedMeals,
    setLoading as setSavedMealsLoading,
    setError as setSavedMealsError,
} from '../slices/savedMealsSlice';
import {
    setLikedMeals,
    appendLikedMeals,
    setLoading as setLikedMealsLoading,
    setError as setLikedMealsError,
} from '../slices/likedMealsSlice';
import {
    setRecentMeals,
    appendRecentMeals,
    setLoading as setRecentMealsLoading,
    setError as setRecentMealsError,
} from '../slices/recentMealsSlice';
import {
    setCommunityRecipes,
    appendCommunityRecipes,
    setLoading as setCommunityLoading,
    setError as setCommunityError,
} from '../slices/communitySlice';
import { addSavedMeal, removeSavedMeal } from '../slices/savedMealsSlice';
import { addLikedMeal, removeLikedMeal } from '../slices/likedMealsSlice';

const getBackendUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getAuthToken = async (): Promise<string> => {
    const { supabase } = await import('../../config/supabaseClient');
    const session = await supabase.auth.getSession();
    if (!session.data.session?.access_token) {
        throw new Error('Not authenticated. Please log in.');
    }
    return session.data.session.access_token;
};


/**
 * Fetch user profile
 */
export const fetchProfile = createAsyncThunk<
    Profile,
    string,
    { dispatch: AppDispatch; rejectValue: string }
>('userProfile/fetchProfile', async (userId: string, { dispatch, rejectWithValue }) => {
    try {
        dispatch(setProfileLoading(true));
        const profile = await fetchUserProfile(userId);
        dispatch(setProfile(profile));
        return profile;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch profile';
        dispatch(setProfileError(errorMessage));
        return rejectWithValue(errorMessage);
    }
});

/**
 * Fetch saved meals (recipes) for a user
 * Loads recipe data for IDs in profile.saved_recipes
 */
export const fetchSavedMeals = createAsyncThunk<
    { recipes: any[]; page: number; hasMore: boolean },
    { userId: string; page?: number },
    { dispatch: AppDispatch; state: RootState; rejectValue: string }
>('savedMeals/fetchSavedMeals', async ({ userId, page = 1 }, { dispatch, getState, rejectWithValue }) => {
    try {
        dispatch(setSavedMealsLoading(true));

        // Get profile to get saved recipe IDs
        const state = getState();
        let profile = state.userProfile.entities[userId];

        if (!profile) {
            // Fetch profile first if not available
            const profileData = await fetchUserProfile(userId);
            profile = profileData;
            dispatch(setProfile(profileData));
        }

        const savedRecipeIds = profile?.saved_recipes || [];

        if (savedRecipeIds.length === 0) {
            dispatch(setSavedMeals({ recipes: [], page, hasMore: false }));
            return { recipes: [], page, hasMore: false };
        }

        // Fetch recipe data for saved IDs
        const pageSize = 20;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const pageIds = savedRecipeIds.slice(startIndex, endIndex);

        if (pageIds.length === 0) {
            dispatch(setSavedMeals({ recipes: [], page, hasMore: false }));
            return { recipes: [], page, hasMore: false };
        }

        // Fetch recipes by IDs
        const token = await getAuthToken();
        const backendUrl = getBackendUrl();

        const invalidRecipeIds: string[] = [];
        const recipePromises = pageIds.map(async (recipeId: string) => {
            try {
                const response = await fetch(`${backendUrl}/api/recipes/${recipeId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    // Recipe not found (404) - recipe may have been deleted
                    if (response.status === 404) {
                        invalidRecipeIds.push(recipeId);
                    }
                    return null;
                }

                const result = await response.json();
                return result.recipe;
            } catch {
                return null;
            }
        });

        const recipes = (await Promise.all(recipePromises)).filter((r) => r !== null);

        // Clean up invalid recipe IDs in background (non-blocking)
        if (invalidRecipeIds.length > 0) {
            fetch(`${backendUrl}/api/users/${userId}/recipes/cleanup-invalid`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipe_ids: invalidRecipeIds,
                    list_type: 'saved',
                }),
            }).catch(() => {
                // Silently ignore cleanup errors
            });
        }

        const hasMore = endIndex < savedRecipeIds.length;

        if (page === 1) {
            dispatch(setSavedMeals({ recipes, page, hasMore }));
        } else {
            dispatch(appendSavedMeals({ recipes, page, hasMore }));
        }

        return { recipes, page, hasMore };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch saved meals';
        dispatch(setSavedMealsError(errorMessage));
        return rejectWithValue(errorMessage);
    }
});

/**
 * Fetch liked meals (recipes) for a user
 * Loads recipe data for IDs in profile.liked_recipes
 */
export const fetchLikedMeals = createAsyncThunk<
    { recipes: any[]; page: number; hasMore: boolean },
    { userId: string; page?: number },
    { dispatch: AppDispatch; state: RootState; rejectValue: string }
>('likedMeals/fetchLikedMeals', async ({ userId, page = 1 }, { dispatch, getState, rejectWithValue }) => {
    try {
        dispatch(setLikedMealsLoading(true));

        // Get profile to get liked recipe IDs
        const state = getState();
        let profile = state.userProfile.entities[userId];

        if (!profile) {
            // Fetch profile first if not available
            const profileData = await fetchUserProfile(userId);
            profile = profileData;
            dispatch(setProfile(profileData));
        }

        const likedRecipeIds = profile?.liked_recipes || [];

        if (likedRecipeIds.length === 0) {
            dispatch(setLikedMeals({ recipes: [], page, hasMore: false }));
            return { recipes: [], page, hasMore: false };
        }

        // Fetch recipe data for liked IDs
        const pageSize = 20;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const pageIds = likedRecipeIds.slice(startIndex, endIndex);

        if (pageIds.length === 0) {
            dispatch(setLikedMeals({ recipes: [], page, hasMore: false }));
            return { recipes: [], page, hasMore: false };
        }

        // Fetch recipes by IDs
        const token = await getAuthToken();
        const backendUrl = getBackendUrl();

        const invalidRecipeIds: string[] = [];
        const recipePromises = pageIds.map(async (recipeId: string) => {
            try {
                const response = await fetch(`${backendUrl}/api/recipes/${recipeId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    // Recipe not found (404) - recipe may have been deleted
                    if (response.status === 404) {
                        invalidRecipeIds.push(recipeId);
                    }
                    return null;
                }

                const result = await response.json();
                return result.recipe;
            } catch {
                return null;
            }
        });

        const recipes = (await Promise.all(recipePromises)).filter((r) => r !== null);

        // Clean up invalid recipe IDs in background (non-blocking)
        if (invalidRecipeIds.length > 0) {
            fetch(`${backendUrl}/api/users/${userId}/recipes/cleanup-invalid`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipe_ids: invalidRecipeIds,
                    list_type: 'liked',
                }),
            }).catch(() => {
                // Silently ignore cleanup errors
            });
        }

        const hasMore = endIndex < likedRecipeIds.length;

        if (page === 1) {
            dispatch(setLikedMeals({ recipes, page, hasMore }));
        } else {
            dispatch(appendLikedMeals({ recipes, page, hasMore }));
        }

        return { recipes, page, hasMore };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch liked meals';
        dispatch(setLikedMealsError(errorMessage));
        return rejectWithValue(errorMessage);
    }
});

/**
 * Fetch recent meals (recently cooked recipes)
 * Fetches from /api/users/:id/recent-meals backend route
 */
export const fetchRecentMeals = createAsyncThunk<
    { recipes: any[]; page: number; hasMore: boolean },
    { userId: string; page?: number },
    { dispatch: AppDispatch; rejectValue: string }
>('recentMeals/fetchRecentMeals', async ({ userId, page = 1 }, { dispatch, rejectWithValue }) => {
    try {
        dispatch(setRecentMealsLoading(true));

        // Fetch recent meals from backend API
        const token = await getAuthToken();
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/api/users/${userId}/recent-meals`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(errorData.detail || `Failed to fetch recent meals: ${response.statusText}`);
        }

        const recipes = await response.json();

        // Backend returns up to 5 recipes, so we don't need pagination
        // But we'll still support the page parameter for consistency
        const pageSize = 20;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const pageRecipes = Array.isArray(recipes) ? recipes.slice(startIndex, endIndex) : [];
        const hasMore = Array.isArray(recipes) && endIndex < recipes.length;

        if (page === 1) {
            dispatch(setRecentMeals({ recipes: pageRecipes, page, hasMore }));
        } else {
            dispatch(appendRecentMeals({ recipes: pageRecipes, page, hasMore }));
        }

        return { recipes: pageRecipes, page, hasMore };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch recent meals';
        dispatch(setRecentMealsError(errorMessage));
        return rejectWithValue(errorMessage);
    }
});

/**
 * Fetch community recipes
 */
export const fetchCommunity = createAsyncThunk<
    { recipes: CommunityRecipe[]; page: number; hasMore: boolean },
    { page?: number; sort?: 'newest' | 'trending' | 'popular'; filters?: { tags?: string[]; search?: string } },
    { dispatch: AppDispatch; state: RootState; rejectValue: string }
>('community/fetchCommunity', async ({ page = 1, sort = 'newest', filters = {} }, { dispatch, getState, rejectWithValue }) => {
    try {
        dispatch(setCommunityLoading(true));

        const response = await fetchCommunityRecipes(page, 20, sort, filters.tags, filters.search);

        if (page === 1) {
            dispatch(setCommunityRecipes({ recipes: response.recipes, page: response.page, hasMore: response.has_more, sort, filters }));
        } else {
            dispatch(appendCommunityRecipes({ recipes: response.recipes, page: response.page, hasMore: response.has_more }));
        }

        return { recipes: response.recipes, page: response.page, hasMore: response.has_more };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch community recipes';
        dispatch(setCommunityError(errorMessage));
        return rejectWithValue(errorMessage);
    }
});

/**
 * Initialize user store - fetches all data in parallel
 * Preloads community pages 1 and 2
 */
export const initializeUserStore = createAsyncThunk<
    void,
    string,
    { dispatch: AppDispatch; rejectValue: string }
>('userStore/initialize', async (userId: string, { dispatch, rejectWithValue }) => {
    try {
        // Fetch all data in parallel (non-blocking)
        await Promise.all([
            dispatch(fetchProfile(userId)),
            dispatch(fetchSavedMeals({ userId, page: 1 })),
            dispatch(fetchLikedMeals({ userId, page: 1 })),
            dispatch(fetchRecentMeals({ userId, page: 1 })),
            dispatch(fetchCommunity({ page: 1, sort: 'newest' })),
            dispatch(fetchCommunity({ page: 2, sort: 'newest' })),
        ]);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize user store';
        return rejectWithValue(errorMessage);
    }
});

/**
 * Optimistic update: Save recipe
 */
export const saveRecipeOptimistic = createAsyncThunk<
    void,
    { userId: string; recipeId: string; recipe: any },
    { dispatch: AppDispatch; state: RootState; rejectValue: string }
>('savedMeals/saveOptimistic', async ({ userId, recipeId, recipe }, { dispatch, getState, rejectWithValue }) => {
    try {
        // Optimistically add to saved meals
        dispatch(addSavedMeal(recipe));

        // Update profile's saved_recipes array
        const state = getState();
        const profile = state.userProfile.entities[userId];
        if (profile) {
            const updatedSavedRecipes = [...(profile.saved_recipes || []), recipeId];
            dispatch(updateProfile({ user_id: userId, saved_recipes: updatedSavedRecipes }));
        }

        // Send API request
        const token = await getAuthToken();
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/api/users/${userId}/recipes/${recipeId}/save`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to save recipe');
        }
    } catch (error) {
        // Rollback optimistic update
        dispatch(removeSavedMeal(recipeId));
        const state = getState();
        const profile = state.userProfile.entities[userId];
        if (profile) {
            const updatedSavedRecipes = (profile.saved_recipes || []).filter((id: string) => id !== recipeId);
            dispatch(updateProfile({ user_id: userId, saved_recipes: updatedSavedRecipes }));
        }

        const errorMessage = error instanceof Error ? error.message : 'Failed to save recipe';
        alert(`Failed to save recipe: ${errorMessage}`);
        return rejectWithValue(errorMessage);
    }
});

/**
 * Optimistic update: Unsave recipe
 */
export const unsaveRecipeOptimistic = createAsyncThunk<
    void,
    { userId: string; recipeId: string },
    { dispatch: AppDispatch; state: RootState; rejectValue: string }
>('savedMeals/unsaveOptimistic', async ({ userId, recipeId }, { dispatch, getState, rejectWithValue }) => {
    try {
        // Store original state for rollback
        const state = getState();
        const recipe = state.savedMeals.entities[recipeId];
        const profile = state.userProfile.entities[userId];
        const originalSavedRecipes = profile?.saved_recipes || [];

        // Optimistically remove from saved meals
        dispatch(removeSavedMeal(recipeId));

        // Update profile's saved_recipes array
        if (profile) {
            const updatedSavedRecipes = originalSavedRecipes.filter((id: string) => id !== recipeId);
            dispatch(updateProfile({ user_id: userId, saved_recipes: updatedSavedRecipes }));
        }

        // Send API request
        const token = await getAuthToken();
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/api/users/${userId}/recipes/${recipeId}/unsave`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to unsave recipe');
        }
    } catch (error) {
        // Rollback optimistic update
        const state = getState();
        const recipe = state.savedMeals.entities[recipeId];
        if (recipe) {
            dispatch(addSavedMeal(recipe));
        }
        const profile = state.userProfile.entities[userId];
        if (profile) {
            const updatedSavedRecipes = [...(profile.saved_recipes || []), recipeId];
            dispatch(updateProfile({ user_id: userId, saved_recipes: updatedSavedRecipes }));
        }

        const errorMessage = error instanceof Error ? error.message : 'Failed to unsave recipe';
        alert(`Failed to unsave recipe: ${errorMessage}`);
        return rejectWithValue(errorMessage);
    }
});

/**
 * Optimistic update: Like recipe
 */
export const likeRecipeOptimistic = createAsyncThunk<
    void,
    { userId: string; recipeId: string; recipe: any },
    { dispatch: AppDispatch; state: RootState; rejectValue: string }
>('likedMeals/likeOptimistic', async ({ userId, recipeId, recipe }, { dispatch, getState, rejectWithValue }) => {
    try {
        // Optimistically add to liked meals
        dispatch(addLikedMeal(recipe));

        // Update profile's liked_recipes array
        const state = getState();
        const profile = state.userProfile.entities[userId];
        if (profile) {
            const updatedLikedRecipes = [...(profile.liked_recipes || []), recipeId];
            dispatch(updateProfile({ user_id: userId, liked_recipes: updatedLikedRecipes }));
        }

        // Send API request
        const token = await getAuthToken();
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/api/recipes/${recipeId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to like recipe');
        }
    } catch (error) {
        // Rollback optimistic update
        dispatch(removeLikedMeal(recipeId));
        const state = getState();
        const profile = state.userProfile.entities[userId];
        if (profile) {
            const updatedLikedRecipes = (profile.liked_recipes || []).filter((id: string) => id !== recipeId);
            dispatch(updateProfile({ user_id: userId, liked_recipes: updatedLikedRecipes }));
        }

        const errorMessage = error instanceof Error ? error.message : 'Failed to like recipe';
        alert(`Failed to like recipe: ${errorMessage}`);
        return rejectWithValue(errorMessage);
    }
});

/**
 * Optimistic update: Unlike recipe
 */
export const unlikeRecipeOptimistic = createAsyncThunk<
    void,
    { userId: string; recipeId: string },
    { dispatch: AppDispatch; state: RootState; rejectValue: string }
>('likedMeals/unlikeOptimistic', async ({ userId, recipeId }, { dispatch, getState, rejectWithValue }) => {
    try {
        // Store original state for rollback
        const state = getState();
        const recipe = state.likedMeals.entities[recipeId];
        const profile = state.userProfile.entities[userId];
        const originalLikedRecipes = profile?.liked_recipes || [];

        // Optimistically remove from liked meals
        dispatch(removeLikedMeal(recipeId));

        // Update profile's liked_recipes array
        if (profile) {
            const updatedLikedRecipes = originalLikedRecipes.filter((id: string) => id !== recipeId);
            dispatch(updateProfile({ user_id: userId, liked_recipes: updatedLikedRecipes }));
        }

        // Send API request
        const token = await getAuthToken();
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/api/recipes/${recipeId}/unlike`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to unlike recipe');
        }
    } catch (error) {
        // Rollback optimistic update
        const state = getState();
        const recipe = state.likedMeals.entities[recipeId];
        if (recipe) {
            dispatch(addLikedMeal(recipe));
        }
        const profile = state.userProfile.entities[userId];
        if (profile) {
            const updatedLikedRecipes = [...(profile.liked_recipes || []), recipeId];
            dispatch(updateProfile({ user_id: userId, liked_recipes: updatedLikedRecipes }));
        }

        const errorMessage = error instanceof Error ? error.message : 'Failed to unlike recipe';
        alert(`Failed to unlike recipe: ${errorMessage}`);
        return rejectWithValue(errorMessage);
    }
});

