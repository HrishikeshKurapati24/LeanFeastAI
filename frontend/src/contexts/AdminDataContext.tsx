import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import {
    adminUserAnalytics,
    adminRecipeAnalytics,
    adminCommunityAnalytics,
} from '../utils/adminApi';

interface User {
    id: string;
    user_id: string;
    email: string;
    full_name: string;
    role: string;
    created_at: string;
    last_login: string | null;
    email_confirmed_at?: string | null;
    recipes_count: number;
    profile: any;
}

interface Recipe {
    id: string;
    title: string;
    description: string;
    meal_type: string;
    tags: string[];
    created_at: string;
    image_url: string;
    performance?: any;
}

interface CommunityRecipe {
    recipe_id: string;
    posted_by: string;
    likes: number;
    views: number;
    shares: number;
    comments_count: number;
    is_featured: boolean;
    created_at: string;
    recipes?: {
        title: string;
        description: string;
        image_url: string;
    };
}

interface DataState<T> {
    data: T | null;
    lastFetched: number | null;
    loading: boolean;
    error: string | null;
}

interface AdminDataState {
    userAnalytics: DataState<any>;
    recipeAnalytics: DataState<any>;
    communityAnalytics: DataState<any>;
    users: DataState<User[]>;
    recipes: DataState<Recipe[]>;
    communityRecipes: DataState<CommunityRecipe[]>;
}

type AdminDataAction =
    | { type: 'SET_USER_ANALYTICS'; payload: any }
    | { type: 'SET_RECIPE_ANALYTICS'; payload: any }
    | { type: 'SET_COMMUNITY_ANALYTICS'; payload: any }
    | { type: 'SET_USERS'; payload: User[] }
    | { type: 'SET_RECIPES'; payload: Recipe[] }
    | { type: 'SET_COMMUNITY_RECIPES'; payload: CommunityRecipe[] }
    | { type: 'SET_LOADING'; payload: { key: string; loading: boolean } }
    | { type: 'SET_ERROR'; payload: { key: string; error: string | null } }
    | { type: 'CLEAR_ALL' };

const initialState: AdminDataState = {
    userAnalytics: { data: null, lastFetched: null, loading: false, error: null },
    recipeAnalytics: { data: null, lastFetched: null, loading: false, error: null },
    communityAnalytics: { data: null, lastFetched: null, loading: false, error: null },
    users: { data: null, lastFetched: null, loading: false, error: null },
    recipes: { data: null, lastFetched: null, loading: false, error: null },
    communityRecipes: { data: null, lastFetched: null, loading: false, error: null },
};

function adminDataReducer(state: AdminDataState, action: AdminDataAction): AdminDataState {
    switch (action.type) {
        case 'SET_USER_ANALYTICS':
            return {
                ...state,
                userAnalytics: {
                    data: action.payload,
                    lastFetched: Date.now(),
                    loading: false,
                    error: null,
                },
            };
        case 'SET_RECIPE_ANALYTICS':
            return {
                ...state,
                recipeAnalytics: {
                    data: action.payload,
                    lastFetched: Date.now(),
                    loading: false,
                    error: null,
                },
            };
        case 'SET_COMMUNITY_ANALYTICS':
            return {
                ...state,
                communityAnalytics: {
                    data: action.payload,
                    lastFetched: Date.now(),
                    loading: false,
                    error: null,
                },
            };
        case 'SET_USERS':
            return {
                ...state,
                users: {
                    data: action.payload,
                    lastFetched: Date.now(),
                    loading: false,
                    error: null,
                },
            };
        case 'SET_RECIPES':
            return {
                ...state,
                recipes: {
                    data: action.payload,
                    lastFetched: Date.now(),
                    loading: false,
                    error: null,
                },
            };
        case 'SET_COMMUNITY_RECIPES':
            return {
                ...state,
                communityRecipes: {
                    data: action.payload,
                    lastFetched: Date.now(),
                    loading: false,
                    error: null,
                },
            };
        case 'SET_LOADING':
            const loadingKey = action.payload.key as keyof AdminDataState;
            return {
                ...state,
                [loadingKey]: {
                    ...state[loadingKey],
                    loading: action.payload.loading,
                },
            };
        case 'SET_ERROR':
            const errorKey = action.payload.key as keyof AdminDataState;
            return {
                ...state,
                [errorKey]: {
                    ...state[errorKey],
                    error: action.payload.error,
                    loading: false,
                },
            };
        case 'CLEAR_ALL':
            return initialState;
        default:
            return state;
    }
}

interface AdminDataContextType {
    // State
    userAnalytics: DataState<any>;
    recipeAnalytics: DataState<any>;
    communityAnalytics: DataState<any>;
    users: DataState<User[]>;
    recipes: DataState<Recipe[]>;
    communityRecipes: DataState<CommunityRecipe[]>;

