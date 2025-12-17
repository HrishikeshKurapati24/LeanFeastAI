import { createSlice, createEntityAdapter, type PayloadAction } from '@reduxjs/toolkit';
import type { UserRecipe } from '../../types/profileTypes';

const savedMealsAdapter = createEntityAdapter<UserRecipe>({
    selectId: (recipe) => recipe.id,
    sortComparer: (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
});

interface SavedMealsState {
    entities: ReturnType<typeof savedMealsAdapter.getInitialState>['entities'];
    ids: string[];
    meta: {
        currentPage: number;
        pageSize: number;
        hasMore: boolean;
        loaded: boolean;
        isLoading: boolean;
        error: string | null;
    };
}

const initialState: SavedMealsState = {
    entities: savedMealsAdapter.getInitialState().entities,
    ids: savedMealsAdapter.getInitialState().ids,
    meta: {
        currentPage: 0,
        pageSize: 20,
        hasMore: false,
        loaded: false,
        isLoading: false,
        error: null,
    },
};

const savedMealsSlice = createSlice({
    name: 'savedMeals',
    initialState,
    reducers: {
        setSavedMeals: (state, action: PayloadAction<{ recipes: UserRecipe[]; page: number; hasMore: boolean }>) => {
            savedMealsAdapter.setAll(state, action.payload.recipes);
            state.meta.currentPage = action.payload.page;
            state.meta.hasMore = action.payload.hasMore;
            state.meta.loaded = true;
            state.meta.isLoading = false;
            state.meta.error = null;
        },
        appendSavedMeals: (state, action: PayloadAction<{ recipes: UserRecipe[]; page: number; hasMore: boolean }>) => {
            savedMealsAdapter.addMany(state, action.payload.recipes);
            state.meta.currentPage = action.payload.page;
            state.meta.hasMore = action.payload.hasMore;
            state.meta.isLoading = false;
            state.meta.error = null;
        },
        addSavedMeal: (state, action: PayloadAction<UserRecipe>) => {
            savedMealsAdapter.addOne(state, action.payload);
        },
        removeSavedMeal: (state, action: PayloadAction<string>) => {
            savedMealsAdapter.removeOne(state, action.payload);
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.meta.isLoading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.meta.error = action.payload;
            state.meta.isLoading = false;
        },
        clearSavedMeals: (state) => {
            savedMealsAdapter.removeAll(state);
            state.meta = initialState.meta;
        },
    },
});

export const {
    setSavedMeals,
    appendSavedMeals,
    addSavedMeal,
    removeSavedMeal,
    setLoading,
    setError,
    clearSavedMeals,
} = savedMealsSlice.actions;
export default savedMealsSlice.reducer;

