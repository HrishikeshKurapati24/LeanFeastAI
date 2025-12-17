/**
 * Admin API service layer
 */
import { supabase } from '../config/supabaseClient';

const getBackendUrl = (): string => {
    return import.meta.env.VITE_API_URL || 'http://localhost:8000';
};

const getAuthToken = async (): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
        throw new Error('Not authenticated');
    }
    return session.access_token;
};

// ============================================================================
// USER MANAGEMENT APIs
// ============================================================================

export const adminListUsers = async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
}) => {
    const token = await getAuthToken();
    const backendUrl = getBackendUrl();

    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const response = await fetch(`${backendUrl}/api/admin/users?${queryParams.toString()}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Failed to fetch users: ${response.statusText}`);
    }

    return response.json();
};

export const adminGetUser = async (userId: string) => {
    const token = await getAuthToken();
    const backendUrl = getBackendUrl();

    const response = await fetch(`${backendUrl}/api/admin/users/${userId}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Failed to fetch user: ${response.statusText}`);
    }

    return response.json();
};

export const adminUpdateUser = async (userId: string, profileData: any) => {
    const token = await getAuthToken();
    const backendUrl = getBackendUrl();

    const response = await fetch(`${backendUrl}/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Failed to update user: ${response.statusText}`);
    }

    return response.json();
};

export const adminSuspendUser = async (userId: string, reason: string) => {
    const token = await getAuthToken();
    const backendUrl = getBackendUrl();

    const response = await fetch(`${backendUrl}/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Failed to suspend user: ${response.statusText}`);
    }

    return response.json();
};

export const adminReactivateUser = async (userId: string) => {
    const token = await getAuthToken();
    const backendUrl = getBackendUrl();

    const response = await fetch(`${backendUrl}/api/admin/users/${userId}/reactivate`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Failed to reactivate user: ${response.statusText}`);
    }

    return response.json();
};

export const adminDeleteUser = async (userId: string, reason: string) => {
    const token = await getAuthToken();
    const backendUrl = getBackendUrl();

    const response = await fetch(`${backendUrl}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Failed to delete user: ${response.statusText}`);
    }

    return response.json();
};

export const adminUserAnalytics = async (params: {
    date_from?: string;
    date_to?: string;
}) => {
    const token = await getAuthToken();
    const backendUrl = getBackendUrl();

    const queryParams = new URLSearchParams();
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const response = await fetch(`${backendUrl}/api/admin/users/analytics?${queryParams.toString()}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Failed to fetch analytics: ${response.statusText}`);
    }

    return response.json();
};

// ============================================================================
// RECIPE MANAGEMENT APIs
// ============================================================================

export const adminListRecipes = async (params: {
    page?: number;
    limit?: number;
    search?: string;
    meal_type?: string;
    tags?: string;
    date_from?: string;
    date_to?: string;
}) => {
    const token = await getAuthToken();
    const backendUrl = getBackendUrl();

    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.meal_type) queryParams.append('meal_type', params.meal_type);
    if (params.tags) queryParams.append('tags', params.tags);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const response = await fetch(`${backendUrl}/api/admin/recipes?${queryParams.toString()}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Failed to fetch recipes: ${response.statusText}`);
    }

    return response.json();
};

export const adminGetRecipe = async (recipeId: string) => {
    const token = await getAuthToken();
    const backendUrl = getBackendUrl();

    const response = await fetch(`${backendUrl}/api/admin/recipes/${recipeId}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Failed to fetch recipe: ${response.statusText}`);
    }

    return response.json();
};

export const adminUpdateRecipe = async (recipeId: string, recipeData: any) => {
    const token = await getAuthToken();
    const backendUrl = getBackendUrl();

    const response = await fetch(`${backendUrl}/api/admin/recipes/${recipeId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipeData),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Failed to update recipe: ${response.statusText}`);
    }

    return response.json();
};

export const adminUpdateNutrition = async (recipeId: string, nutrition: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fats?: number;
}) => {
    const token = await getAuthToken();
    const backendUrl = getBackendUrl();

    const response = await fetch(`${backendUrl}/api/admin/recipes/${recipeId}/nutrition`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(nutrition),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Failed to update nutrition: ${response.statusText}`);
    }

    return response.json();
};

