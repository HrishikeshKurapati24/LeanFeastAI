// API functions for profile page - Backend integration

import { supabase } from '../config/supabaseClient';
import type { Profile, UserRecipe, UserAnalytics, UserActivity } from '../types/profileTypes';

const getBackendUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getAuthToken = async (): Promise<string> => {
    const session = await supabase.auth.getSession();
    if (!session.data.session?.access_token) {
        throw new Error('Not authenticated. Please log in.');
    }
    return session.data.session.access_token;
};

/**
 * Fetch user profile data
 */
export const fetchUserProfile = async (userId: string): Promise<Profile> => {
    try {
        const token = await getAuthToken();
        const backendUrl = getBackendUrl();

        const response = await fetch(`${backendUrl}/api/users/${userId}/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(errorData.detail || `Failed to fetch profile: ${response.statusText}`);
        }

        const profile = await response.json();
        return profile;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
};

/**
 * Fetch user's created recipes
 */
export const fetchUserRecipes = async (userId: string): Promise<UserRecipe[]> => {
    try {
        const token = await getAuthToken();
        const backendUrl = getBackendUrl();

        const response = await fetch(`${backendUrl}/api/users/${userId}/recipes`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(errorData.detail || `Failed to fetch recipes: ${response.statusText}`);
        }

        const recipes = await response.json();
        return recipes;
    } catch (error) {
        console.error('Error fetching user recipes:', error);
        throw error;
    }
};

/**
 * Fetch user analytics/insights
 */
export const fetchAnalytics = async (userId: string): Promise<UserAnalytics> => {
    try {
        const token = await getAuthToken();
        const backendUrl = getBackendUrl();

        const response = await fetch(`${backendUrl}/api/users/${userId}/analytics`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(errorData.detail || `Failed to fetch analytics: ${response.statusText}`);
        }

        const analytics = await response.json();
        return analytics;
    } catch (error) {
        console.error('Error fetching analytics:', error);
        throw error;
    }
};

/**
 * Fetch user's recent activities
 */
export const fetchActivities = async (userId: string, limit: number = 10): Promise<UserActivity[]> => {
    try {
        const token = await getAuthToken();
        const backendUrl = getBackendUrl();

        const response = await fetch(`${backendUrl}/api/users/${userId}/activities?limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(errorData.detail || `Failed to fetch activities: ${response.statusText}`);
        }

        const activities = await response.json();
        return activities;
    } catch (error) {
        console.error('Error fetching activities:', error);
        throw error;
    }
};

/**
 * Update user profile
 */
export const updateProfile = async (userId: string, profileData: { full_name?: string; bio?: string; avatar_url?: string }): Promise<Profile> => {
    try {
        const token = await getAuthToken();
        const backendUrl = getBackendUrl();

        const response = await fetch(`${backendUrl}/api/users/${userId}/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(profileData),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(errorData.detail || `Failed to update profile: ${response.statusText}`);
        }

        const updatedProfile = await response.json();
        return updatedProfile;
    } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
    }
};

/**
 * Update user preferences
 */
export const updatePreferences = async (userId: string, preferences: {
    dietary_preferences: string[];
    goals: string[];
    allergies: string[];
}): Promise<Profile> => {
    try {
        const token = await getAuthToken();
        const backendUrl = getBackendUrl();

        const response = await fetch(`${backendUrl}/api/users/${userId}/preferences`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(preferences),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(errorData.detail || `Failed to update preferences: ${response.statusText}`);
        }

        const updatedProfile = await response.json();
        return updatedProfile;
    } catch (error) {
        console.error('Error updating preferences:', error);
        throw error;
    }
};

/**
 * Unsave a recipe
 */
export const unsaveRecipe = async (userId: string, recipeId: string): Promise<void> => {
    try {
        const token = await getAuthToken();
        const backendUrl = getBackendUrl();

        const response = await fetch(`${backendUrl}/api/users/${userId}/recipes/${recipeId}/unsave`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(errorData.detail || `Failed to unsave recipe: ${response.statusText}`);
        }

        await response.json();
    } catch (error) {
        console.error('Error unsaving recipe:', error);
        throw error;
    }
};

/**
 * Unlike a recipe
 */
export const unlikeRecipe = async (recipeId: string): Promise<void> => {
    try {
        const token = await getAuthToken();
        const backendUrl = getBackendUrl();

        const response = await fetch(`${backendUrl}/api/recipes/${recipeId}/unlike`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(errorData.detail || `Failed to unlike recipe: ${response.statusText}`);
        }

        await response.json();
    } catch (error) {
        console.error('Error unliking recipe:', error);
        throw error;
    }
};

/**
 * Change user password
 */
export const changePassword = async (userId: string, currentPassword: string, newPassword: string): Promise<void> => {
    try {
        const token = await getAuthToken();
        const backendUrl = getBackendUrl();

        const response = await fetch(`${backendUrl}/api/users/${userId}/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(errorData.detail || `Failed to change password: ${response.statusText}`);
        }

        await response.json();
    } catch (error) {
        console.error('Error changing password:', error);
        throw error;
    }
};

/**
 * Delete user account
 */
export const deleteAccount = async (userId: string): Promise<void> => {
    try {
        const token = await getAuthToken();
        const backendUrl = getBackendUrl();

        const response = await fetch(`${backendUrl}/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(errorData.detail || `Failed to delete account: ${response.statusText}`);
        }

        await response.json();
    } catch (error) {
        console.error('Error deleting account:', error);
        throw error;
    }
};

