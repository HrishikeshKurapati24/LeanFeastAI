/**
 * Admin authentication utilities
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

// Simple sessionStorage cache to avoid repeated admin-status roundtrips during login
const ADMIN_STATUS_CACHE_KEY = 'admin_status_cache_v1';

interface AdminStatusResult {
    isAdmin: boolean;
    assignedSections: string[];
    permissions: Record<string, boolean>;
    userId?: string;
    ts?: number;
}

/**
 * Check if current user is an admin and get assigned sections and permissions
 */
export const checkAdminStatus = async (): Promise<{ isAdmin: boolean; assignedSections: string[]; permissions: Record<string, boolean> }> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        // Try cache first (5 minute TTL)
        if (userId) {
            const cachedRaw = sessionStorage.getItem(ADMIN_STATUS_CACHE_KEY);
            if (cachedRaw) {
                try {
                    const cached: AdminStatusResult = JSON.parse(cachedRaw);
                    const now = Date.now();
                    if (cached.userId === userId && cached.ts && now - cached.ts < 5 * 60 * 1000) {
                        return {
                            isAdmin: cached.isAdmin,
                            assignedSections: cached.assignedSections || [],
                            permissions: cached.permissions || {},
                        };
                    }
                } catch {
                    // ignore cache parse errors
                }
            }
        }

        const token = session?.access_token || await getAuthToken();
        const backendUrl = getBackendUrl();

        // Use lightweight admin status check endpoint
        const response = await fetch(`${backendUrl}/api/admin/check-status`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            return { isAdmin: false, assignedSections: [], permissions: {} };
        }

        const data = await response.json();

        // Handle assigned_sections - ensure it's always an array
        let assignedSections: string[] = [];
        if (data.assigned_sections) {
            if (Array.isArray(data.assigned_sections)) {
                assignedSections = data.assigned_sections;
            } else if (typeof data.assigned_sections === 'string') {
                // Parse PostgreSQL array string format: "{users,recipes}" or "users,recipes"
                let sectionsStr = data.assigned_sections.trim();
                if (sectionsStr.startsWith('{') && sectionsStr.endsWith('}')) {
                    sectionsStr = sectionsStr.slice(1, -1); // Remove braces
                }
                if (sectionsStr) {
                    assignedSections = sectionsStr.split(',').map(s => s.trim()).filter(s => s);
                }
            }
        }

        // Extract permissions
        const permissions = data.permissions || {};

        const result = {
            isAdmin: data.is_admin === true,
            assignedSections: assignedSections,
            permissions: permissions
        };
        // Cache the result for a short period
        if (userId) {
            sessionStorage.setItem(ADMIN_STATUS_CACHE_KEY, JSON.stringify({
                ...result,
                userId,
                ts: Date.now(),
            }));
        }
        return result;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return { isAdmin: false, assignedSections: [], permissions: {} };
    }
};

/**
 * Get admin user data with assigned sections
 */
export const getAdminUser = async () => {
    try {
        const adminStatus = await checkAdminStatus();

        if (!adminStatus.isAdmin) {
            return null;
        }

        const { data: { user } } = await supabase.auth.getUser();
        return {
            ...user,
            assignedSections: adminStatus.assignedSections
        };
    } catch (error) {
        console.error('Error getting admin user:', error);
        return null;
    }
};

