import { useState, useEffect } from 'react';

/**
 * Hook to detect when the browser tab is visible or hidden
 * Returns true when tab is visible, false when hidden
 */
export function usePageVisibility(): boolean {
    const [isVisible, setIsVisible] = useState(
        () => typeof document !== 'undefined' && document.visibilityState === 'visible'
    );

    useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }

        const handleVisibilityChange = () => {
            setIsVisible(document.visibilityState === 'visible');
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    return isVisible;
}

