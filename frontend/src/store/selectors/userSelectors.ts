import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { createEntityAdapter } from '@reduxjs/toolkit';
import type { Profile } from '../../types/profileTypes';
import type { UserRecipe } from '../../types/profileTypes';
import type { CommunityRecipe } from '../../utils/communityApi';

// Base selectors
const selectUserProfileState = (state: RootState) => state.userProfile;
const selectSavedMealsState = (state: RootState) => state.savedMeals;
const selectLikedMealsState = (state: RootState) => state.likedMeals;
const selectRecentMealsState = (state: RootState) => state.recentMeals;
const selectCommunityState = (state: RootState) => state.community;

// Profile selectors
export const selectProfile = createSelector([selectUserProfileState], (profileState) => {
    if (profileState.ids.length === 0) {
        return null;
    }
    return profileState.entities[profileState.ids[0]] || null;
});

export const selectProfileById = (userId: string) =>
    createSelector([selectUserProfileState], (profileState) => profileState.entities[userId] || null);

export const selectProfileMeta = createSelector([selectUserProfileState], (profileState) => profileState.meta);

// Saved meals selectors
export const selectSavedMeals = createSelector([selectSavedMealsState], (savedMealsState) => {
    return savedMealsState.ids.map((id) => savedMealsState.entities[id]).filter(Boolean) as UserRecipe[];
});

export const selectSavedMealsByIds = (ids: string[]) =>
    createSelector([selectSavedMealsState], (savedMealsState) => {
        return ids
            .map((id) => savedMealsState.entities[id])
            .filter(Boolean) as UserRecipe[];
    });

export const selectSavedMealsMeta = createSelector([selectSavedMealsState], (savedMealsState) => savedMealsState.meta);

export const selectSavedMealById = (id: string) =>
    createSelector([selectSavedMealsState], (savedMealsState) => savedMealsState.entities[id] || null);

// Liked meals selectors
export const selectLikedMeals = createSelector([selectLikedMealsState], (likedMealsState) => {
    return likedMealsState.ids.map((id) => likedMealsState.entities[id]).filter(Boolean) as UserRecipe[];
});

export const selectLikedMealsByIds = (ids: string[]) =>
    createSelector([selectLikedMealsState], (likedMealsState) => {
        return ids
            .map((id) => likedMealsState.entities[id])
            .filter(Boolean) as UserRecipe[];
    });

export const selectLikedMealsMeta = createSelector([selectLikedMealsState], (likedMealsState) => likedMealsState.meta);

export const selectLikedMealById = (id: string) =>
    createSelector([selectLikedMealsState], (likedMealsState) => likedMealsState.entities[id] || null);

// Recent meals selectors
export const selectRecentMeals = createSelector([selectRecentMealsState], (recentMealsState) => {
    return recentMealsState.ids.map((id) => recentMealsState.entities[id]).filter(Boolean) as UserRecipe[];
});

export const selectRecentMealsMeta = createSelector([selectRecentMealsState], (recentMealsState) => recentMealsState.meta);

export const selectRecentMealById = (id: string) =>
    createSelector([selectRecentMealsState], (recentMealsState) => recentMealsState.entities[id] || null);

// Community selectors
export const selectCommunityRecipes = createSelector([selectCommunityState], (communityState) => {
    return communityState.ids.map((id) => communityState.entities[id]).filter(Boolean) as CommunityRecipe[];
});

export const selectCommunityMeta = createSelector([selectCommunityState], (communityState) => communityState.meta);

export const selectCommunityRecipeById = (id: string) =>
    createSelector([selectCommunityState], (communityState) => communityState.entities[id] || null);

// Combined loading/error selectors
export const selectIsLoading = createSelector(
    [selectUserProfileState, selectSavedMealsState, selectLikedMealsState, selectRecentMealsState, selectCommunityState],
    (profileState, savedMealsState, likedMealsState, recentMealsState, communityState) => {
        return (
            profileState.meta.isLoading ||
            savedMealsState.meta.isLoading ||
            likedMealsState.meta.isLoading ||
            recentMealsState.meta.isLoading ||
            communityState.meta.isLoading
        );
    }
);

export const selectHasError = createSelector(
    [selectUserProfileState, selectSavedMealsState, selectLikedMealsState, selectRecentMealsState, selectCommunityState],
    (profileState, savedMealsState, likedMealsState, recentMealsState, communityState) => {
        return {
            profile: profileState.meta.error,
            savedMeals: savedMealsState.meta.error,
            likedMeals: likedMealsState.meta.error,
            recentMeals: recentMealsState.meta.error,
            community: communityState.meta.error,
        };
    }
);

// Check if all data is loaded
export const selectIsDataLoaded = createSelector(
    [selectUserProfileState, selectSavedMealsState, selectLikedMealsState, selectRecentMealsState, selectCommunityState],
    (profileState, savedMealsState, likedMealsState, recentMealsState, communityState) => {
        return (
            profileState.meta.loaded &&
            savedMealsState.meta.loaded &&
            likedMealsState.meta.loaded &&
            recentMealsState.meta.loaded &&
            communityState.meta.loaded
        );
    }
);

