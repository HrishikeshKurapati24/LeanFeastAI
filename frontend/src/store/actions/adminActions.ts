/**
 * Combined actions for clearing all admin data
 * Used on logout to ensure clean state
 */
import type { AppDispatch } from '../index';
import { resetUsersState } from '../slices/adminUsersSlice';
import { resetRecipesState } from '../slices/adminRecipesSlice';
import { resetCommunityState } from '../slices/adminCommunitySlice';
import { resetAnalyticsState } from '../slices/adminAnalyticsSlice';

/**
 * Clear all admin data from Redux store
 * Should be called on logout to prevent data leakage between admin sessions
 */
export const clearAllAdminData = () => {
    return (dispatch: AppDispatch) => {
        dispatch(resetUsersState());
        dispatch(resetRecipesState());
        dispatch(resetCommunityState());
        dispatch(resetAnalyticsState());
    };
};

