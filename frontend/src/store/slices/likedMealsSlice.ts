import { createSlice, createEntityAdapter, type PayloadAction, type EntityState } from '@reduxjs/toolkit';
import type { UserRecipe } from '../../types/profileTypes';

const likedMealsAdapter = createEntityAdapter<UserRecipe, string>({
    selectId: (recipe) => recipe.id,
    sortComparer: (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
});

interface LikedMealsMeta {
    currentPage: number;
    pageSize: number;
    hasMore: boolean;
    loaded: boolean;
    isLoading: boolean;
    error: string | null;
}

interface LikedMealsState extends EntityState<UserRecipe, string> {
    meta: LikedMealsMeta;
}

const initialState: LikedMealsState = likedMealsAdapter.getInitialState({
    meta: {
        currentPage: 0,
        pageSize: 20,
        hasMore: false,
        loaded: false,
        isLoading: false,
        error: null,
    },
});

const likedMealsSlice = createSlice({
    name: 'likedMeals',
    initialState,
    reducers: {
        setLikedMeals: (state, action: PayloadAction<{ recipes: UserRecipe[]; page: number; hasMore: boolean }>) => {
            likedMealsAdapter.setAll(state, action.payload.recipes);
            state.meta.currentPage = action.payload.page;
            state.meta.hasMore = action.payload.hasMore;
            state.meta.loaded = true;
            state.meta.isLoading = false;
            state.meta.error = null;
        },
        appendLikedMeals: (state, action: PayloadAction<{ recipes: UserRecipe[]; page: number; hasMore: boolean }>) => {
            likedMealsAdapter.addMany(state, action.payload.recipes);
            state.meta.currentPage = action.payload.page;
            state.meta.hasMore = action.payload.hasMore;
            state.meta.isLoading = false;
            state.meta.error = null;
        },
        addLikedMeal: (state, action: PayloadAction<UserRecipe>) => {
            likedMealsAdapter.addOne(state, action.payload);
        },
        removeLikedMeal: (state, action: PayloadAction<string>) => {
            likedMealsAdapter.removeOne(state, action.payload);
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.meta.isLoading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.meta.error = action.payload;
            state.meta.isLoading = false;
        },
        clearLikedMeals: (state) => {
            likedMealsAdapter.removeAll(state);
            state.meta = initialState.meta;
        },
    },
});

export const {
    setLikedMeals,
    appendLikedMeals,
    addLikedMeal,
    removeLikedMeal,
    setLoading,
    setError,
    clearLikedMeals,
} = likedMealsSlice.actions;
export default likedMealsSlice.reducer;