export const adminDeleteRecipe = async (recipeId: string) => {
    const token = await getAuthToken();
    const backendUrl = getBackendUrl();

    const response = await fetch(`${backendUrl}/api/admin/recipes/${recipeId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Failed to delete recipe: ${response.statusText}`);
    }

    return response.json();
};

export const adminRegenerateImage = async (recipeId: string) => {
    const token = await getAuthToken();
    const backendUrl = getBackendUrl();

    const response = await fetch(`${backendUrl}/api/admin/recipes/${recipeId}/regenerate-image`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Failed to regenerate image: ${response.statusText}`);
    }

    return response.json();
};

export const adminRecipeAnalytics = async (params: {
    date_from?: string;
    date_to?: string;
}) => {
    const token = await getAuthToken();
    const backendUrl = getBackendUrl();

    const queryParams = new URLSearchParams();
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const response = await fetch(`${backendUrl}/api/admin/recipes/analytics?${queryParams.toString()}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Failed to fetch analytics: ${response.statusText}`);
    }

    return response.json();
};

// ============================================================================
// COMMUNITY MANAGEMENT APIs
// ============================================================================

export const adminListCommunity = async (params: {
    page?: number;
    limit?: number;
    search?: string;
    featured?: boolean;
    date_from?: string;
    date_to?: string;
}) => {
    const token = await getAuthToken();
    const backendUrl = getBackendUrl();

    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.featured !== undefined) queryParams.append('featured', params.featured.toString());
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const response = await fetch(`${backendUrl}/api/admin/community?${queryParams.toString()}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Failed to fetch community recipes: ${response.statusText}`);
    }

    return response.json();
};

export const adminGetComments = async (recipeId: string) => {
    const token = await getAuthToken();
    const backendUrl = getBackendUrl();

    const response = await fetch(`${backendUrl}/api/admin/community/${recipeId}/comments`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Failed to fetch comments: ${response.statusText}`);
    }

    return response.json();
};

export const adminModerateComment = async (
    recipeId: string,
    commentId: string,
    action: 'hide' | 'show' | 'edit' | 'delete',
    text?: string
) => {
    const token = await getAuthToken();
    const backendUrl = getBackendUrl();

    const response = await fetch(`${backendUrl}/api/admin/community/${recipeId}/comments/${commentId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, text }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Failed to moderate comment: ${response.statusText}`);
    }

    return response.json();
};

export const adminRemoveFromCommunity = async (recipeId: string, reason: string) => {
    const token = await getAuthToken();
    const backendUrl = getBackendUrl();

    const response = await fetch(`${backendUrl}/api/admin/community/${recipeId}/remove`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Failed to remove recipe: ${response.statusText}`);
    }

    return response.json();
};

export const adminUpdateCommunityMetadata = async (
    recipeId: string,
    metadata: {
        title?: string;
        tags?: string[];
        is_featured?: boolean;
    }
) => {
    const token = await getAuthToken();
    const backendUrl = getBackendUrl();

    const response = await fetch(`${backendUrl}/api/admin/community/${recipeId}/metadata`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Failed to update metadata: ${response.statusText}`);
    }

    return response.json();
};

export const adminCommunityAnalytics = async (params: {
    date_from?: string;
    date_to?: string;
}) => {
    const token = await getAuthToken();
    const backendUrl = getBackendUrl();

    const queryParams = new URLSearchParams();
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const response = await fetch(`${backendUrl}/api/admin/community/analytics?${queryParams.toString()}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Failed to fetch analytics: ${response.statusText}`);
    }

    return response.json();
};

// ============================================================================
// ADMIN ACTIONS LOG
// ============================================================================

export const adminGetActions = async (params: {
    page?: number;
    limit?: number;
    admin_id?: string;
    action_type?: string;
    target_type?: string;
    date_from?: string;
    date_to?: string;
}) => {
    const token = await getAuthToken();
    const backendUrl = getBackendUrl();

    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.admin_id) queryParams.append('admin_id', params.admin_id);
    if (params.action_type) queryParams.append('action_type', params.action_type);
    if (params.target_type) queryParams.append('target_type', params.target_type);
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);

    const response = await fetch(`${backendUrl}/api/admin/actions?${queryParams.toString()}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Failed to fetch actions: ${response.statusText}`);
    }

    return response.json();
};

