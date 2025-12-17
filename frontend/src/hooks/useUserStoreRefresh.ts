import { useEffect, useRef } from 'react';
import { useAppDispatch } from '../store/hooks';
import { fetchProfile, fetchSavedMeals, fetchLikedMeals, fetchCommunity } from '../store/thunks/userThunks';
import { useAuth } from '../contexts/AuthContext';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Hook for background refresh of user store data on app focus
 * Refreshes profile, savedMeals page 1, likedMeals page 1, and community page 1
 * Only refreshes if data is stale (older than STALE_TIME)
 */
export const useUserStoreRefresh = () => {
    const dispatch = useAppDispatch();
    const { user } = useAuth();
    const lastRefreshRef = useRef<number>(Date.now());

    useEffect(() => {
        if (!user?.id) return;

        const handleFocus = () => {
            const now = Date.now();
            const timeSinceLastRefresh = now - lastRefreshRef.current;

            // Only refresh if data is stale
            if (timeSinceLastRefresh >= STALE_TIME) {
                // Refresh in background (non-blocking)
                Promise.all([
                    dispatch(fetchProfile(user.id)),
                    dispatch(fetchSavedMeals({ userId: user.id, page: 1 })),
                    dispatch(fetchLikedMeals({ userId: user.id, page: 1 })),
                    dispatch(fetchCommunity({ page: 1, sort: 'newest' })),
                ]).catch((error) => {
                    console.error('Background refresh failed:', error);
                });

                lastRefreshRef.current = now;
            }
        };

        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, [user?.id, dispatch]);
};

