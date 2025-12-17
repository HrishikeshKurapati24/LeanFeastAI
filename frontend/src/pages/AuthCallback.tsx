import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { supabase } from '../config/supabaseClient.js';

function AuthCallback() {
    const navigate = useNavigate();
    const { user, loading } = useAuth();
    const hasCheckedRef = useRef(false);
    const isProcessingRef = useRef(false);

    useEffect(() => {
        // Prevent multiple calls
        if (hasCheckedRef.current || isProcessingRef.current) {
            return;
        }

        const checkProfileAndRedirect = async () => {
            // Wait for auth to load
            if (loading) {
                return;
            }

            // If not logged in, redirect to login
            if (!user) {
                navigate('/login');
                return;
            }

            // Mark as processing to prevent duplicate calls
            isProcessingRef.current = true;

            // Check if profile is complete and redirect accordingly
            try {
                const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                const session = await supabase.auth.getSession();

                if (!session.data.session?.access_token) {
                    hasCheckedRef.current = true;
                    navigate('/feast-studio');
                    return;
                }

                const profileRes = await fetch(`${backendUrl}/api/users/${user.id}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session.data.session.access_token}`,
                    },
                });

                // Check if user is suspended (403 Forbidden)
                if (profileRes.status === 403) {
                    const errorData = await profileRes.json().catch(() => ({}));
                    const suspensionReason = errorData.detail || 'Your account has been suspended.';
                    
                    // Sign out the user immediately
                    await supabase.auth.signOut();
                    
                    // Show alert with suspension message
                    alert(`${suspensionReason}\n\nYou have been notified via email regarding this suspension. Please contact support if you believe this is an error.`);
                    
                    // Redirect to login
                    hasCheckedRef.current = true;
                    navigate('/login');
                    return;
                }

                // Only redirect to complete-profile if profile doesn't exist (404)
                // If profile exists (even if incomplete), redirect to make-my-feast
                if (profileRes.status === 404) {
                    // Profile doesn't exist (first sign in) - create minimal profile first
                    try {
                        const createRes = await fetch(`${backendUrl}/api/users/register`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${session.data.session.access_token}`,
                            },
                            body: JSON.stringify({
                                user_id: user.id,
                                email: user.email || '',
                                full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
                                dietary_preferences: [],
                                goals: [],
                                allergies: [],
                            }),
                        });

                        // Even if profile creation fails, redirect to complete-profile
                        // The user can complete it there
                        if (!createRes.ok) {
                            console.warn('Failed to create minimal profile, redirecting to complete-profile anyway');
                        }
                    } catch (createError) {
                        console.warn('Error creating minimal profile:', createError);
                    }

                    // Redirect to complete-profile for first-time users
                    hasCheckedRef.current = true;
                    navigate('/complete-profile');
                } else {
                    // Profile exists or other status - redirect to make-my-feast
                    // User can complete profile later from their profile page if needed
                    hasCheckedRef.current = true;
                    navigate('/feast-studio');
                }
            } catch (profileError) {
                // If profile check fails, redirect to make-my-feast as safe default
                hasCheckedRef.current = true;
                navigate('/feast-studio');
            } finally {
                isProcessingRef.current = false;
            }
        };

        checkProfileAndRedirect();
    }, [user, loading, navigate]);

    // Show loading state while checking
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-neutral-61">Completing sign in...</p>
            </div>
        </div>
    );
}

export default AuthCallback;