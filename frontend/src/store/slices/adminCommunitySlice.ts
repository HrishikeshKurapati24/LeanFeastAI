import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { fetchAllCommunity, fetchCommunityAnalytics } from '../thunks/adminThunks';
import type { CommunityRecipe, CommunityAnalytics } from '../types';

// Re-export types for convenience
export type { CommunityRecipe, CommunityAnalytics };

interface AdminCommunityState {
    recipes: CommunityRecipe[];
    analytics: CommunityAnalytics | null;
    loading: {
        recipes: boolean;
        analytics: boolean;
    };
    error: string | null;
}

const initialState: AdminCommunityState = {
    recipes: [],
    analytics: null,
    loading: {
        recipes: false,
        analytics: false,
    },
    error: null,
};

const adminCommunitySlice = createSlice({
    name: 'adminCommunity',
    initialState,
    reducers: {
        setRecipesLoading: (state, action: PayloadAction<boolean>) => {
            state.loading.recipes = action.payload;
        },
        setAnalyticsLoading: (state, action: PayloadAction<boolean>) => {
            state.loading.analytics = action.payload;
        },
        setRecipes: (state, action: PayloadAction<CommunityRecipe[]>) => {
            state.recipes = action.payload;
            state.loading.recipes = false;
            state.error = null;
        },
        setAnalytics: (state, action: PayloadAction<CommunityAnalytics>) => {
            state.analytics = action.payload;
            state.loading.analytics = false;
            state.error = null;
        },
        addRecipe: (state, action: PayloadAction<CommunityRecipe>) => {
            const exists = state.recipes.some(r => r.recipe_id === action.payload.recipe_id);
            if (!exists) {
                state.recipes.unshift(action.payload);
                if (state.analytics) {
                    state.analytics = {
                        ...state.analytics,
                        total_community_recipes: (state.analytics.total_community_recipes || 0) + 1,
                        featured_count: state.analytics.featured_count + (action.payload.is_featured ? 1 : 0),
                        total_likes: state.analytics.total_likes + (action.payload.likes || 0),
                        total_views: state.analytics.total_views + (action.payload.views || 0),
                        total_shares: state.analytics.total_shares + (action.payload.shares || 0),
                        total_comments: state.analytics.total_comments + (action.payload.comments_count || 0),
                    };
                }
            }
        },
        updateRecipe: (state, action: PayloadAction<Partial<CommunityRecipe> & { recipe_id: string }>) => {
            const index = state.recipes.findIndex(r => r.recipe_id === action.payload.recipe_id);
            if (index !== -1) {
                const prev = state.recipes[index];
                const next = { ...state.recipes[index], ...action.payload };
                state.recipes[index] = next;

                if (state.analytics) {
                    // Adjust aggregates for featured toggle and counters deltas
                    const delta = (key: keyof CommunityRecipe) =>
                        ((next[key] as number | undefined) || 0) - ((prev[key] as number | undefined) || 0);

                    const featuredDelta =
                        (prev.is_featured ? 1 : 0) === (next.is_featured ? 1 : 0)
                            ? 0
                            : (next.is_featured ? 1 : 0) - (prev.is_featured ? 1 : 0);

                    state.analytics = {
                        ...state.analytics,
                        featured_count: state.analytics.featured_count + featuredDelta,
                        total_likes: state.analytics.total_likes + delta('likes'),
                        total_views: state.analytics.total_views + delta('views'),
                        total_shares: state.analytics.total_shares + delta('shares'),
                        total_comments: state.analytics.total_comments + delta('comments_count'),
                    };
                }
            }
        },
        removeRecipe: (state, action: PayloadAction<string>) => {
            const toRemove = state.recipes.find(r => r.recipe_id === action.payload);
            state.recipes = state.recipes.filter(r => r.recipe_id !== action.payload);
            if (toRemove && state.analytics) {
                state.analytics = {
                    ...state.analytics,
                    total_community_recipes: Math.max(0, (state.analytics.total_community_recipes || 0) - 1),
                    featured_count: Math.max(0, state.analytics.featured_count - (toRemove.is_featured ? 1 : 0)),
                    total_likes: Math.max(0, state.analytics.total_likes - (toRemove.likes || 0)),
                    total_views: Math.max(0, state.analytics.total_views - (toRemove.views || 0)),
                    total_shares: Math.max(0, state.analytics.total_shares - (toRemove.shares || 0)),
                    total_comments: Math.max(0, state.analytics.total_comments - (toRemove.comments_count || 0)),
                };
            }
        },
        updateAnalytics: (state, action: PayloadAction<Partial<CommunityAnalytics>>) => {
            if (state.analytics) {
                state.analytics = { ...state.analytics, ...action.payload };
            }
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
            state.loading.recipes = false;
            state.loading.analytics = false;
        },
        resetState: () => initialState,
    },
    extraReducers: (builder) => {
        // Fetch all community recipes
        builder
            .addCase(fetchAllCommunity.pending, (state) => {
                state.loading.recipes = true;
                state.error = null;
            })
            .addCase(fetchAllCommunity.fulfilled, (state, action) => {
                state.recipes = action.payload;
                state.loading.recipes = false;
                state.error = null;
            })
            .addCase(fetchAllCommunity.rejected, (state, action) => {
                state.loading.recipes = false;
                state.error = action.payload as string;
            });

        // Fetch community analytics
        builder
            .addCase(fetchCommunityAnalytics.pending, (state) => {
                state.loading.analytics = true;
                state.error = null;
            })
            .addCase(fetchCommunityAnalytics.fulfilled, (state, action) => {
                state.analytics = action.payload;
                state.loading.analytics = false;
                state.error = null;
            })
            .addCase(fetchCommunityAnalytics.rejected, (state, action) => {
                state.loading.analytics = false;
                state.error = action.payload as string;
            });
    },
});

export const {
    setRecipesLoading,
    setAnalyticsLoading,
    setRecipes,
    setAnalytics,
    addRecipe,
    updateRecipe,
    removeRecipe,
    updateAnalytics,
    setError,
    resetState: resetCommunityState,
} = adminCommunitySlice.actions;

export default adminCommunitySlice.reducer;

