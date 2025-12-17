import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../config/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { useAppDispatch } from "../store/hooks";
import { addCommunityRecipe } from "../store/slices/communitySlice";
import { saveRecipeOptimistic, unsaveRecipeOptimistic, likeRecipeOptimistic, unlikeRecipeOptimistic } from "../store/thunks/userThunks";
import type { CommunityRecipe } from "../utils/communityApi";
import RecipeHeader from "../components/recipe-details/RecipeHeader";
import RecipeActions from "../components/recipe-details/RecipeActions";
import RecipeIngredients from "../components/recipe-details/RecipeIngredients";
import RecipeSteps from "../components/recipe-details/RecipeSteps";
import SmartIngredientReplacement from "../components/recipe-details/SmartIngredientReplacement";
import ShareToCommunityForm from "../components/community-hub/ShareToCommunityForm";
import RecipeGenerationSpinner from "../components/feast-studio/RecipeGenerationSpinner";
import Toast from "../components/Toast";

interface Ingredient {
    name: string;
    quantity: string;
    unit?: string;
}

interface RecipeStep {
    step_number: number;
    instruction: string;
    step_type?: "active" | "passive" | "wait";
}

interface Recipe {
    id: string;
    title: string;
    description: string;
    image_url?: string | null;
    image_base64?: string | null;
    tags?: string[];
    prep_time?: number;
    cook_time?: number;
    serving_size?: number;
    ingredients: Ingredient[];
    steps: RecipeStep[];
    nutrition?: {
        calories?: number;
        protein?: number;
        carbs?: number;
        fats?: number;
    };
    likes?: number;
    is_public?: boolean;
    is_ai_generated?: boolean;
}