    // Actions
    prefetchAllAnalytics: () => Promise<void>;
    updateUserAnalytics: (data: any) => void;
    updateRecipeAnalytics: (data: any) => void;
    updateCommunityAnalytics: (data: any) => void;
    updateUsers: (data: User[]) => void;
    updateRecipes: (data: Recipe[]) => void;
    updateCommunityRecipes: (data: CommunityRecipe[]) => void;
    clearAllData: () => void;
}

const AdminDataContext = createContext<AdminDataContextType | undefined>(undefined);

export function AdminDataProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(adminDataReducer, initialState);

    const prefetchAllAnalytics = useCallback(async () => {
        // Set loading states
        dispatch({ type: 'SET_LOADING', payload: { key: 'userAnalytics', loading: true } });
        dispatch({ type: 'SET_LOADING', payload: { key: 'recipeAnalytics', loading: true } });
        dispatch({ type: 'SET_LOADING', payload: { key: 'communityAnalytics', loading: true } });

        try {
            // Fetch all analytics in parallel
            const [userAnalytics, recipeAnalytics, communityAnalytics] = await Promise.allSettled([
                adminUserAnalytics({}),
                adminRecipeAnalytics({}),
                adminCommunityAnalytics({}),
            ]);

            // Update state for each analytics result
            if (userAnalytics.status === 'fulfilled') {
                dispatch({ type: 'SET_USER_ANALYTICS', payload: userAnalytics.value });
            } else {
                dispatch({
                    type: 'SET_ERROR',
                    payload: { key: 'userAnalytics', error: userAnalytics.reason?.message || 'Failed to fetch user analytics' },
                });
            }

            if (recipeAnalytics.status === 'fulfilled') {
                dispatch({ type: 'SET_RECIPE_ANALYTICS', payload: recipeAnalytics.value });
            } else {
                dispatch({
                    type: 'SET_ERROR',
                    payload: { key: 'recipeAnalytics', error: recipeAnalytics.reason?.message || 'Failed to fetch recipe analytics' },
                });
            }

            if (communityAnalytics.status === 'fulfilled') {
                dispatch({ type: 'SET_COMMUNITY_ANALYTICS', payload: communityAnalytics.value });
            } else {
                dispatch({
                    type: 'SET_ERROR',
                    payload: { key: 'communityAnalytics', error: communityAnalytics.reason?.message || 'Failed to fetch community analytics' },
                });
            }
        } catch (error) {
            console.error('Error prefetching analytics:', error);
            dispatch({
                type: 'SET_ERROR',
                payload: { key: 'userAnalytics', error: 'Failed to prefetch analytics' },
            });
        }
    }, []);

    const updateUserAnalytics = useCallback((data: any) => {
        dispatch({ type: 'SET_USER_ANALYTICS', payload: data });
    }, []);

    const updateRecipeAnalytics = useCallback((data: any) => {
        dispatch({ type: 'SET_RECIPE_ANALYTICS', payload: data });
    }, []);

    const updateCommunityAnalytics = useCallback((data: any) => {
        dispatch({ type: 'SET_COMMUNITY_ANALYTICS', payload: data });
    }, []);

    const updateUsers = useCallback((data: User[]) => {
        dispatch({ type: 'SET_USERS', payload: data });
    }, []);

    const updateRecipes = useCallback((data: Recipe[]) => {
        dispatch({ type: 'SET_RECIPES', payload: data });
    }, []);

    const updateCommunityRecipes = useCallback((data: CommunityRecipe[]) => {
        dispatch({ type: 'SET_COMMUNITY_RECIPES', payload: data });
    }, []);

    const clearAllData = useCallback(() => {
        dispatch({ type: 'CLEAR_ALL' });
    }, []);

    return (
        <AdminDataContext.Provider
            value={{
                userAnalytics: state.userAnalytics,
                recipeAnalytics: state.recipeAnalytics,
                communityAnalytics: state.communityAnalytics,
                users: state.users,
                recipes: state.recipes,
                communityRecipes: state.communityRecipes,
                prefetchAllAnalytics,
                updateUserAnalytics,
                updateRecipeAnalytics,
                updateCommunityAnalytics,
                updateUsers,
                updateRecipes,
                updateCommunityRecipes,
                clearAllData,
            }}
        >
            {children}
        </AdminDataContext.Provider>
    );
}

export function useAdminData() {
    const context = useContext(AdminDataContext);
    if (context === undefined) {
        throw new Error('useAdminData must be used within an AdminDataProvider');
    }
    return context;
}

