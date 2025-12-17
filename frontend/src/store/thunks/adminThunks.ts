import { createAsyncThunk } from '@reduxjs/toolkit';
import {
    adminListUsers,
    adminUserAnalytics,
    adminListRecipes,
    adminRecipeAnalytics,
    adminListCommunity,
    adminCommunityAnalytics,
} from '../../utils/adminApi';
import type { User, Recipe, CommunityRecipe } from '../types';

// ============================================================================
// USER THUNKS
// ============================================================================

export const fetchAllUsers = createAsyncThunk(
    'adminUsers/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            let allUsersData: User[] = [];
            let currentPage = 1;
            let hasMore = true;

            while (hasMore) {
                const result = await adminListUsers({
                    page: currentPage,
                    limit: 100,
                });

                if (result.users && result.users.length > 0) {
                    const usersWithId = result.users.map((user: any) => ({
                        ...user,
                        id: user.user_id,
                    }));
                    allUsersData = [...allUsersData, ...usersWithId];
                    hasMore = result.has_more || false;
                    currentPage++;
                } else {
                    hasMore = false;
                }
            }

            return allUsersData;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch users');
        }
    }
);

export const fetchUserAnalytics = createAsyncThunk(
    'adminUsers/fetchAnalytics',
    async (params: { date_from?: string; date_to?: string } = {}, { rejectWithValue }) => {
        try {
            const analytics = await adminUserAnalytics(params);
            return analytics;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch user analytics');
        }
    }
);

// ============================================================================
// RECIPE THUNKS
// ============================================================================

export const fetchAllRecipes = createAsyncThunk(
    'adminRecipes/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            let allRecipesData: Recipe[] = [];
            let currentPage = 1;
            let hasMore = true;

            while (hasMore) {
                const result = await adminListRecipes({
                    page: currentPage,
                    limit: 100,
                });

                if (result.recipes && result.recipes.length > 0) {
                    allRecipesData = [...allRecipesData, ...result.recipes];
                    hasMore = result.has_more || false;
                    currentPage++;
                } else {
                    hasMore = false;
                }
            }

            return allRecipesData;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch recipes');
        }
    }
);

export const fetchRecipeAnalytics = createAsyncThunk(
    'adminRecipes/fetchAnalytics',
    async (params: { date_from?: string; date_to?: string } = {}, { rejectWithValue }) => {
        try {
            const analytics = await adminRecipeAnalytics(params);
            return analytics;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch recipe analytics');
        }
    }
);

// ============================================================================
// COMMUNITY THUNKS
// ============================================================================

export const fetchAllCommunity = createAsyncThunk(
    'adminCommunity/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            let allRecipesData: CommunityRecipe[] = [];
            let currentPage = 1;
            let hasMore = true;

            while (hasMore) {
                const result = await adminListCommunity({
                    page: currentPage,
                    limit: 100,
                });

                if (result.recipes && result.recipes.length > 0) {
                    allRecipesData = [...allRecipesData, ...result.recipes];
                    hasMore = result.has_more || false;
                    currentPage++;
                } else {
                    hasMore = false;
                }
            }

            return allRecipesData;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch community recipes');
        }
    }
);

export const fetchCommunityAnalytics = createAsyncThunk(
    'adminCommunity/fetchAnalytics',
    async (params: { date_from?: string; date_to?: string } = {}, { rejectWithValue }) => {
        try {
            const analytics = await adminCommunityAnalytics(params);
            return analytics;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch community analytics');
        }
    }
);

