import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { usePageVisibility } from './usePageVisibility';
import { supabase } from '../config/supabaseClient';
import { useAppDispatch } from '../store/hooks';
import {
    addUser,
    updateUser,
    removeUser,
    updateAnalytics as updateUserAnalytics,
} from '../store/slices/adminUsersSlice';
import { adminGetUser } from '../utils/adminApi';
import {
    addRecipe,
    updateRecipe,
    removeRecipe,
    updateAnalytics as updateRecipeAnalytics,
} from '../store/slices/adminRecipesSlice';
import {
    addRecipe as addCommunityRecipe,
    updateRecipe as updateCommunityRecipe,
    removeRecipe as removeCommunityRecipe,
    updateAnalytics as updateCommunityAnalytics,
} from '../store/slices/adminCommunitySlice';

type PageType = 'users' | 'recipes' | 'community';

interface UseSupabaseRealtimeOptions {
    enabled?: boolean;
}

/**
 * Custom hook for Supabase Realtime WebSocket connections
 * Connects only when the corresponding admin page is active
 * Disconnects when navigating away or when tab becomes inactive
 */
export function useSupabaseRealtime(
    pageType: PageType,
    options: UseSupabaseRealtimeOptions = {}
) {
    const location = useLocation();
    const isVisible = usePageVisibility();
    const dispatch = useAppDispatch();
    const channelRef = useRef<any>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const { enabled = true } = options;

    // Determine if current route matches the page type
    const isActivePage = useCallback(() => {
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
    }, [location.pathname, pageType]);

    // Cleanup function
    const cleanup = useCallback(() => {
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        reconnectAttemptsRef.current = 0;
    }, []);

    // Reconnect with exponential backoff
    const reconnect = useCallback(() => {
        if (reconnectAttemptsRef.current >= 5) {
            console.warn(`[Realtime] Max reconnection attempts reached for ${pageType}`);
            return;
        }

        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current++;

        reconnectTimeoutRef.current = setTimeout(() => {
            if (isActivePage() && isVisible && enabled) {
                // Reconnect will be handled by the main effect
                reconnectAttemptsRef.current = 0;
            }
        }, delay);
    }, [isActivePage, isVisible, enabled, pageType]);

    // Setup Realtime subscription
    useEffect(() => {
        // Only connect if:
        // 1. Page is active (route matches)
        // 2. Tab is visible
        // 3. Realtime is enabled
        if (!isActivePage() || !isVisible || !enabled) {
            cleanup();
            return;
        }

        // Cleanup any existing connection
        cleanup();

        try {
            let channel: any;

            switch (pageType) {
                case 'users':
                    // Subscribe to profiles table changes
                    channel = supabase
                        .channel(`admin-users-${Date.now()}`)
                        .on(
                            'postgres_changes',
                            {
                                event: '*',
                                schema: 'public',
                                table: 'profiles',
                            },
                            async (payload: any) => {
                                const eventType = payload.eventType || payload.type;
                                if (eventType === 'INSERT' && payload.new) {
                                    // For new users, fetch complete user data including email from backend
                                    try {
                                        const userData = await adminGetUser(payload.new.user_id);
                                        // Map backend response to user format (matching admin_list_users structure)
                                        const user = {
                                            id: userData.user_id || payload.new.user_id,
                                            user_id: userData.user_id || payload.new.user_id,
                                            email: userData.auth?.email || '',
                                            full_name: userData.profile?.full_name || payload.new.full_name || '',
                                            status: userData.profile?.role || payload.new.role || 'user',
                                            created_at: userData.profile?.created_at || payload.new.created_at,
                                            last_login: userData.profile?.last_login || payload.new.last_login || null,
                                            email_confirmed_at: userData.auth?.email_confirmed_at || null,
                                            recipes_count: userData.analytics?.recipes_count || 0,
                                            profile: userData.profile || payload.new,
                                        };
                                        dispatch(addUser(user));
                                    } catch (error) {
                                        console.error('[Realtime] Error fetching user data for new profile:', error);
                                        // Fallback: add user with available profile data
                                        // Note: email will be empty, but user will appear in list
                                        // The next full fetch will populate the email
                                        const user = {
                                            id: payload.new.user_id,
                                            user_id: payload.new.user_id,
                                            email: '',
                                            full_name: payload.new.full_name || '',
                                            status: payload.new.role || 'user',
                                            created_at: payload.new.created_at,
                                            last_login: payload.new.last_login || null,
                                            email_confirmed_at: null,
                                            recipes_count: 0,
                                            profile: payload.new,
                                        };
                                        dispatch(addUser(user));
                                    }
                                } else if (eventType === 'UPDATE' && payload.new) {
                                    dispatch(
                                        updateUser({
                                            user_id: payload.new.user_id,
                                            ...payload.new,
                                        })
                                    );
                                } else if (eventType === 'DELETE' && payload.old) {
                                    dispatch(removeUser(payload.old.user_id));
                                }
                            }
                        )
                        .subscribe((status: string) => {
                            if (status === 'SUBSCRIBED') {
                                reconnectAttemptsRef.current = 0;
                            } else if (status === 'CHANNEL_ERROR') {
                                console.error('[Realtime] Users subscription error');
                                reconnect();
                            }
                        });
                    break;

                case 'recipes':
                    // Subscribe to recipes table changes
                    channel = supabase
                        .channel(`admin-recipes-${Date.now()}`)
                        .on(
                            'postgres_changes',
                            {
                                event: '*',
                                schema: 'public',
                                table: 'recipes',
                            },
                            (payload: any) => {
                                const eventType = payload.eventType || payload.type;
                                if (eventType === 'INSERT' && payload.new) {
                                    dispatch(addRecipe(payload.new));
                                } else if (eventType === 'UPDATE' && payload.new) {
                                    dispatch(
                                        updateRecipe({
                                            id: payload.new.id,
                                            ...payload.new,
                                        })
                                    );
                                } else if (eventType === 'DELETE' && payload.old) {
                                    dispatch(removeRecipe(payload.old.id));
                                }
                            }
                        )
                        .subscribe((status: string) => {
                            if (status === 'SUBSCRIBED') {
                                reconnectAttemptsRef.current = 0;
                            } else if (status === 'CHANNEL_ERROR') {
                                console.error('[Realtime] Recipes subscription error');
                                reconnect();
                            }
                        });
                    break;

                case 'community':
                    // Subscribe to community table changes
                    channel = supabase
                        .channel(`admin-community-${Date.now()}`)
                        .on(
                            'postgres_changes',
                            {
                                event: '*',
                                schema: 'public',
                                table: 'community',
                            },
                            (payload: any) => {
                                const eventType = payload.eventType || payload.type;
                                if (eventType === 'INSERT' && payload.new) {
                                    dispatch(addCommunityRecipe(payload.new));
                                } else if (eventType === 'UPDATE' && payload.new) {
                                    dispatch(
                                        updateCommunityRecipe({
                                            recipe_id: payload.new.recipe_id,
                                            ...payload.new,
                                        })
                                    );
                                } else if (eventType === 'DELETE' && payload.old) {
                                    dispatch(removeCommunityRecipe(payload.old.recipe_id));
                                }
                            }
                        )
                        .subscribe((status: string) => {
                            if (status === 'SUBSCRIBED') {
                                reconnectAttemptsRef.current = 0;
                            } else if (status === 'CHANNEL_ERROR') {
                                console.error('[Realtime] Community subscription error');
                                reconnect();
                            }
                        });
                    break;
            }

            channelRef.current = channel;
        } catch (error) {
            console.error(`[Realtime] Error setting up ${pageType} subscription:`, error);
            reconnect();
        }

        // Cleanup on unmount or when conditions change
        return () => {
            cleanup();
        };
    }, [isActivePage, isVisible, enabled, pageType, dispatch, cleanup, reconnect]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);
}

