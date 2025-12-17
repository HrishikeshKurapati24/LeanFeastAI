import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { fetchAllRecipes, fetchRecipeAnalytics } from '../thunks/adminThunks';
import type { Recipe, RecipeAnalytics } from '../types';

// Re-export types for convenience
export type { Recipe, RecipeAnalytics };

interface AdminRecipesState {
    recipes: Recipe[];
    analytics: RecipeAnalytics | null;
    loading: {
        recipes: boolean;
        analytics: boolean;
    };
    error: string | null;
}

const initialState: AdminRecipesState = {
    recipes: [],
    analytics: null,
    loading: {
        recipes: false,
        analytics: false,
    },
    error: null,
};

const adminRecipesSlice = createSlice({
    name: 'adminRecipes',
    initialState,
    reducers: {
        setRecipesLoading: (state, action: PayloadAction<boolean>) => {
            state.loading.recipes = action.payload;
        },
        setAnalyticsLoading: (state, action: PayloadAction<boolean>) => {
            state.loading.analytics = action.payload;
        },
        setRecipes: (state, action: PayloadAction<Recipe[]>) => {
            state.recipes = action.payload;
            state.loading.recipes = false;
            state.error = null;
        },
        setAnalytics: (state, action: PayloadAction<RecipeAnalytics>) => {
            state.analytics = action.payload;
            state.loading.analytics = false;
            state.error = null;
        },
        addRecipe: (state, action: PayloadAction<Recipe>) => {
            const exists = state.recipes.some(r => r.id === action.payload.id);
            if (!exists) {
                state.recipes.unshift(action.payload);
                // Update analytics counters optimistically when available
                if (state.analytics) {
                    state.analytics = {
                        ...state.analytics,
                        total_recipes: (state.analytics.total_recipes || 0) + 1,
                        meal_type_distribution: {
                            ...state.analytics.meal_type_distribution,
                            ...(action.payload.meal_type
                                ? {
                                    [action.payload.meal_type]: (state.analytics.meal_type_distribution?.[action.payload.meal_type] || 0) + 1,
                                }
                                : {}),
                        },
                    };
                }
            }
        },
        updateRecipe: (state, action: PayloadAction<Partial<Recipe> & { id: string }>) => {
            const index = state.recipes.findIndex(r => r.id === action.payload.id);
            if (index !== -1) {
                state.recipes[index] = { ...state.recipes[index], ...action.payload };
            }
        },
        removeRecipe: (state, action: PayloadAction<string>) => {
            const toRemove = state.recipes.find(r => r.id === action.payload);
            state.recipes = state.recipes.filter(r => r.id !== action.payload);
            if (toRemove && state.analytics) {
                const mt = toRemove.meal_type;
                const currentDist = state.analytics.meal_type_distribution || {};
                const nextCount = Math.max(0, (currentDist[mt] || 0) - 1);
                const nextDist = { ...currentDist };
                if (mt) {
                    nextDist[mt] = nextCount;
                }
                state.analytics = {
                    ...state.analytics,
                    total_recipes: Math.max(0, (state.analytics.total_recipes || 0) - 1),
                    meal_type_distribution: nextDist,
                };
            }
        },
        updateAnalytics: (state, action: PayloadAction<Partial<RecipeAnalytics>>) => {
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
        // Fetch all recipes
        builder
            .addCase(fetchAllRecipes.pending, (state) => {
                state.loading.recipes = true;
                state.error = null;
            })
            .addCase(fetchAllRecipes.fulfilled, (state, action) => {
                state.recipes = action.payload;
                state.loading.recipes = false;
                state.error = null;
            })
            .addCase(fetchAllRecipes.rejected, (state, action) => {
                state.loading.recipes = false;
                state.error = action.payload as string;
            });

        // Fetch recipe analytics
        builder
            .addCase(fetchRecipeAnalytics.pending, (state) => {
                state.loading.analytics = true;
                state.error = null;
            })
            .addCase(fetchRecipeAnalytics.fulfilled, (state, action) => {
                state.analytics = action.payload;
                state.loading.analytics = false;
                state.error = null;
            })
            .addCase(fetchRecipeAnalytics.rejected, (state, action) => {
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
    resetState: resetRecipesState,
} = adminRecipesSlice.actions;

export default adminRecipesSlice.reducer;

