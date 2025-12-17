import { createSlice, createEntityAdapter, type PayloadAction, type EntityState } from '@reduxjs/toolkit';
import type { UserRecipe } from '../../types/profileTypes';

const recentMealsAdapter = createEntityAdapter<UserRecipe, string>({
    selectId: (recipe) => recipe.id,
    sortComparer: (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
});

interface RecentMealsMeta {
    currentPage: number;
    pageSize: number;
    hasMore: boolean;
    loaded: boolean;
    isLoading: boolean;
    error: string | null;
}

interface RecentMealsState extends EntityState<UserRecipe, string> {
    meta: RecentMealsMeta;
}

const initialState: RecentMealsState = recentMealsAdapter.getInitialState({
    meta: {
        currentPage: 0,
        pageSize: 20,
        hasMore: false,
        loaded: false,
        isLoading: false,
        error: null,
    },
});

const recentMealsSlice = createSlice({
    name: 'recentMeals',
    initialState,
    reducers: {
        setRecentMeals: (state, action: PayloadAction<{ recipes: UserRecipe[]; page: number; hasMore: boolean }>) => {
            recentMealsAdapter.setAll(state, action.payload.recipes);
            state.meta.currentPage = action.payload.page;
            state.meta.hasMore = action.payload.hasMore;
            state.meta.loaded = true;
            state.meta.isLoading = false;
            state.meta.error = null;
        },
        appendRecentMeals: (state, action: PayloadAction<{ recipes: UserRecipe[]; page: number; hasMore: boolean }>) => {
            recentMealsAdapter.addMany(state, action.payload.recipes);
            state.meta.currentPage = action.payload.page;
            state.meta.hasMore = action.payload.hasMore;
            state.meta.isLoading = false;
            state.meta.error = null;
        },
        addRecentMeal: (state, action: PayloadAction<UserRecipe>) => {
            // Add to beginning if not already present
            if (!state.ids.includes(action.payload.id)) {
                recentMealsAdapter.addOne(state, action.payload);
                // Keep only most recent items (limit to first 50)
                if (state.ids.length > 50) {
                    const toRemove = state.ids.slice(50);
                    recentMealsAdapter.removeMany(state, toRemove);
                }
            }
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.meta.isLoading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.meta.error = action.payload;
            state.meta.isLoading = false;
        },
        clearRecentMeals: (state) => {
            recentMealsAdapter.removeAll(state);
            state.meta = initialState.meta;
        },
    },
});

export const {
    setRecentMeals,
    appendRecentMeals,
    addRecentMeal,
    setLoading,
    setError,
    clearRecentMeals,
} = recentMealsSlice.actions;
export default recentMealsSlice.reducer;


