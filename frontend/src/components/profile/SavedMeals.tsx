import { useState, useEffect, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { supabase } from '../../config/supabaseClient';
import ShareToCommunityForm from './SaveToProfile';
import Toast from '../Toast';
import { addSavedMeal } from '../../store/slices/savedMealsSlice';
import { updateProfile } from '../../store/slices/userProfileSlice';
import { selectProfile } from '../../store/selectors/userSelectors';

interface Recipe {
    id: string;
    title: string;
    description: string;
    meal_type?: string;
    image_url?: string;
    is_public?: boolean;
    is_ai_generated?: boolean;
}

interface SavedMealsProps {
    savedRecipes: string[];
    savedMeals: Recipe[];
    savedMealsMeta: {
        loaded: boolean;
        isLoading: boolean;
        hasMore: boolean;
        error: string | null;
    };
    onUnsave: (recipeId: string) => void;
    onLoadMore?: () => void;
    onShare?: (recipeId: string) => void;
}

const SavedMeals = ({ savedRecipes, savedMeals, savedMealsMeta, onUnsave, onLoadMore, onShare }: SavedMealsProps) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const dispatch = useAppDispatch();
    const profile = useAppSelector(selectProfile);
    const [unsavingRecipeId, setUnsavingRecipeId] = useState<string | null>(null);
    const [showUnsaveConfirm, setShowUnsaveConfirm] = useState<string | null>(null);
    const [showShareMenu, setShowShareMenu] = useState<string | null>(null);
    const [publicRecipes, setPublicRecipes] = useState<Map<string, boolean>>(new Map());
    const shareMenuRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [showAddRecipeModal, setShowAddRecipeModal] = useState(false);
    const [isSubmittingRecipe, setIsSubmittingRecipe] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    // Initialize public recipes state from recipe data
    useEffect(() => {
        const publicMap = new Map<string, boolean>();
        savedMeals.forEach(recipe => {
            if (recipe.is_public !== undefined) {
                publicMap.set(recipe.id, recipe.is_public);
            }
        });
        setPublicRecipes(publicMap);
    }, [savedMeals]);

    // Use savedMeals directly (already filtered from Redux)
    const savedRecipeList = savedMeals.filter((recipe) => savedRecipes.includes(recipe.id));

    const handleOptimize = async (recipe: Recipe) => {
        try {
            // Fetch full recipe data including ingredients and steps
            const session = await supabase.auth.getSession();
            if (!session.data.session?.access_token) {
                alert('Please log in to optimize recipes.');
                return;
            }

            const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${backendUrl}/api/recipes/${recipe.id}`, {
                headers: {
                    'Authorization': `Bearer ${session.data.session.access_token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch recipe: ${response.statusText}`);
            }

            const result = await response.json();
            const fullRecipe = result.recipe;

            // Navigate to feast-studio with full recipe data
            navigate('/feast-studio', {
                state: {
                    optimizeRecipeData: fullRecipe,
                    mode: 'optimize',
                },
            });
        } catch (error) {
            console.error('Error fetching recipe for optimization:', error);
            alert('Failed to load recipe data. Please try again.');
        }
    };

    const handleCookMode = (recipeId: string) => {
        navigate(`/recipe/${recipeId}/FeastGuide`);
    };

    const handleRecipeTitleClick = (recipeId: string) => {
        navigate(`/recipe/${recipeId}`);
    };

    const handleShareClick = (recipeId: string) => {
        // Open share menu immediately
        setShowShareMenu(showShareMenu === recipeId ? null : recipeId);

        // Make recipe public in the background (fire-and-forget) only if not already public
        const isPublic = publicRecipes.get(recipeId) || false;
        if (!isPublic) {
            (async () => {
                try {
                    const session = await supabase.auth.getSession();
                    if (session.data.session?.access_token) {
                        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                        const response = await fetch(`${backendUrl}/api/recipes/${recipeId}/make-public`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${session.data.session.access_token}`,
                            },
                        });

                        if (!response.ok) {
                            console.error('Failed to make recipe public:', response.statusText);
                        } else {
                            setPublicRecipes(prev => new Map(prev).set(recipeId, true));
                        }
                    }
                } catch (error) {
                    console.error('Error making recipe public:', error);
                }
            })();
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            alert('Recipe link copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy:', error);
            alert('Failed to copy link. Please try again.');
        }
    };

    const shareViaEmail = (recipe: Recipe) => {
        const recipeUrl = `${window.location.origin}/recipe/${recipe.id}`;
        const subject = encodeURIComponent(`Check out this recipe: ${recipe.title}`);
        const body = encodeURIComponent(`${recipe.description}\n\nView the full recipe here: ${recipeUrl}`);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
        if (onShare) onShare(recipe.id);
        setShowShareMenu(null);
    };

    const shareViaWhatsApp = (recipe: Recipe) => {
        const recipeUrl = `${window.location.origin}/recipe/${recipe.id}`;
        const text = encodeURIComponent(`Check out this recipe: ${recipe.title}\n\n${recipe.description}\n\n${recipeUrl}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
        if (onShare) onShare(recipe.id);
        setShowShareMenu(null);
    };

    const shareViaNative = async (recipe: Recipe) => {
        const shareData = {
            title: recipe.title,
            text: recipe.description,
            url: `${window.location.origin}/recipe/${recipe.id}`,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
                if (onShare) onShare(recipe.id);
            } else {
                await copyToClipboard(shareData.url);
                if (onShare) onShare(recipe.id);
            }
        } catch (error) {
            if ((error as Error).name !== 'AbortError') {
                await copyToClipboard(shareData.url);
                if (onShare) onShare(recipe.id);
            }
        }
        setShowShareMenu(null);
    };

    // Close share menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            shareMenuRefs.current.forEach((ref, recipeId) => {
                if (ref && !ref.contains(event.target as Node)) {
                    if (showShareMenu === recipeId) {
                        setShowShareMenu(null);
                    }
                }
            });
        };

        if (showShareMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showShareMenu]);

    const handleUnsaveClick = (recipeId: string) => {
        setShowUnsaveConfirm(recipeId);
    };

    const handleUnsaveConfirm = async (recipeId: string) => {
        setUnsavingRecipeId(recipeId);
        setShowUnsaveConfirm(null);

        try {
            onUnsave(recipeId);
        } catch (error) {
            console.error('Failed to unsave recipe:', error);
            alert('Failed to unsave recipe. Please try again.');
        } finally {
            setUnsavingRecipeId(null);
        }
    };

    const handleAddRecipeSubmit = async (formData: {
        image: File | null;
        title: string;
        description: string;
        tags: string[];
        isAiGenerated: boolean;
        steps?: Array<{ text: string; step_type?: string }>;
    }) => {
        if (!user?.id) {
            setToastMessage('Please log in to save recipes');
            setToastType('error');
            setShowToast(true);
            return;
        }

        setIsSubmittingRecipe(true);

        try {
            const session = await supabase.auth.getSession();
            if (!session.data.session?.access_token) {
                throw new Error('Not authenticated');
            }

            const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

            // Convert image to base64 if provided
            let imageBase64: string | null = null;
            if (formData.image) {
                imageBase64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64String = reader.result as string;
                        // Remove data URL prefix if present
                        const base64 = base64String.includes(',')
                            ? base64String.split(',')[1]
                            : base64String;
                        resolve(base64);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(formData.image!);
                });
            }

            // Prepare request body
            const requestBody = {
                title: formData.title,
                description: formData.description,
                tags: formData.tags,
                ingredients: [], // Empty for now, can be added later
                steps: formData.steps || [],
                prep_time: 0, // Default values, can be added to form later
                cook_time: 0,
                serving_size: 1,
                nutrition: {},
                isAiGenerated: formData.isAiGenerated || false,
                image_base64: imageBase64,
            };

            const response = await fetch(`${backendUrl}/api/recipes/create-and-save`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.data.session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: response.statusText }));
                throw new Error(errorData.detail || 'Failed to save recipe');
            }

            const result = await response.json();
            const savedRecipe = result.recipe;

            // Transform recipe to UserRecipe format for Redux
            const userRecipe = {
                id: savedRecipe.id,
                user_id: user.id,
                title: savedRecipe.title,
                description: savedRecipe.description || '',
                meal_type: formData.tags[0] || undefined,
                image_url: savedRecipe.image_url || undefined,
                created_at: savedRecipe.created_at || new Date().toISOString(),
                is_ai_generated: savedRecipe.is_ai_generated || false,
            };

            // Update Redux store
            dispatch(addSavedMeal(userRecipe));

            // Update profile's saved_recipes array
            if (profile) {
                const updatedSavedRecipes = [...(profile.saved_recipes || []), savedRecipe.id];
                dispatch(updateProfile({ user_id: user.id, saved_recipes: updatedSavedRecipes }));
            }

            // Show success toast
            setToastMessage('Recipe saved successfully! 🍽️');
            setToastType('success');
            setShowToast(true);

            // Close modal
            setShowAddRecipeModal(false);
        } catch (error) {
            console.error('Error saving recipe:', error);
            setToastMessage(error instanceof Error ? error.message : 'Failed to save recipe. Please try again.');
            setToastType('error');
            setShowToast(true);
        } finally {
            setIsSubmittingRecipe(false);
        }
    };

    if (savedRecipeList.length === 0) {
        return (
            <div
                className="rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg mb-4 sm:mb-6 md:mb-8"
                style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                }}
            >
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-primary">Saved Meals (Your Cookbook)</h2>
                    <button
                        onClick={() => setShowAddRecipeModal(true)}
                        className="px-2 sm:px-3 py-1 sm:py-1.5 bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                    >
                        Save your own recipe
                    </button>
                </div>
                <div className="text-center py-8 sm:py-12">
                    <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🍽️</div>
                    <p className="text-sm sm:text-base text-neutral-61 mb-3 sm:mb-4">
                        No saved recipes yet. Start saving your favorite recipes to build your cookbook!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg mb-4 sm:mb-6 md:mb-8"
            style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
            }}
        >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-primary">Saved Meals (Your Cookbook)</h2>
                <button
                    onClick={() => setShowAddRecipeModal(true)}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                >
                    Save your own recipe
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                {savedRecipeList.map((recipe) => (
                    <div
                        key={recipe.id}
                        className="bg-white rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-shadow"
                    >
                        {/* Recipe Image */}
                        <div className="overflow-hidden rounded-t-lg sm:rounded-t-xl">
                            {recipe.image_url ? (
                                <img
                                    src={recipe.image_url}
                                    alt={recipe.title}
                                    className="w-full h-24 sm:h-32 md:h-40 lg:h-48 object-cover"
                                />
                            ) : (
                                <div className="w-full h-24 sm:h-32 md:h-40 lg:h-48 bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                                    <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl">🍽️</span>
                                </div>
                            )}
                        </div>

                        {/* Recipe Info */}
                        <div className="p-2 sm:p-3 md:p-4">
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                                {recipe.meal_type && (
                                    <span className="inline-block px-1.5 sm:px-2 md:px-3 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                                        {recipe.meal_type}
                                    </span>
                                )}
                                {recipe.is_ai_generated && (
                                    <span className="inline-block px-1.5 sm:px-2 md:px-3 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full border border-primary/30">
                                        ✨ AI Generated
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => handleRecipeTitleClick(recipe.id)}
                                className="text-sm sm:text-base md:text-lg font-bold text-primary mb-1.5 sm:mb-2 line-clamp-2 text-left w-full hover:text-primary-dark transition-colors cursor-pointer"
                                aria-label={`View recipe: ${recipe.title}`}
                            >
                                {recipe.title}
                            </button>
                            <p className="text-xs text-neutral-61 mb-2 sm:mb-3 md:mb-4 line-clamp-2">
                                {recipe.description}
                            </p>

                            {/* Action Buttons - Scrollable on mobile */}
                            <div className="flex gap-1 sm:gap-1.5 overflow-x-auto sm:overflow-visible flex-nowrap sm:flex-wrap pb-1 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0">
                                <button
                                    onClick={() => handleOptimize(recipe)}
                                    className="flex-shrink-0 px-2 sm:px-3 py-1.5 sm:py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                                    title="Optimize Meal"
                                >
                                    🔁 Optimize
                                </button>
                                <button
                                    onClick={() => handleCookMode(recipe.id)}
                                    className="flex-shrink-0 px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                                    title="Cook Mode"
                                >
                                    🔊 Cook
                                </button>
                                <div className="relative" ref={(el) => {
                                    if (el) shareMenuRefs.current.set(recipe.id, el);
                                }}>
                                    <button
                                        onClick={() => handleShareClick(recipe.id)}
                                        className="px-2 sm:px-3 py-1.5 sm:py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-42 text-xs font-semibold rounded-lg transition-colors min-w-[36px] sm:min-w-[44px] min-h-[36px] sm:min-h-[44px] flex items-center justify-center"
                                        title="Share"
                                        aria-label="Share recipe"
                                        aria-expanded={showShareMenu === recipe.id}
                                    >
                                        🔗
                                    </button>
                                    {showShareMenu === recipe.id && (
                                        <div className="absolute bottom-full right-0 mb-2 w-40 sm:w-48 bg-white rounded-lg sm:rounded-xl shadow-lg border border-neutral-200 z-[10000] py-2">
                                            <button
                                                onClick={() => shareViaNative(recipe)}
                                                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-left hover:bg-neutral-50 flex items-center gap-2 sm:gap-3 transition-colors text-sm"
                                                aria-label="Share via native share"
                                            >
                                                <span className="text-lg sm:text-xl">📱</span>
                                                <span className="text-neutral-42">Share</span>
                                            </button>
                                            <button
                                                onClick={() => shareViaEmail(recipe)}
                                                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-left hover:bg-neutral-50 flex items-center gap-2 sm:gap-3 transition-colors text-sm"
                                                aria-label="Share via email"
                                            >
                                                <span className="text-lg sm:text-xl">📧</span>
                                                <span className="text-neutral-42">Email</span>
                                            </button>
                                            <button
                                                onClick={() => shareViaWhatsApp(recipe)}
                                                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-left hover:bg-neutral-50 flex items-center gap-2 sm:gap-3 transition-colors text-sm"
                                                aria-label="Share via WhatsApp"
                                            >
                                                <span className="text-lg sm:text-xl">💬</span>
                                                <span className="text-neutral-42">WhatsApp</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    copyToClipboard(`${window.location.origin}/recipe/${recipe.id}`);
                                                    if (onShare) onShare(recipe.id);
                                                    setShowShareMenu(null);
                                                }}
                                                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-left hover:bg-neutral-50 flex items-center gap-2 sm:gap-3 transition-colors text-sm"
                                                aria-label="Copy link"
                                            >
                                                <span className="text-lg sm:text-xl">📋</span>
                                                <span className="text-neutral-42">Copy Link</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleUnsaveClick(recipe.id)}
                                    disabled={unsavingRecipeId === recipe.id}
                                    className="flex-shrink-0 px-2 sm:px-3 py-1.5 sm:py-2 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 min-w-[36px] sm:min-w-[44px] min-h-[36px] sm:min-h-[44px] flex items-center justify-center"
                                    title="Unsave"
                                >
                                    {unsavingRecipeId === recipe.id ? '...' : '❌'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Unsave Confirmation Modal - rendered outside the grid */}
            {showUnsaveConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-primary mb-4">Unsave Recipe?</h3>
                        <p className="text-neutral-61 mb-6">
                            Are you sure you want to remove &quot;{savedRecipeList.find(r => r.id === showUnsaveConfirm)?.title}&quot; from your saved recipes?
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowUnsaveConfirm(null)}
                                className="flex-1 px-4 py-2 border-2 border-neutral-200 hover:border-neutral-300 text-neutral-42 font-semibold rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => showUnsaveConfirm && handleUnsaveConfirm(showUnsaveConfirm)}
                                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors"
                            >
                                Unsave
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Recipe Modal */}
            <AnimatePresence>
                {showAddRecipeModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isSubmittingRecipe && setShowAddRecipeModal(false)}
                            className="fixed inset-0 bg-black/50 z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                                <div className="sticky top-0 bg-white border-b border-neutral-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10">
                                    <h3 className="text-lg sm:text-xl font-bold text-primary">Save Your Own Recipe</h3>
                                    <button
                                        onClick={() => !isSubmittingRecipe && setShowAddRecipeModal(false)}
                                        disabled={isSubmittingRecipe}
                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-200 hover:bg-neutral-300 transition-colors text-neutral-61 disabled:opacity-50"
                                        aria-label="Close modal"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="p-4 sm:p-6">
                                    <ShareToCommunityForm
                                        onSubmit={handleAddRecipeSubmit}
                                        loading={isSubmittingRecipe}
                                        initialIsAiGenerated={false}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Toast Notification */}
            <Toast
                message={toastMessage}
                type={toastType}
                isVisible={showToast}
                onClose={() => setShowToast(false)}
                duration={3000}
            />
        </div>
    );
};

export default memo(SavedMeals);