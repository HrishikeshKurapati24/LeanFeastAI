import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import Toast from '../components/Toast';
import {
    selectProfile,
    selectProfileMeta,
    selectSavedMeals,
    selectSavedMealsMeta,
    selectLikedMeals,
    selectLikedMealsMeta,
} from '../store/selectors/userSelectors';
import { fetchSavedMeals, fetchLikedMeals, unsaveRecipeOptimistic, unlikeRecipeOptimistic } from '../store/thunks/userThunks';
import { setProfile } from '../store/slices/userProfileSlice';
import ProfileOverview from '../components/profile/ProfileOverview';
import PreferencesGoals from '../components/profile/PreferencesGoals';
import SavedMeals from '../components/profile/SavedMeals';
import LikedRecipes from '../components/profile/LikedRecipes';
import CookingInsights from '../components/profile/CookingInsights';
import RecentActivity from '../components/profile/RecentActivity';
import ProfileSettings from '../components/profile/ProfileSettings';
import {
    fetchAnalytics,
    fetchActivities,
    updateProfile,
    updatePreferences,
} from '../utils/profileApi';
import type { UserAnalytics, UserActivity } from '../types/profileTypes';

export default function Profile() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    // Redirect to login if user is not authenticated
    useEffect(() => {
        if (!user?.id) {
            navigate('/login', { replace: true });
            return;
        }
    }, [user?.id, navigate]);

    // Don't render if user is not authenticated
    if (!user?.id) {
        return null;
    }

    // Get data from Redux
    const profile = useAppSelector(selectProfile);
    const profileMeta = useAppSelector(selectProfileMeta);
    const savedMeals = useAppSelector(selectSavedMeals);
    const savedMealsMeta = useAppSelector(selectSavedMealsMeta);
    const likedMeals = useAppSelector(selectLikedMeals);
    const likedMealsMeta = useAppSelector(selectLikedMealsMeta);

    // Analytics and activities still fetched directly (not in Redux)
    const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
    const [activities, setActivities] = useState<UserActivity[]>([]);

    // Toast state
    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);

    // Fetch analytics and activities (not in Redux store)
    useEffect(() => {
        const loadAnalyticsData = async () => {
            if (!user?.id) return;

            try {
                const [analyticsData, activitiesData] = await Promise.all([
                    fetchAnalytics(user.id),
                    fetchActivities(user.id, 10),
                ]);
                setAnalytics(analyticsData);
                setActivities(activitiesData);
            } catch (err) {
                console.error('Failed to load analytics data:', err);
            }
        };

        loadAnalyticsData();
    }, [user?.id]);

    // Fetch additional pages if needed
    useEffect(() => {
        if (!user?.id || !profile) return;

        // Fetch saved meals page 1 if not loaded
        if (!savedMealsMeta.loaded && !savedMealsMeta.isLoading) {
            dispatch(fetchSavedMeals({ userId: user.id, page: 1 }));
        }

        // Fetch liked meals page 1 if not loaded
        if (!likedMealsMeta.loaded && !likedMealsMeta.isLoading) {
            dispatch(fetchLikedMeals({ userId: user.id, page: 1 }));
        }
    }, [user?.id, profile, savedMealsMeta.loaded, savedMealsMeta.isLoading, likedMealsMeta.loaded, likedMealsMeta.isLoading, dispatch]);

    const handleProfileUpdate = async (updatedData: { full_name?: string; bio?: string; avatar_url?: string }) => {
        if (!user?.id || !profile) return;

        try {
            const updatedProfile = await updateProfile(user.id, updatedData);
            // Update Redux store with new profile data
            dispatch(setProfile(updatedProfile));
            setToastMessage('Profile updated successfully!');
            setShowToast(true);
        } catch (err) {
            console.error('Failed to update profile:', err);
            alert('Failed to update profile. Please try again.');
        }
    };

    const handlePreferencesUpdate = useCallback(async (preferences: {
        dietary_preferences: string[];
        goals: string[];
        allergies: string[];
    }) => {
        if (!user?.id) {
            alert('Cannot update preferences. Please refresh the page.');
            return;
        }

        try {
            // Call backend to update preferences
            const updatedProfile = await updatePreferences(user.id, preferences);

            // Update Redux store with new profile data
            dispatch(setProfile(updatedProfile));
            setToastMessage('Preferences updated successfully!');
            setShowToast(true);
        } catch (err) {
            console.error('Failed to update preferences:', err);
            alert(err instanceof Error ? err.message : 'Failed to update preferences. Please try again.');
        }
    }, [user?.id, dispatch]);

    const handleUnsaveRecipe = async (recipeId: string) => {
        if (!user?.id || !profile) return;

        // Use optimistic update thunk
        dispatch(unsaveRecipeOptimistic({ userId: user.id, recipeId }));
        setToastMessage('Recipe removed from saved meals');
        setShowToast(true);
    };

    const handleUnlikeRecipe = async (recipeId: string) => {
        if (!user?.id || !profile) return;

        // Use optimistic update thunk
        dispatch(unlikeRecipeOptimistic({ userId: user.id, recipeId }));
        setToastMessage('Recipe removed from liked recipes');
        setShowToast(true);
    };

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-base sm:text-lg text-neutral-61">Please log in to view your profile.</p>
                </div>
            </div>
        );
    }

    // Show loading/skeleton state if profile not loaded yet
    const isLoading = profileMeta.isLoading || !profileMeta.loaded;
    const hasError = profileMeta.error;

    if (isLoading && !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl sm:text-5xl mb-3 sm:mb-4 animate-pulse">🍳</div>
                    <p className="text-base sm:text-lg text-neutral-61">Loading your profile...</p>
                </div>
            </div>
        );
    }

    if (hasError && !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">⚠️</div>
                    <p className="text-base sm:text-lg text-red-600 mb-3 sm:mb-4">{hasError || 'Profile not found'}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 sm:px-6 py-2 sm:py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors text-sm sm:text-base"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-base sm:text-lg text-neutral-61">Profile not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 py-4 sm:py-6 md:py-8 px-3 sm:px-4">
            {/* Toast Notification */}
            <Toast
                message={toastMessage}
                type="success"
                isVisible={showToast}
                onClose={() => setShowToast(false)}
                duration={3000}
            />

            <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
                {/* Profile Overview */}
                <ProfileOverview profile={profile} onProfileUpdate={handleProfileUpdate} />

                {/* Preferences & Goals */}
                <PreferencesGoals profile={profile} onPreferencesUpdate={handlePreferencesUpdate} />

                {/* Saved Meals */}
                <SavedMeals
                    savedRecipes={profile.saved_recipes}
                    savedMeals={savedMeals}
                    savedMealsMeta={savedMealsMeta}
                    onUnsave={handleUnsaveRecipe}
                    onLoadMore={() => {
                        if (user?.id && savedMealsMeta.hasMore && !savedMealsMeta.isLoading) {
                            dispatch(fetchSavedMeals({ userId: user.id, page: savedMealsMeta.currentPage + 1 }));
                        }
                    }}
                />

                {/* Liked Recipes */}
                <LikedRecipes
                    likedRecipes={profile.liked_recipes}
                    likedMeals={likedMeals}
                    likedMealsMeta={likedMealsMeta}
                    onUnlike={handleUnlikeRecipe}
                    onLoadMore={() => {
                        if (user?.id && likedMealsMeta.hasMore && !likedMealsMeta.isLoading) {
                            dispatch(fetchLikedMeals({ userId: user.id, page: likedMealsMeta.currentPage + 1 }));
                        }
                    }}
                />

                {/* Cooking Insights */}
                {analytics && <CookingInsights insights={analytics} />}

                {/* Recent Activity */}
                <RecentActivity activities={activities} />

                {/* Settings */}
                <ProfileSettings userId={user.id} />
            </div>
        </div>
    );
}