export default function MakeMyFeastDetails() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const dispatch = useAppDispatch();
    const [recipe, setRecipe] = useState<Recipe | null>(location.state?.recipe || null);
    const [loading, setLoading] = useState(!location.state?.recipe);
    const [error, setError] = useState<string | null>(null);

    // Redirect to login if user is not authenticated
    useEffect(() => {
        if (!user?.id) {
            navigate('/login', { replace: true });
        }
    }, [user?.id, navigate]);

    // Don't render if user is not authenticated
    if (!user?.id) {
        return null;
    }

    const [isSaved, setIsSaved] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [showCommunityModal, setShowCommunityModal] = useState(false);
    const [postingToCommunity, setPostingToCommunity] = useState(false);
    const [showSmartReplacementModal, setShowSmartReplacementModal] = useState(false);
    const [replacingIngredients, setReplacingIngredients] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [toastType, setToastType] = useState<"success" | "error" | "info">("success");
    const [imageLoading, setImageLoading] = useState(false);
    const recipeId = location.state?.recipe_id || localStorage.getItem('current_recipe_id');

    // Scroll to top when component mounts or location changes
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [location.pathname]);

    // Scroll to top after recipe is loaded
    useEffect(() => {
        if (recipe && !loading) {
            // Small delay to ensure DOM is rendered
            setTimeout(() => {
                window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            }, 100);
        }
    }, [recipe, loading]);

    // Image polling function
    const startImagePolling = (recipeId: string, accessToken: string) => {
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        let pollAttempts = 0;
        const maxPollAttempts = 30; // Poll for up to 30 attempts (60 seconds with 2s interval)
        const pollInterval = 2000; // Poll every 2 seconds

        // Set loading state to true when polling starts
        setImageLoading(true);

        const pollImage = async () => {
            if (pollAttempts >= maxPollAttempts) {
                setImageLoading(false);
                return;
            }

            try {
                const response = await fetch(`${backendUrl}/api/recipes/${recipeId}/image`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                });

                if (!response.ok) {
                    console.error('Failed to poll for image:', response.statusText);
                    pollAttempts++;
                    if (pollAttempts < maxPollAttempts) {
                        setTimeout(pollImage, pollInterval);
                    } else {
                        setImageLoading(false);
                    }
                    return;
                }

                const result = await response.json();

                if (result.ready && (result.image_url || result.image_base64)) {
                    // Image is ready, update recipe state
                    setImageLoading(false);
                    setRecipe((prevRecipe) => {
                        if (!prevRecipe) return prevRecipe;
                        return {
                            ...prevRecipe,
                            image_url: result.image_url || prevRecipe.image_url,
                            image_base64: result.image_base64 || prevRecipe.image_base64, // Fallback for legacy
                        };
                    });
                } else {
                    // Image still processing, continue polling
                    pollAttempts++;
                    if (pollAttempts < maxPollAttempts) {
                        setTimeout(pollImage, pollInterval);
                    } else {
                        setImageLoading(false);
                    }
                }
            } catch (err) {
                console.error('Error polling for image:', err);
                pollAttempts++;
                if (pollAttempts < maxPollAttempts) {
                    setTimeout(pollImage, pollInterval);
                } else {
                    setImageLoading(false);
                }
            }
        };

        // Start polling after a short delay
        setTimeout(pollImage, pollInterval);
    };

    // Fetch recipe from database if not in state and check saved/liked status
    useEffect(() => {
        const fetchRecipe = async () => {
            // If recipe is already in state, use it
            if (location.state?.recipe) {
                setLoading(false);
                // Still need to check if recipe is saved/liked
                const recipeIdToCheck = location.state?.recipe?.id || location.state?.recipe_id;
                if (recipeIdToCheck) {
                    await checkRecipeStatus(recipeIdToCheck);

                    // If image is not available, start polling for it
                    const recipeData = location.state?.recipe;
                    if (!recipeData?.image_base64 && !recipeData?.image_url && recipeIdToCheck) {
                        const session = await supabase.auth.getSession();
                        if (session.data.session?.access_token) {
                            startImagePolling(recipeIdToCheck, session.data.session.access_token);
                        }
                    } else {
                        // Image is already available, ensure loading state is false
                        setImageLoading(false);
                    }
                }
                return;
            }

            // Otherwise, fetch from database using recipe_id
            if (recipeId) {
                setLoading(true);
                setError(null);

                try {
                    const session = await supabase.auth.getSession();
                    if (!session.data.session?.access_token) {
                        throw new Error('Not authenticated');
                    }

                    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                    const response = await fetch(`${backendUrl}/api/recipes/${recipeId}`, {
                        headers: {
                            'Authorization': `Bearer ${session.data.session.access_token}`,
                        },
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to fetch recipe: ${response.statusText}`);
                    }

                    const result = await response.json();
                    setRecipe(result.recipe);

                    // Check if recipe is saved/liked
                    await checkRecipeStatus(recipeId);

                    // If image is not available, start polling for it
                    if (!result.recipe?.image_base64 && !result.recipe?.image_url) {
                        startImagePolling(recipeId, session.data.session.access_token);
                    } else {
                        // Image is already available, ensure loading state is false
                        setImageLoading(false);
                    }
                } catch (err) {
                    console.error('Error fetching recipe:', err);
                    setError(err instanceof Error ? err.message : 'Failed to fetch recipe');
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        const checkRecipeStatus = async (id: string) => {
            try {
                const session = await supabase.auth.getSession();
                if (!session.data.session?.access_token) {
                    return;
                }

                const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                const userId = session.data.session.user.id;

                // Fetch user profile to check saved/liked recipes
                const profileResponse = await fetch(`${backendUrl}/api/users/${userId}/profile`, {
                    headers: {
                        'Authorization': `Bearer ${session.data.session.access_token}`,
                    },
                });

                if (profileResponse.ok) {
                    const profileData = await profileResponse.json();
                    const savedRecipes = profileData.profile?.saved_recipes || [];
                    const likedRecipes = profileData.profile?.liked_recipes || [];

                    setIsSaved(savedRecipes.includes(id));
                    setIsLiked(likedRecipes.includes(id));
                }
            } catch (err) {
                console.error('Error checking recipe status:', err);
            }
        };

        fetchRecipe();
    }, [recipeId, location.state]);

    // Clear recipe_id when page is being unloaded (refresh, close tab)
    useEffect(() => {
        const handleBeforeUnload = () => {
            localStorage.removeItem('current_recipe_id');
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    // Helper function to clear context when navigating away
    const clearRecipeContext = () => {
        localStorage.removeItem('current_recipe_id');
    };

    // Handle Save Recipe
    const handleSave = (id: string) => {
        if (!user?.id || !recipe) return;

        const currentSavedState = isSaved;
        setIsSaved(!currentSavedState);

        // Convert recipe to UserRecipe format for Redux
        // Note: user_id will be fetched by backend if needed, empty string is acceptable
        const userRecipe = {
            id: recipe.id,
            user_id: (recipe as any).user_id || '', // Recipe creator's ID (may not be in interface)
            title: recipe.title,
            description: recipe.description,
            meal_type: recipe.tags?.[0],
            image_url: recipe.image_url || undefined,
            created_at: (recipe as any).created_at || new Date().toISOString(),
            is_ai_generated: recipe.is_ai_generated,
        };

        // Use Redux optimistic thunk
        if (currentSavedState) {
            dispatch(unsaveRecipeOptimistic({ userId: user.id, recipeId: id }))
                .unwrap()
                .catch(() => {
                    setIsSaved(currentSavedState); // Revert on error
                });
        } else {
            dispatch(saveRecipeOptimistic({ userId: user.id, recipeId: id, recipe: userRecipe }))
                .unwrap()
                .catch(() => {
                    setIsSaved(currentSavedState); // Revert on error
                });
        }
    };

    // Handle Like Recipe
    const handleLike = (id: string) => {
        if (!user?.id || !recipe) return;

        const currentLikedState = isLiked;
        setIsLiked(!currentLikedState);

        // Convert recipe to UserRecipe format for Redux
        // Note: user_id will be fetched by backend if needed, empty string is acceptable
        const userRecipe = {
            id: recipe.id,
            user_id: (recipe as any).user_id || '', // Recipe creator's ID (may not be in interface)
            title: recipe.title,
            description: recipe.description,
            meal_type: recipe.tags?.[0],
            image_url: recipe.image_url || undefined,
            created_at: (recipe as any).created_at || new Date().toISOString(),
            is_ai_generated: recipe.is_ai_generated,
        };

        // Use Redux optimistic thunk
        if (currentLikedState) {
            dispatch(unlikeRecipeOptimistic({ userId: user.id, recipeId: id }))
                .unwrap()
                .catch(() => {
                    setIsLiked(currentLikedState); // Revert on error
                });
        } else {
            dispatch(likeRecipeOptimistic({ userId: user.id, recipeId: id, recipe: userRecipe }))
                .unwrap()
                .catch(() => {
                    setIsLiked(currentLikedState); // Revert on error
                });
        }
    };

    // Handle Share Recipe
    const handleShare = (id: string) => {
        // Share menu is handled by RecipeActions component
        // Track share event in background (fire-and-forget)
        (async () => {
            try {
                const session = await supabase.auth.getSession();
                if (!session.data.session?.access_token) {
                    console.error('Not authenticated');
                    return;
                }

                const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

                const response = await fetch(`${backendUrl}/api/recipes/${id}/share`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.data.session.access_token}`,
                    },
                });

                if (!response.ok) {
                    console.error('Failed to track share:', response.statusText);
                }
            } catch (err) {
                console.error('Error tracking share:', err);
            }
        })();
    };

    // Handle Post to Community
    const handlePostToCommunity = () => {
        setShowCommunityModal(true);
    };

    const handleCommunitySubmit = async (data: {
        image: File | null;
        title: string;
        description: string;
        tags: string[];
        isAiGenerated: boolean;
    }) => {
        setPostingToCommunity(true);
        try {
            const session = await supabase.auth.getSession();
            if (!session.data.session?.access_token) {
                throw new Error('Not authenticated');
            }

            const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

            // Prepare FormData
            const formData = new FormData();
            formData.append('title', data.title);
            formData.append('description', data.description);
            formData.append('tags', JSON.stringify(data.tags));
            formData.append('isAiGenerated', String(data.isAiGenerated));
            if (recipeId) {
                formData.append('recipeId', recipeId);
            }
            if (data.image) {
                formData.append('image', data.image);
            }

            // Add steps if recipe exists
            if (recipe?.steps) {
                formData.append('steps', JSON.stringify(recipe.steps));
            }

            const response = await fetch(`${backendUrl}/api/recipes/community`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.data.session.access_token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Failed to post recipe: ${response.statusText}`);
            }

            const result = await response.json();
            const postedRecipe = result.recipe;

            // Transform the posted recipe to CommunityRecipe format and add to Redux
            if (postedRecipe) {
                // Construct posted_by from session (backend should return this, but we have a fallback)
                const postedBy = postedRecipe.posted_by || {
                    id: session.data.session.user.id,
                    name: session.data.session.user.user_metadata?.full_name || session.data.session.user.email || 'User',
                    avatar: session.data.session.user.user_metadata?.avatar_url || null,
                };

                const communityRecipe: CommunityRecipe = {
                    id: postedRecipe.id,
                    title: postedRecipe.title,
                    description: postedRecipe.description || '',
                    image_url: postedRecipe.image_url || null,
                    tags: postedRecipe.tags || [],
                    prep_time: postedRecipe.prep_time || null,
                    cook_time: postedRecipe.cook_time || null,
                    serving_size: postedRecipe.serving_size || null,
                    nutrition: postedRecipe.nutrition || {},
                    ingredients: Array.isArray(postedRecipe.ingredients) ? postedRecipe.ingredients : [],
                    steps: Array.isArray(postedRecipe.steps) ? postedRecipe.steps : [],
                    is_public: true,
                    created_at: postedRecipe.created_at || new Date().toISOString(),
                    likes: 0,
                    views: 0,
                    shares: 0,
                    comments_count: 0,
                    featured: false,
                    is_ai_generated: postedRecipe.is_ai_generated || false,
                    posted_by: postedBy,
                };

                // Add to Redux store (entity adapter will sort by created_at, so newest appears first)
                dispatch(addCommunityRecipe(communityRecipe));
            }

            setToastMessage('Recipe posted to community successfully!');
            setToastType('success');
            setShowToast(true);
            setShowCommunityModal(false);
        } catch (err) {
            console.error('Error posting to community:', err);
            setToastMessage(err instanceof Error ? err.message : 'Failed to post recipe. Please try again.');
            setToastType('error');
            setShowToast(true);
        } finally {
            setPostingToCommunity(false);
        }
    };

    // Handle Ingredient Replacement
    const handleIngredientReplace = async (ingredientIndices: number[], reason: string) => {
        if (!recipeId || !recipe) {
            alert('Recipe not found. Please refresh the page.');
            return;
        }

        setReplacingIngredients(true);
        setShowSmartReplacementModal(false);

        try {
            const session = await supabase.auth.getSession();
            if (!session.data.session?.access_token) {
                throw new Error('Not authenticated');
            }

            const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

            const response = await fetch(`${backendUrl}/api/recipes/${recipeId}/replace-ingredients`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.data.session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ingredient_indices: ingredientIndices,
                    replacement_reason: reason,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Failed to replace ingredients: ${response.statusText}`);
            }

            const result = await response.json();

            // Update recipe state with updated recipe data
            if (result.recipe) {
                setRecipe({
                    ...recipe,
                    ingredients: result.recipe.ingredients,
                    steps: result.recipe.steps,
                    nutrition: result.recipe.nutrition,
                });

                // Show success toast with Gen-Z style message
                setToastMessage('Ingredient glow-up complete ✨ Your feast just got a smart remix.');
                setToastType('success');
                setShowToast(true);
            }
        } catch (err) {
            console.error('Error replacing ingredients:', err);
            alert(err instanceof Error ? err.message : 'Failed to replace ingredients. Please try again.');
        } finally {
            setReplacingIngredients(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center px-2 sm:px-3 py-4 sm:py-6"
                style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #ffffff 100%)',
                }}
            >
                <div className="text-center">
                    <div className="text-3xl sm:text-4xl md:text-5xl mb-2 sm:mb-3 animate-pulse">🍳</div>
                    <p className="text-xs sm:text-sm md:text-base text-neutral-61">Loading recipe...</p>
                </div>
            </div>
        );
    }

    if (error || !recipe) {
        return (
            <div className="min-h-screen flex items-center justify-center px-2 sm:px-3 py-4 sm:py-6"
                style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #ffffff 100%)',
                }}
            >
                <div className="text-center">
                    <h1 className="text-base sm:text-lg md:text-xl font-bold text-primary mb-2 sm:mb-3">No Recipe Found</h1>
                    <p className="text-xs sm:text-sm text-neutral-75 mb-3 sm:mb-4">{error || 'Please go back and generate a recipe.'}</p>
                    <button
                        onClick={() => navigate('/feast-studio')}
                        className="bg-primary hover:bg-primary-dark text-white font-semibold py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg transition-all duration-200 text-xs sm:text-sm"
                    >
                        Go Back to Feast Studio
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen px-1 sm:px-2 md:px-4 py-1 sm:py-2 md:py-4 lg:py-6"
            style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #ffffff 100%)',
            }}
        >
            <div className="w-full max-w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto">
                <div
                    className="rounded-md sm:rounded-lg md:rounded-xl p-1.5 sm:p-2 md:p-4 lg:p-6 shadow-lg"
                    style={{
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)',
                    }}
                >
                    {/* Recipe Header with Nutrition */}
                    <RecipeHeader
                        title={recipe.title}
                        imageUrl={recipe.image_url}
                        imageBase64={recipe.image_base64}
                        imageLoading={imageLoading}
                        tags={recipe.tags}
                        prepTime={recipe.prep_time}
                        cookTime={recipe.cook_time}
                        servingSize={recipe.serving_size}
                        nutrition={recipe.nutrition}
                    />

                    {/* AI Warning Note */}
                    <div className="mb-1.5 sm:mb-2 md:mb-3 p-1.5 sm:p-2 rounded-md border-l-2 sm:border-l-4"
                        style={{
                            background: 'rgba(255, 243, 205, 0.5)',
                            borderColor: '#f59e0b',
                        }}
                    >
                        <div className="flex items-start gap-1 sm:gap-1.5">
                            <span className="text-sm sm:text-base">⚠️</span>
                            <div>
                                <p className="text-xs font-semibold text-amber-800 mb-0.5">AI-Generated Recipe Disclaimer</p>
                                <p className="text-xs text-amber-700 leading-snug">
                                    This recipe was generated by AI and may contain errors or inaccuracies. Please review all ingredients, measurements, nutrition information and cooking instructions carefully before preparing. The image generated by AI may not be accurate and may not represent the actual recipe. Use your judgment and adjust as needed for your dietary needs and preferences.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="mb-3 sm:mb-3 md:mb-5">
                        <p className="text-neutral-61 py-2 sm:py-3 md:py-4 lg:py-4 text-sm sm:text-base md:text-lg leading-snug sm:leading-relaxed">
                            {recipe.description}
                        </p>
                    </div>

                    {/* Recipe Ingredients - Collapsible */}
                    <RecipeIngredients
                        ingredients={recipe.ingredients}
                        onOpenSmartReplacement={() => setShowSmartReplacementModal(true)}
                    />

                    {/* Recipe Steps - Collapsible */}
                    <RecipeSteps
                        steps={recipe.steps}
                        recipeId={recipe.id}
                    />

                    {/* Recipe Actions - Moved to Bottom */}
                    <RecipeActions
                        recipeId={recipe.id}
                        recipeTitle={recipe.title}
                        recipeDescription={recipe.description}
                        isSaved={isSaved}
                        isLiked={isLiked}
                        isPublic={recipe.is_public}
                        onSave={handleSave}
                        onLike={handleLike}
                        onShare={handleShare}
                        onPostToCommunity={handlePostToCommunity}
                    />

                    {/* Navigation Buttons */}
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center mt-2 sm:mt-3 pt-1.5 sm:pt-2 border-t border-neutral-200">
                        <button
                            onClick={() => {
                                clearRecipeContext();
                                navigate('/feast-studio');
                            }}
                            className="bg-neutral-189 hover:bg-neutral-158 text-neutral-42 font-semibold py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 md:px-5 rounded-lg transition-all duration-200 text-sm sm:text-base"
                        >
                            Back to Feast Studio
                        </button>
                    </div>
                </div>
            </div>

            {/* Smart Ingredient Replacement Modal */}
            <SmartIngredientReplacement
                ingredients={recipe.ingredients}
                isOpen={showSmartReplacementModal}
                onClose={() => setShowSmartReplacementModal(false)}
                onReplace={handleIngredientReplace}
            />

            {/* Recipe Generation Spinner */}
            {replacingIngredients && <RecipeGenerationSpinner />}

            {/* Toast Notification */}
            <Toast
                message={toastMessage}
                type={toastType}
                isVisible={showToast}
                onClose={() => setShowToast(false)}
                duration={5000}
            />

            {/* Community Post Modal */}
            {showCommunityModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowCommunityModal(false)}
                >
                    <div
                        className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 max-w-full sm:max-w-lg md:max-w-2xl w-full max-h-[95vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-2 sm:mb-3">
                            <h2 className="text-base sm:text-lg md:text-xl font-bold text-neutral-42">Post to Community Hub</h2>
                            <button
                                onClick={() => setShowCommunityModal(false)}
                                className="text-lg sm:text-xl text-neutral-61 hover:text-neutral-42"
                            >
                                ×
                            </button>
                        </div>
                        <ShareToCommunityForm
                            onSubmit={handleCommunitySubmit}
                            loading={postingToCommunity}
                            initialTitle={recipe.title}
                            initialDescription={recipe.description}
                            initialTags={recipe.tags || []}
                            initialImageUrl={recipe.image_url || (recipe.image_base64 ? `data:image/jpeg;base64,${recipe.image_base64}` : null)}
                            initialSteps={recipe.steps ? recipe.steps.map((step: any) => ({
                                text: step.instruction || step.text || '',
                                step_type: step.step_type || "active"
                            })) : []}
                            initialIsAiGenerated={true}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}