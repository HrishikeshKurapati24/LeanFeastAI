import { useState, useEffect, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';

interface Recipe {
    id: string;
    title: string;
    description: string;
    meal_type?: string;
    image_url?: string;
    is_public?: boolean;
    is_ai_generated?: boolean;
}

interface LikedRecipesProps {
    likedRecipes: string[];
    likedMeals: Recipe[];
    likedMealsMeta: {
        loaded: boolean;
        isLoading: boolean;
        hasMore: boolean;
        error: string | null;
    };
    onUnlike: (recipeId: string) => void;
    onLoadMore?: () => void;
    onShare?: (recipeId: string) => void;
}

const LikedRecipes = ({ likedRecipes, likedMeals, likedMealsMeta, onUnlike, onLoadMore, onShare }: LikedRecipesProps) => {
    const navigate = useNavigate();
    const [unlikingRecipeId, setUnlikingRecipeId] = useState<string | null>(null);
    const [showUnlikeConfirm, setShowUnlikeConfirm] = useState<string | null>(null);
    const [showShareMenu, setShowShareMenu] = useState<string | null>(null);
    const [publicRecipes, setPublicRecipes] = useState<Map<string, boolean>>(new Map());
    const shareMenuRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // Initialize public recipes state from recipe data
    useEffect(() => {
        const publicMap = new Map<string, boolean>();
        likedMeals.forEach(recipe => {
            if (recipe.is_public !== undefined) {
                publicMap.set(recipe.id, recipe.is_public);
            }
        });
        setPublicRecipes(publicMap);
    }, [likedMeals]);

    // Use likedMeals directly (already filtered from Redux)
    const likedRecipeList = likedMeals.filter((recipe) => likedRecipes.includes(recipe.id));

    const handleRecipeTitleClick = (recipeId: string) => {
        navigate(`/recipe/${recipeId}`);
    };

    const handleCookRecipe = (recipeId: string) => {
        navigate(`/recipe/${recipeId}/FeastGuide`);
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

    const handleUnlikeClick = (recipeId: string) => {
        setShowUnlikeConfirm(recipeId);
    };

    const handleUnlikeConfirm = async (recipeId: string) => {
        setUnlikingRecipeId(recipeId);
        setShowUnlikeConfirm(null);

        try {
            onUnlike(recipeId);
        } catch (error) {
            console.error('Failed to unlike recipe:', error);
            alert('Failed to unlike recipe. Please try again.');
        } finally {
            setUnlikingRecipeId(null);
        }
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

    if (likedRecipeList.length === 0) {
        return (
            <div
                className="rounded-2xl p-8 shadow-lg mb-8"
                style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                }}
            >
                <h2 className="text-2xl font-bold text-primary mb-4">Liked Recipes</h2>
                <div className="text-center py-12">
                    <div className="text-5xl mb-4">❤️</div>
                    <p className="text-neutral-61 mb-4">
                        No liked recipes yet. Start liking recipes to save them here!
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
            <h2 className="text-xl sm:text-2xl font-bold text-primary mb-4 sm:mb-6">Liked Recipes</h2>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                {likedRecipeList.map((recipe) => (
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
                                <div className="w-full h-24 sm:h-32 md:h-40 lg:h-48 bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center">
                                    <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl">❤️</span>
                                </div>
                            )}
                        </div>

                        {/* Recipe Info */}
                        <div className="p-2 sm:p-3 md:p-4">
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                                {recipe.meal_type && (
                                    <span className="inline-block px-1.5 sm:px-2 md:px-3 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                                        {recipe.meal_type}
                                    </span>
                                )}
                                {recipe.is_ai_generated && (
                                    <span className="inline-block px-1.5 sm:px-2 md:px-3 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full border border-red-300">
                                        AI Generated
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

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                <button
                                    onClick={() => handleCookRecipe(recipe.id)}
                                    className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-lg transition-colors"
                                    title="Cook Recipe"
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
                                    onClick={() => handleUnlikeClick(recipe.id)}
                                    disabled={unlikingRecipeId === recipe.id}
                                    className="px-2 sm:px-3 py-1.5 sm:py-2 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                                    title="Unlike"
                                >
                                    {unlikingRecipeId === recipe.id ? '...' : '❤️'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Unlike Confirmation Modal */}
            {showUnlikeConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-primary mb-4">Unlike Recipe?</h3>
                        <p className="text-neutral-61 mb-6">
                            Are you sure you want to unlike &quot;{likedRecipeList.find(r => r.id === showUnlikeConfirm)?.title}&quot;?
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowUnlikeConfirm(null)}
                                className="flex-1 px-4 py-2 border-2 border-neutral-200 hover:border-neutral-300 text-neutral-42 font-semibold rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => showUnlikeConfirm && handleUnlikeConfirm(showUnlikeConfirm)}
                                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors"
                            >
                                Unlike
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default memo(LikedRecipes);