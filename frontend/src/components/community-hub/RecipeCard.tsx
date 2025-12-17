import { useState, useRef, useEffect, useCallback, memo } from "react";
import { motion } from "framer-motion";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { setComments } from "../../store/slices/communitySlice";
import { supabase } from "../../config/supabaseClient";
import defaultRecipeImage from "../../assets/default-recipe.png";

interface Recipe {
    id: string;
    title: string;
    image_url: string;
    description: string;
    tags: string[];
    prep_time: number;
    cook_time: number;
    serving_size: number;
    nutrition: {
        calories: number;
        protein?: number;
        carbs?: number;
        fats?: number;
    };
    likes: number;
    comments_count: number;
    is_public: boolean;
    posted_by?: {
        id: string;
        name: string;
        avatar?: string;
    };
    featured?: boolean;
    is_ai_generated?: boolean;
}

interface RecipeCardProps {
    recipe: Recipe;
    onLike: (id: string) => void;
    onSave: (id: string) => void;
    onShare: (id: string) => void;
    onViewDetails: (id: string) => void;
    isLiked: boolean;
    isSaved: boolean;
    showDeleteButton?: boolean;
    onDelete?: (id: string) => void;
}

const RecipeCard = ({
    recipe,
    onLike,
    onSave,
    onShare,
    onViewDetails,
    isLiked,
    isSaved,
    showDeleteButton = false,
    onDelete,
}: RecipeCardProps) => {
    const dispatch = useAppDispatch();
    const cardRef = useRef<HTMLDivElement>(null);
    const hasFetchedCommentsRef = useRef(false);

    // Check if comments are already cached
    const cachedCommentsData = useAppSelector((state) => state.community.comments[recipe.id]);
    const isCommentsCached = cachedCommentsData?.loaded === true;

    const [isLiking, setIsLiking] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const shareMenuRef = useRef<HTMLDivElement>(null);

    // Lazy fetch comments when card becomes visible or is hovered
    const lazyFetchComments = useCallback(async () => {
        // Don't fetch if already cached or already fetched
        if (isCommentsCached || hasFetchedCommentsRef.current) return;

        hasFetchedCommentsRef.current = true;

        try {
            const session = await supabase.auth.getSession();
            if (!session.data.session?.access_token) {
                return; // Silently fail if not authenticated
            }

            const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(
                `${backendUrl}/api/recipes/${recipe.id}/comments?page=1&limit=20`,
                {
                    headers: {
                        'Authorization': `Bearer ${session.data.session.access_token}`,
                    },
                }
            );

            if (!response.ok) {
                return; // Silently fail
            }

            const result = await response.json();
            const newComments = result.comments || [];

            // Update Redux cache silently
            dispatch(setComments({
                recipeId: recipe.id,
                comments: newComments,
                page: 1,
                hasMore: newComments.length === 20,
            }));
        } catch (err) {
            // Silently fail - don't show errors for lazy loading
            console.debug('Lazy fetch comments failed:', err);
            hasFetchedCommentsRef.current = false; // Allow retry
        }
    }, [recipe.id, isCommentsCached, dispatch]);

    // Intersection Observer for lazy loading when card becomes visible
    useEffect(() => {
        if (!cardRef.current || isCommentsCached) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    lazyFetchComments();
                }
            },
            { threshold: 0.1, rootMargin: '50px' } // Start loading 50px before card is visible
        );

        const currentCard = cardRef.current;
        observer.observe(currentCard);

        return () => {
            if (currentCard) {
                observer.unobserve(currentCard);
            }
        };
    }, [isCommentsCached, lazyFetchComments]);

    // Also fetch on hover (as a backup/prefetch)
    const handleMouseEnter = useCallback(() => {
        if (!isCommentsCached && !hasFetchedCommentsRef.current) {
            // Debounce hover fetch
            setTimeout(() => {
                lazyFetchComments();
            }, 500);
        }
    }, [isCommentsCached, lazyFetchComments]);

    const handleLike = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isLiking) return;
        setIsLiking(true);
        onLike(recipe.id);
        setTimeout(() => setIsLiking(false), 300);
    };

    const handleSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isSaving) return;
        setIsSaving(true);
        onSave(recipe.id);
        setTimeout(() => setIsSaving(false), 300);
    };

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowShareMenu(!showShareMenu);
    };

    const shareViaEmail = (e: React.MouseEvent) => {
        e.stopPropagation();
        const recipeUrl = `${window.location.origin}/recipe/${recipe.id}`;
        const subject = encodeURIComponent(`Check out this recipe: ${recipe.title}`);
        const body = encodeURIComponent(`${recipe.description}\n\nView the full recipe here: ${recipeUrl}`);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
        onShare(recipe.id); // Track share event
        setShowShareMenu(false);
    };

    const shareViaWhatsApp = (e: React.MouseEvent) => {
        e.stopPropagation();
        const recipeUrl = `${window.location.origin}/recipe/${recipe.id}`;
        const text = encodeURIComponent(`Check out this recipe: ${recipe.title}\n\n${recipe.description}\n\n${recipeUrl}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
        onShare(recipe.id); // Track share event
        setShowShareMenu(false);
    };

    const shareViaNative = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const shareData = {
            title: recipe.title,
            text: recipe.description,
            url: `${window.location.origin}/recipe/${recipe.id}`,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
                onShare(recipe.id); // Track share event
            } else {
                await copyToClipboard(shareData.url);
                onShare(recipe.id); // Track share event
            }
        } catch (error) {
            if ((error as Error).name !== "AbortError") {
                await copyToClipboard(shareData.url);
                onShare(recipe.id); // Track share event
            }
        }
        setShowShareMenu(false);
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            alert("Recipe link copied to clipboard!");
        } catch (error) {
            console.error("Failed to copy:", error);
            alert("Failed to copy link. Please try again.");
        }
    };

    // Close share menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
                setShowShareMenu(false);
            }
        };

        if (showShareMenu) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showShareMenu]);

    const handleViewDetails = () => {
        onViewDetails(recipe.id);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDelete) {
            onDelete(recipe.id);
        }
    };

    const totalTime = recipe.prep_time + recipe.cook_time;

    return (
        <div
            ref={cardRef}
            className="bg-white rounded-lg sm:rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-[1.01]"
            onClick={handleViewDetails}
            onMouseEnter={handleMouseEnter}
            role="article"
            aria-label={`Recipe: ${recipe.title}`}
        >
            {/* Hero Image Section */}
            <div className="relative h-12 sm:h-16 md:h-24 lg:h-32 xl:h-40 overflow-hidden">
                <img
                    src={recipe.image_url || defaultRecipeImage}
                    alt={recipe.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = defaultRecipeImage;
                    }}
                />
                {/* Gradient Overlay for Tags */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                {/* Tags Overlay (Top Left) */}
                <div className="absolute top-1 left-1 sm:top-2 sm:left-2 flex flex-wrap gap-1">
                    {/* AI Generated Tag - Always first */}
                    {recipe.is_ai_generated && (
                        <span className="px-1 sm:px-1.5 py-0.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full text-xs font-bold shadow-md">
                            ✨ AI Generated
                        </span>
                    )}
                    {/* Regular Tags - Show 1 if AI Generated is present, otherwise show 2 */}
                    {recipe.tags && recipe.tags.length > 0 && (
                        <>
                            {recipe.tags.slice(0, recipe.is_ai_generated ? 1 : 2).map((tag, index) => (
                                <span
                                    key={index}
                                    className="px-1 sm:px-1.5 py-0.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-neutral-42"
                                >
                                    {tag}
                                </span>
                            ))}
                        </>
                    )}
                </div>

                {/* Optional Featured/Trending Ribbon (Top Right) */}
                {(recipe.likes > 50 || recipe.featured) && (
                    <div className="absolute top-1 right-1 sm:top-2 sm:right-2 z-10">
                        <span className="px-1 sm:px-1.5 py-0.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full text-xs font-bold shadow-md">
                            {recipe.featured ? '⭐ Featured' : '🔥 Trending'}
                        </span>
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="p-1 sm:p-1.5 md:p-2 lg:p-3 space-y-1 sm:space-y-1.5 md:space-y-2">
                {/* Meta Row */}
                <div className="flex items-center justify-between text-xs text-neutral-61">
                    <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 flex-wrap">
                        {totalTime > 0 && (
                            <span className="flex items-center gap-0.5">
                                <span className="text-xs">⏱️</span>
                                <span className="text-xs">{totalTime}m</span>
                            </span>
                        )}
                        <span className="flex items-center gap-0.5">
                            <span className="text-xs">👥</span>
                            <span className="text-xs">{recipe.serving_size}</span>
                        </span>
                        {recipe.nutrition?.calories !== 0 && Number(recipe.nutrition.calories) > 0 && (
                            <span className="flex items-center gap-0.5 px-1 py-0.5 bg-neutral-245 rounded-full text-xs">
                                <span>🔥</span>
                                <span>{recipe.nutrition.calories} cal</span>
                            </span>
                        )}
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-xs sm:text-sm md:text-base font-bold text-neutral-42 line-clamp-1">
                    {recipe.title}
                </h2>

                {/* Description */}
                <p className="text-xs text-neutral-61 line-clamp-2 min-h-[1.5rem] sm:min-h-[2rem]">
                    {recipe.description}
                </p>

                {/* Action Row */}
                <div className="flex items-center justify-between pt-1 sm:pt-1.5 border-t border-neutral-200 relative overflow-visible">
                    {/* Left: Action Icons */}
                    <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 overflow-visible">
                        {/* Like Button */}
                        <motion.button
                            onClick={handleLike}
                            className="flex items-center gap-0.5 min-w-[24px] sm:min-w-[28px] md:min-w-[32px] min-h-[24px] sm:min-h-[28px] md:min-h-[32px] justify-center transition-transform duration-200 hover:scale-110 active:scale-125"
                            aria-label={isLiked ? "Unlike recipe" : "Like recipe"}
                            title={isLiked ? "Unlike" : "Like"}
                            whileTap={{ scale: 0.9 }}
                        >
                            <motion.span
                                className={`text-sm sm:text-base md:text-lg transition-all duration-200 ${isLiked ? 'text-red-500' : 'text-neutral-61'}`}
                                animate={isLiking ? { scale: [1, 1.3, 1] } : {}}
                                transition={{ duration: 0.3 }}
                            >
                                {isLiked ? '❤️' : '🤍'}
                            </motion.span>
                            <span className="text-xs text-neutral-61 hidden sm:inline">{recipe.likes}</span>
                        </motion.button>

                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-0.5 min-w-[24px] sm:min-w-[28px] md:min-w-[32px] min-h-[24px] sm:min-h-[28px] md:min-h-[32px] justify-center transition-transform duration-200 hover:scale-110 active:scale-125"
                            aria-label={isSaved ? "Unsave recipe" : "Save recipe"}
                            title={isSaved ? "Unsave" : "Save for later"}
                        >
                            <span className={`text-sm sm:text-base md:text-lg transition-all duration-200 ${isSaving ? 'scale-125' : ''} ${isSaved ? 'text-primary' : 'text-neutral-61'}`}>
                                {isSaved ? '🔖' : '📌'}
                            </span>
                        </button>

                        {/* Comment Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails();
                            }}
                            className="flex items-center gap-0.5 min-w-[24px] sm:min-w-[28px] md:min-w-[32px] min-h-[24px] sm:min-h-[28px] md:min-h-[32px] justify-center transition-transform duration-200 hover:scale-110"
                            aria-label="View comments"
                            title="Comments"
                        >
                            <span className="text-sm sm:text-base md:text-lg">💬</span>
                            <span className="text-xs text-neutral-61 hidden sm:inline">{recipe.comments_count}</span>
                        </button>

                        {/* Share Button */}
                        <div className="relative" ref={shareMenuRef}>
                            <button
                                onClick={handleShare}
                                className="flex items-center gap-0.5 min-w-[24px] sm:min-w-[28px] md:min-w-[32px] min-h-[24px] sm:min-h-[28px] md:min-h-[32px] justify-center transition-transform duration-200 hover:scale-110"
                                aria-label="Share recipe"
                                title="Share"
                                aria-expanded={showShareMenu}
                            >
                                <span className="text-sm sm:text-base md:text-lg">🔗</span>
                            </button>
                            {showShareMenu && (
                                <div className="absolute bottom-full right-0 mb-1 w-32 sm:w-40 bg-white rounded-md sm:rounded-lg shadow-lg border border-neutral-200 z-[10000] py-1">
                                    <button
                                        onClick={shareViaNative}
                                        className="w-full px-2 sm:px-3 py-1.5 text-left hover:bg-neutral-50 flex items-center gap-1.5 sm:gap-2 transition-colors text-xs sm:text-sm"
                                        aria-label="Share via native share"
                                    >
                                        <span className="text-base sm:text-lg">📱</span>
                                        <span className="text-neutral-42">Share</span>
                                    </button>
                                    <button
                                        onClick={shareViaEmail}
                                        className="w-full px-2 sm:px-3 py-1.5 text-left hover:bg-neutral-50 flex items-center gap-1.5 sm:gap-2 transition-colors text-xs sm:text-sm"
                                        aria-label="Share via email"
                                    >
                                        <span className="text-base sm:text-lg">📧</span>
                                        <span className="text-neutral-42">Email</span>
                                    </button>
                                    <button
                                        onClick={shareViaWhatsApp}
                                        className="w-full px-2 sm:px-3 py-1.5 text-left hover:bg-neutral-50 flex items-center gap-1.5 sm:gap-2 transition-colors text-xs sm:text-sm"
                                        aria-label="Share via WhatsApp"
                                    >
                                        <span className="text-base sm:text-lg">💬</span>
                                        <span className="text-neutral-42">WhatsApp</span>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            copyToClipboard(`${window.location.origin}/recipe/${recipe.id}`);
                                            onShare(recipe.id); // Track share event
                                            setShowShareMenu(false);
                                        }}
                                        className="w-full px-2 sm:px-3 py-1.5 text-left hover:bg-neutral-50 flex items-center gap-1.5 sm:gap-2 transition-colors text-xs sm:text-sm"
                                        aria-label="Copy link"
                                    >
                                        <span className="text-base sm:text-lg">📋</span>
                                        <span className="text-neutral-42">Copy Link</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Delete Button - Only shown when showDeleteButton is true */}
                        {showDeleteButton && onDelete && (
                            <button
                                onClick={handleDelete}
                                className="flex items-center gap-0.5 min-w-[24px] sm:min-w-[28px] md:min-w-[32px] min-h-[24px] sm:min-h-[28px] md:min-h-[32px] justify-center transition-transform duration-200 hover:scale-110 active:scale-125"
                                aria-label="Delete recipe from community"
                                title="Remove from community"
                            >
                                <span className="text-sm sm:text-base md:text-lg text-red-500 hover:text-red-600">🗑️</span>
                            </button>
                        )}
                    </div>

                    {/* Right: View CTA */}
                    <button
                        onClick={handleViewDetails}
                        className="px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-md sm:rounded-lg transition-all duration-200 min-w-[28px] sm:min-w-[32px] md:min-w-[36px] min-h-[24px] sm:min-h-[28px] md:min-h-[32px] flex items-center justify-center"
                        aria-label="View recipe details"
                    >
                        View
                    </button>
                </div>
            </div>
        </div>
    );
};

export default memo(RecipeCard);