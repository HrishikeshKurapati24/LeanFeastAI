import { configureStore } from '@reduxjs/toolkit';
import adminUsersReducer from './slices/adminUsersSlice';
import adminRecipesReducer from './slices/adminRecipesSlice';
import adminCommunityReducer from './slices/adminCommunitySlice';
import adminAnalyticsReducer from './slices/adminAnalyticsSlice';
import userProfileReducer from './slices/userProfileSlice';
import savedMealsReducer from './slices/savedMealsSlice';
import likedMealsReducer from './slices/likedMealsSlice';
import recentMealsReducer from './slices/recentMealsSlice';
import communityReducer from './slices/communitySlice';

export const store = configureStore({
    reducer: {
        adminUsers: adminUsersReducer,
        adminRecipes: adminRecipesReducer,
        adminCommunity: adminCommunityReducer,
        adminAnalytics: adminAnalyticsReducer,
        userProfile: userProfileReducer,
        savedMeals: savedMealsReducer,
        likedMeals: likedMealsReducer,
        recentMeals: recentMealsReducer,
        community: communityReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

