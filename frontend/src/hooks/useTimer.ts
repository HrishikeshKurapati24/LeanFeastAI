/**
 * Timer Hook
 * Manually controlled timer that starts only on user command
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseTimerOptions {
    initialSeconds?: number;
    onComplete?: () => void;
    onTick?: (remainingSeconds: number) => void;
}

export interface UseTimerReturn {
    remainingSeconds: number;
    isRunning: boolean;
    isPaused: boolean;
    start: (seconds?: number) => void;
    pause: () => void;
    resume: () => void;
    reset: () => void;
    setTime: (seconds: number) => void;
}

export const useTimer = (options: UseTimerOptions = {}): UseTimerReturn => {
    const { initialSeconds = 0, onComplete, onTick } = options;
    const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const pausedTimeRef = useRef<number>(0);
    const totalDurationRef = useRef<number>(initialSeconds); // Track total duration
    const onCompleteRef = useRef(onComplete);
    const onTickRef = useRef(onTick);

    // Update refs when callbacks change
    useEffect(() => {
        onCompleteRef.current = onComplete;
        onTickRef.current = onTick;
    }, [onComplete, onTick]);

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    // Timer tick using performance.now() for accuracy
    useEffect(() => {
        if (isRunning && !isPaused) {
            intervalRef.current = setInterval(() => {
                if (startTimeRef.current) {
                    // Calculate elapsed time from start
                    const elapsed = (performance.now() - startTimeRef.current) / 1000;
                    // Calculate remaining time from total duration
                    const newRemaining = Math.max(0, totalDurationRef.current - elapsed);

                    setRemainingSeconds(Math.floor(newRemaining));

                    if (onTickRef.current) {
                        onTickRef.current(Math.floor(newRemaining));
                    }

                    if (newRemaining <= 0) {
                        // Clear interval first
                        if (intervalRef.current) {
                            clearInterval(intervalRef.current);
                            intervalRef.current = null;
                        }
                        // Then update state
                        setIsRunning(false);
                        setRemainingSeconds(0);
                        // Finally call onComplete
                        if (onCompleteRef.current) {
                            onCompleteRef.current();
                        }
                    }
                }
            }, 100); // Update every 100ms for smooth display
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isRunning, isPaused]);

    const start = useCallback((seconds?: number) => {
        const duration = seconds !== undefined ? seconds : remainingSeconds;
        totalDurationRef.current = duration; // Store total duration
        setRemainingSeconds(duration);
        setIsRunning(true);
        setIsPaused(false);
        startTimeRef.current = performance.now();
        pausedTimeRef.current = 0;
    }, [remainingSeconds]);

    const pause = useCallback(() => {
        if (isRunning && !isPaused) {
            setIsPaused(true);
            // Calculate remaining time and store it
            if (startTimeRef.current) {
                const elapsed = (performance.now() - startTimeRef.current) / 1000;
                pausedTimeRef.current = Math.max(0, totalDurationRef.current - elapsed);
                setRemainingSeconds(Math.floor(pausedTimeRef.current));
            }
        }
    }, [isRunning, isPaused]);

    const resume = useCallback(() => {
        if (isRunning && isPaused) {
            setIsPaused(false);
            // Update total duration to remaining time and restart timer
            totalDurationRef.current = pausedTimeRef.current;
            startTimeRef.current = performance.now();
        }
    }, [isRunning, isPaused]);

    const reset = useCallback(() => {
        setIsRunning(false);
        setIsPaused(false);
        setRemainingSeconds(initialSeconds);
        totalDurationRef.current = initialSeconds;
        startTimeRef.current = null;
        pausedTimeRef.current = 0;
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, [initialSeconds]);

    const setTime = useCallback((seconds: number) => {
        totalDurationRef.current = seconds;
        setRemainingSeconds(seconds);
        if (isRunning) {
            startTimeRef.current = performance.now();
        }
    }, [isRunning]);

    return {
        remainingSeconds,
        isRunning,
        isPaused,
        start,
        pause,
        resume,
        reset,
        setTime,
    };
};

/**
 * Format seconds to MM:SS
 */
export const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};