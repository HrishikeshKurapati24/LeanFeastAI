import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { usePageVisibility } from './usePageVisibility';

type PageType = 'users' | 'recipes' | 'community';

interface UseAdminPollingOptions<T> {
    interval?: number; // Default: 10000ms (10 seconds)
    enabled?: boolean; // Default: true
    onUpdate?: (oldData: T | null, newData: T) => void;
}

/**
 * Custom hook for page-specific polling with route and visibility detection
 * 
 * @param pageType - The page type to poll for ('users', 'recipes', 'community')
 * @param fetchFn - Function that fetches the data
 * @param updateFn - Function that updates the data in context/state
 * @param options - Polling options
 */
export function useAdminPolling<T>(
    pageType: PageType,
    fetchFn: () => Promise<T>,
    updateFn: (data: T) => void,
    options: UseAdminPollingOptions<T> = {}
) {
    const location = useLocation();
    const isVisible = usePageVisibility();
    const { interval = 10000, enabled = true, onUpdate } = options;

    // Determine if current route matches the page type
    const isActivePage = (() => {
        const pathname = location.pathname;
        switch (pageType) {
            case 'users':
                return pathname === '/admin/users';
            case 'recipes':
                return pathname === '/admin/recipes';
            case 'community':
                return pathname === '/admin/community';
            default:
                return false;
        }
    })();

    // Store current data reference for comparison
    const currentDataRef = useRef<T | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Only poll if:
        // 1. Page is active (route matches)
        // 2. Tab is visible
        // 3. Polling is enabled
        if (!isActivePage || !isVisible || !enabled) {
            // Clear interval if conditions not met
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Initial fetch
        const performFetch = async () => {
            try {
                const newData = await fetchFn();
                const oldData = currentDataRef.current;

                if (onUpdate) {
                    // Use custom update handler for incremental updates
                    onUpdate(oldData, newData);
                } else {
                    // Direct update
                    updateFn(newData);
                }

                // Update ref with new data
                currentDataRef.current = newData;
            } catch (error) {
                console.error(`Polling error for ${pageType}:`, error);
                // Don't break polling on error - continue polling
            }
        };

        // Perform initial fetch immediately
        performFetch();

        // Set up polling interval
        intervalRef.current = setInterval(performFetch, interval);

        // Cleanup on unmount or when conditions change
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isActivePage, isVisible, enabled, interval, pageType, fetchFn, updateFn, onUpdate]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);
}

