import { useEffect, useRef } from 'react';
import { useAppDispatch } from '../store/hooks';
import { initializeUserStore } from '../store/thunks/userThunks';
import { clearProfile } from '../store/slices/userProfileSlice';
import { clearSavedMeals } from '../store/slices/savedMealsSlice';
import { clearLikedMeals } from '../store/slices/likedMealsSlice';
import { clearRecentMeals } from '../store/slices/recentMealsSlice';
import { clearCommunity } from '../store/slices/communitySlice';

/**
 * Hook to initialize user store on login and clear on logout
 * Triggers initializeUserStore() when user logs in
 * Clears all user data when user logs out
 */
export const useUserStoreInitialization = (userId: string | null, isAuthenticated: boolean) => {
    const dispatch = useAppDispatch();
    const initializedRef = useRef<string | null>(null);

    useEffect(() => {
        if (isAuthenticated && userId && userId !== initializedRef.current) {
            // User logged in - initialize store in background (non-blocking)
            initializedRef.current = userId;
            dispatch(initializeUserStore(userId)).catch((error) => {
                console.error('Failed to initialize user store:', error);
            });
        } else if (!isAuthenticated && initializedRef.current) {
            // User logged out - clear all user data
            initializedRef.current = null;
            dispatch(clearProfile());
            dispatch(clearSavedMeals());
            dispatch(clearLikedMeals());
            dispatch(clearRecentMeals());
            dispatch(clearCommunity());
        }
    }, [userId, isAuthenticated, dispatch]);
};

