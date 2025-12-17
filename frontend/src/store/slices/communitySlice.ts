import { createSlice, createEntityAdapter, type PayloadAction } from '@reduxjs/toolkit';
import type { CommunityRecipe } from '../../utils/communityApi';

const communityAdapter = createEntityAdapter<CommunityRecipe>({
    selectId: (recipe) => recipe.id,
    sortComparer: (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
});

interface Comment {
    id: string;
    user_id: string;
    user_name: string;
    user_avatar?: string;
    text: string;
    created_at: string;
}

interface CommunityState {
    entities: ReturnType<typeof communityAdapter.getInitialState>['entities'];
    ids: string[];
    meta: {
        currentPage: number;
        pageSize: number;
        hasMore: boolean;
        loaded: boolean;
        isLoading: boolean;
        error: string | null;
        sort: 'newest' | 'trending' | 'popular';
        filters: {
            tags?: string[];
            search?: string;
        };
    };
    comments: {
        [recipeId: string]: {
            comments: Comment[];
            page: number;
            hasMore: boolean;
            loaded: boolean;
        };
    };
}

const initialState: CommunityState = {
    entities: communityAdapter.getInitialState().entities,
    ids: communityAdapter.getInitialState().ids,
    meta: {
        currentPage: 0,
        pageSize: 20,
        hasMore: false,
        loaded: false,
        isLoading: false,
        error: null,
        sort: 'newest',
        filters: {},
    },
    comments: {},
};

const communitySlice = createSlice({
    name: 'community',
    initialState,
    reducers: {
        setCommunityRecipes: (
            state,
            action: PayloadAction<{
                recipes: CommunityRecipe[];
                page: number;
                hasMore: boolean;
                sort?: 'newest' | 'trending' | 'popular';
                filters?: { tags?: string[]; search?: string };
            }>
        ) => {
            communityAdapter.setAll(state, action.payload.recipes);
            state.meta.currentPage = action.payload.page;
            state.meta.hasMore = action.payload.hasMore;
            if (action.payload.sort) {
                state.meta.sort = action.payload.sort;
            }
            if (action.payload.filters) {
                state.meta.filters = action.payload.filters;
            }
            state.meta.loaded = true;
            state.meta.isLoading = false;
            state.meta.error = null;
        },
        appendCommunityRecipes: (
            state,
            action: PayloadAction<{
                recipes: CommunityRecipe[];
                page: number;
                hasMore: boolean;
            }>
        ) => {
            communityAdapter.addMany(state, action.payload.recipes);
            state.meta.currentPage = action.payload.page;
            state.meta.hasMore = action.payload.hasMore;
            state.meta.isLoading = false;
            state.meta.error = null;
        },
        addCommunityRecipe: (state, action: PayloadAction<CommunityRecipe>) => {
            // Add to beginning if not already present (entity adapter will sort by created_at)
            if (!state.ids.includes(action.payload.id)) {
                communityAdapter.addOne(state, action.payload);
            }
        },
        updateCommunityRecipe: (state, action: PayloadAction<Partial<CommunityRecipe> & { id: string }>) => {
            communityAdapter.updateOne(state, {
                id: action.payload.id,
                changes: action.payload,
            });
        },
        removeCommunityRecipe: (state, action: PayloadAction<string>) => {
            communityAdapter.removeOne(state, action.payload);
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.meta.isLoading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.meta.error = action.payload;
            state.meta.isLoading = false;
        },
        setSort: (state, action: PayloadAction<'newest' | 'trending' | 'popular'>) => {
            state.meta.sort = action.payload;
            // Clear recipes when sort changes to force refetch
            communityAdapter.removeAll(state);
            state.meta.loaded = false;
            state.meta.currentPage = 0;
        },
        setFilters: (state, action: PayloadAction<{ tags?: string[]; search?: string }>) => {
            state.meta.filters = action.payload;
            // Clear recipes when filters change to force refetch
            communityAdapter.removeAll(state);
            state.meta.loaded = false;
            state.meta.currentPage = 0;
        },
        clearCommunity: (state) => {
            communityAdapter.removeAll(state);
            state.meta = initialState.meta;
            state.comments = {};
        },
        setComments: (
            state,
            action: PayloadAction<{
                recipeId: string;
                comments: Comment[];
                page: number;
                hasMore: boolean;
            }>
        ) => {
            state.comments[action.payload.recipeId] = {
                comments: action.payload.comments,
                page: action.payload.page,
                hasMore: action.payload.hasMore,
                loaded: true,
            };
        },
        appendComments: (
            state,
            action: PayloadAction<{
                recipeId: string;
                comments: Comment[];
                page: number;
                hasMore: boolean;
            }>
        ) => {
            const existing = state.comments[action.payload.recipeId];
            if (existing) {
                existing.comments = [...existing.comments, ...action.payload.comments];
                existing.page = action.payload.page;
                existing.hasMore = action.payload.hasMore;
            } else {
                state.comments[action.payload.recipeId] = {
                    comments: action.payload.comments,
                    page: action.payload.page,
                    hasMore: action.payload.hasMore,
                    loaded: true,
                };
            }
        },
        addComment: (
            state,
            action: PayloadAction<{
                recipeId: string;
                comment: Comment;
            }>
        ) => {
            const existing = state.comments[action.payload.recipeId];
            if (existing) {
                existing.comments = [action.payload.comment, ...existing.comments];
            } else {
                state.comments[action.payload.recipeId] = {
                    comments: [action.payload.comment],
                    page: 1,
                    hasMore: true,
                    loaded: true,
                };
            }
        },
        clearComments: (state, action: PayloadAction<string>) => {
            delete state.comments[action.payload];
        },
    },
});

export const {
    setCommunityRecipes,
    appendCommunityRecipes,
    addCommunityRecipe,
    updateCommunityRecipe,
    removeCommunityRecipe,
    setLoading,
    setError,
    setSort,
    setFilters,
    clearCommunity,
    setComments,
    appendComments,
    addComment,
    clearComments,
} = communitySlice.actions;

export type { Comment };
export default communitySlice.reducer;

