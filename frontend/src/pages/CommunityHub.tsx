import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import RecipeCard from "../components/community-hub/RecipeCard";
import RecipeDetailsModal from "../components/community-hub/RecipeDetailsModal";
import CommentsModal from "../components/community-hub/CommentsModal";
import ShareMyFeastFAB from "../components/community-hub/ShareMyFeastFAB";
import ShareMyFeastModal from "../components/community-hub/ShareMyFeastModal";
import DeleteRecipeModal from "../components/community-hub/DeleteRecipeModal";
import FloatingFoodIcons from "../components/FloatingFoodIcons";
import { useNavigate } from "react-router-dom";
import { supabase } from "../config/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectCommunityRecipes, selectCommunityMeta, selectProfile } from "../store/selectors/userSelectors";
import { fetchCommunity } from "../store/thunks/userThunks";
import { updateCommunityRecipe, addCommunityRecipe } from "../store/slices/communitySlice";
import { fetchUserPostedRecipes, fetchCommunityRecipes, deleteRecipeFromCommunity, type CommunityRecipe } from "../utils/communityApi";
import { likeRecipeOptimistic, unlikeRecipeOptimistic, saveRecipeOptimistic, unsaveRecipeOptimistic } from "../store/thunks/userThunks";

/**
 * Future Backend Integration Points:
 * 
 * POST /recipes/:id/like - Toggle like on a recipe
 * POST /recipes/:id/save - Toggle save/bookmark on a recipe
 * POST /recipes/:id/share - Generate share link for a recipe
 * GET /recipes/:id/details - Get full recipe details with steps and ingredients
 * POST /recipes/:id/comments - Add a comment to a recipe
 * POST /recipes/:id/tts - Request TTS audio for Feast Guide instructions
 */

interface RecipeStep {
    text: string;
    instruction?: string;
    step_type?: "active" | "passive" | "wait";
}

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
    ingredients: string[];
    steps: RecipeStep[];
    likes: number;
    views?: number;
    shares?: number;
    comments_count: number;
    is_public: boolean;
    posted_by?: {
        id: string;
        name: string;
        avatar?: string;
    };
    created_at?: string;
    featured?: boolean;
    is_ai_generated?: boolean;
    comments?: Array<{
        id: string;
        user: string;
        text: string;
        created_at: string;
    }>;
}

import defaultRecipeImage from "../assets/default-recipe.png";

// Helper function to transform backend recipe to frontend Recipe format
const transformRecipe = (backendRecipe: CommunityRecipe): Recipe => {
    return {
        id: backendRecipe.id,
        title: backendRecipe.title,
        image_url: backendRecipe.image_url || defaultRecipeImage,
        description: backendRecipe.description || "",
        tags: backendRecipe.tags || [],
        prep_time: backendRecipe.prep_time ?? 0,
        cook_time: backendRecipe.cook_time ?? 0,
        serving_size: backendRecipe.serving_size ?? 1,
        nutrition: {
            calories: backendRecipe.nutrition?.calories || 0,
            protein: backendRecipe.nutrition?.protein,
            carbs: backendRecipe.nutrition?.carbs,
            fats: backendRecipe.nutrition?.fats,
        },
        ingredients: Array.isArray(backendRecipe.ingredients) ? backendRecipe.ingredients : [],
        steps: Array.isArray(backendRecipe.steps) ? backendRecipe.steps : [],
        likes: backendRecipe.likes || 0,
        views: backendRecipe.views || 0,
        shares: backendRecipe.shares || 0,
        comments_count: backendRecipe.comments_count || 0,
        is_public: backendRecipe.is_public || false,
        posted_by: backendRecipe.posted_by ? {
            id: backendRecipe.posted_by.id,
            name: backendRecipe.posted_by.name,
            avatar: backendRecipe.posted_by.avatar || undefined,
        } : undefined,
        created_at: backendRecipe.created_at,
        featured: backendRecipe.featured || false,
        is_ai_generated: backendRecipe.is_ai_generated ?? false,
        comments: [],
    };
};

type TabType = "all" | "trending" | "new" | "popular" | "favorites" | "posted-by-you";

// Helper function to calculate trending score (same as backend)
// Formula: (likes*2 + shares*1.5 + comments*1) / (hours_since_created + 1)
const calculateTrendingScore = (recipe: Recipe): number => {
    const likes = recipe.likes || 0;
    const shares = recipe.shares || 0;
    const comments = recipe.comments_count || 0;

    const created_at = recipe.created_at;
    if (!created_at) return 0;

    try {
        const created_dt = new Date(created_at);
        const hours_since = (Date.now() - created_dt.getTime()) / (1000 * 60 * 60);
        const engagement = (likes * 2 + shares * 1.5 + comments * 1);
        return engagement / (hours_since + 1);
    } catch {
        return 0;
    }
};

// Helper function to calculate popular/engagement score (same as backend)
// Formula: likes*2 + views*0.3 + shares*1.5 + comments*1
const calculatePopularScore = (recipe: Recipe): number => {
    const likes = recipe.likes || 0;
    const views = recipe.views || 0;
    const shares = recipe.shares || 0;
    const comments = recipe.comments_count || 0;

    return (likes * 2 + views * 0.3 + shares * 1.5 + comments * 1);
};


// Extended Recipe interface for sorting
interface RecipeWithScore extends Recipe {
    _trending_score?: number;
    _popular_score?: number;
}

export default function CommunityHub() {
    const navigate = useNavigate();
    const { user } = useAuth();
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
    const communityRecipes = useAppSelector(selectCommunityRecipes);
    const communityMeta = useAppSelector(selectCommunityMeta);
    const profile = useAppSelector(selectProfile);

    const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const likedRecipes = useMemo(() => new Set(profile?.liked_recipes || []), [profile?.liked_recipes]);
    const savedRecipes = useMemo(() => new Set(profile?.saved_recipes || []), [profile?.saved_recipes]);
    const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
    const [commentsModalRecipeId, setCommentsModalRecipeId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareLoading, setShareLoading] = useState(false);
    const [deleteModalRecipe, setDeleteModalRecipe] = useState<Recipe | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>("all");
    const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const observerTarget = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Profile is already loaded from Redux via useUserStoreInitialization hook

    // Fetch recipes based on active tab, filters, and search
    useEffect(() => {
        const loadRecipes = async () => {
            if (!user?.id) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);
            setCurrentPage(1);

            try {
                let sortType: 'newest' | 'trending' | 'popular' = 'newest';

                // Determine sort type based on active tab
                if (activeTab === "trending") {
                    sortType = "trending";
                } else if (activeTab === "popular") {
                    sortType = "popular";
                } else if (activeTab === "new" || activeTab === "all" || activeTab === "favorites") {
                    sortType = "newest";
                } else if (activeTab === "posted-by-you") {
                    // Fetch user's posted recipes (not in Redux)
                    const response = await fetchUserPostedRecipes(user.id, 1, 20, sortType);
                    if (response) {
                        const recipesArray = Array.isArray(response.recipes) ? response.recipes : [];
                        const transformedRecipes = recipesArray.map(transformRecipe);
                        setRecipes(transformedRecipes);
                        setAllRecipes(transformedRecipes);
                        setHasMore(response.has_more || false);
                    } else {
                        setRecipes([]);
                        setAllRecipes([]);
                        setHasMore(false);
                    }
                } else {
                    // For "all", "new", "favorites", and "trending" tabs, use Redux community recipes with client-side filtering
                    // First, ensure we have data loaded (fetch if needed)
                    // For "all", "new", and "favorites", fetch with "newest" sort
                    // For "trending", fetch with "trending" sort (but we'll re-sort client-side too)
                    const needsTrending = activeTab === "trending";
                    const needsNewest = activeTab === "all" || activeTab === "new" || activeTab === "favorites";

                    const needsPopular = activeTab === "popular";

                    if (!communityMeta.loaded) {
                        await dispatch(fetchCommunity({ page: 1, sort: sortType, filters: {} }));
                    } else if (needsTrending && communityMeta.sort !== "trending") {
                        await dispatch(fetchCommunity({ page: 1, sort: "trending", filters: {} }));
                    } else if (needsPopular && communityMeta.sort !== "popular") {
                        await dispatch(fetchCommunity({ page: 1, sort: "popular", filters: {} }));
                    } else if (needsNewest && communityMeta.sort !== "newest") {
                        await dispatch(fetchCommunity({ page: 1, sort: "newest", filters: {} }));
                    }

                    // Transform Redux recipes
                    let filteredRecipes = communityRecipes.map(transformRecipe);

                    // Apply client-side sorting based on active tab (same as backend logic)
                    if (activeTab === "trending") {
                        // Sort by trending score (same algorithm as backend)
                        const recipesWithScore: RecipeWithScore[] = filteredRecipes.map(recipe => ({
                            ...recipe,
                            _trending_score: calculateTrendingScore(recipe)
                        }));
                        recipesWithScore.sort((a, b) => (b._trending_score || 0) - (a._trending_score || 0));
                        filteredRecipes = recipesWithScore;
                    } else if (activeTab === "popular") {
                        // Sort by popular/engagement score (same algorithm as backend)
                        const recipesWithScore: RecipeWithScore[] = filteredRecipes.map(recipe => ({
                            ...recipe,
                            _popular_score: calculatePopularScore(recipe)
                        }));
                        recipesWithScore.sort((a, b) => (b._popular_score || 0) - (a._popular_score || 0));
                        filteredRecipes = recipesWithScore;
                    } else {
                        // Sort by created_at descending (newest first)
                        filteredRecipes.sort((a, b) => {
                            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                            return dateB - dateA;
                        });
                    }

                    // Apply client-side filtering by tags
                    if (selectedFilters.size > 0) {
                        const filterArray = Array.from(selectedFilters);
                        filteredRecipes = filteredRecipes.filter((recipe: Recipe) => {
                            return filterArray.some(filter =>
                                recipe.tags?.some(tag =>
                                    tag.toLowerCase().includes(filter.toLowerCase())
                                )
                            );
                        });
                    }

                    // Apply client-side search filtering
                    if (searchQuery.trim()) {
                        const searchLower = searchQuery.toLowerCase();
                        filteredRecipes = filteredRecipes.filter((recipe: Recipe) => {
                            return recipe.title.toLowerCase().includes(searchLower) ||
                                recipe.description.toLowerCase().includes(searchLower) ||
                                recipe.tags?.some(tag => tag.toLowerCase().includes(searchLower));
                        });
                    }

                    // For favorites tab, filter by saved recipes (client-side filtering)
                    if (activeTab === "favorites") {
                        filteredRecipes = filteredRecipes.filter((recipe: Recipe) => savedRecipes.has(recipe.id));
                        setRecipes(filteredRecipes);
                        setAllRecipes(filteredRecipes);
                        setHasMore(false); // For favorites, we show all at once
                    } else {
                        setRecipes(filteredRecipes);
                        setAllRecipes(filteredRecipes);
                        setHasMore(communityMeta.hasMore && filteredRecipes.length >= communityRecipes.length);
                    }
                }
            } catch (err) {
                console.error('Failed to load recipes:', err);
                setError(err instanceof Error ? err.message : 'Failed to load recipes');
                setRecipes([]);
                setAllRecipes([]);
            } finally {
                setIsLoading(false);
            }
        };

        // Debounce search queries
        if (searchQuery.trim()) {
            setIsSearching(true);
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
            searchTimeoutRef.current = setTimeout(() => {
                setIsSearching(false);
                loadRecipes();
            }, 500);
            return () => {
                if (searchTimeoutRef.current) {
                    clearTimeout(searchTimeoutRef.current);
                }
            };
        } else {
            setIsSearching(false);
            loadRecipes();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, selectedFilters, searchQuery, user?.id]);

    // Calculate dynamic filter options from all tags in Redux store
    const filterOptions = useMemo(() => {
        const allTags = new Set<string>();
        communityRecipes.forEach((recipe) => {
            if (recipe.tags && Array.isArray(recipe.tags)) {
                recipe.tags.forEach((tag) => {
                    if (tag && typeof tag === 'string') {
                        allTags.add(tag);
                    }
                });
            }
        });
        return Array.from(allTags).sort();
    }, [communityRecipes]);

    // Update displayed recipes when Redux store or filters change
    useEffect(() => {
        if (activeTab === "posted-by-you") return; // Don't filter posted-by-you tab

        // Transform Redux recipes
        let filteredRecipes = communityRecipes.map(transformRecipe);

        // Apply client-side sorting based on active tab (same as backend logic)
        if (activeTab === "trending") {
            // Sort by trending score (same algorithm as backend)
            const recipesWithScore: RecipeWithScore[] = filteredRecipes.map(recipe => ({
                ...recipe,
                _trending_score: calculateTrendingScore(recipe)
            }));
            recipesWithScore.sort((a, b) => (b._trending_score || 0) - (a._trending_score || 0));
            filteredRecipes = recipesWithScore;
        } else if (activeTab === "popular") {
            // Sort by popular/engagement score (same algorithm as backend)
            const recipesWithScore: RecipeWithScore[] = filteredRecipes.map(recipe => ({
                ...recipe,
                _popular_score: calculatePopularScore(recipe)
            }));
            recipesWithScore.sort((a, b) => (b._popular_score || 0) - (a._popular_score || 0));
            filteredRecipes = recipesWithScore;
        } else if (activeTab === "new" || activeTab === "all") {
            // Sort by created_at descending (newest first)
            filteredRecipes.sort((a, b) => {
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return dateB - dateA;
            });
        } else if (activeTab === "favorites") {
            // For favorites, sort by created_at descending
            filteredRecipes.sort((a, b) => {
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return dateB - dateA;
            });
        }

        // Apply client-side filtering by tags
        if (selectedFilters.size > 0) {
            const filterArray = Array.from(selectedFilters);
            filteredRecipes = filteredRecipes.filter((recipe: Recipe) => {
                return filterArray.some(filter =>
                    recipe.tags?.some(tag =>
                        tag.toLowerCase().includes(filter.toLowerCase())
                    )
                );
            });
        }

        // Apply client-side search filtering
        if (searchQuery.trim()) {
            const searchLower = searchQuery.toLowerCase();
            filteredRecipes = filteredRecipes.filter((recipe: Recipe) => {
                return recipe.title.toLowerCase().includes(searchLower) ||
                    recipe.description.toLowerCase().includes(searchLower) ||
                    recipe.tags?.some(tag => tag.toLowerCase().includes(searchLower));
            });
        }

        // For favorites tab, filter by saved recipes
        if (activeTab === "favorites") {
            filteredRecipes = filteredRecipes.filter((recipe: Recipe) => savedRecipes.has(recipe.id));
            setRecipes(filteredRecipes);
            setAllRecipes(filteredRecipes);
        } else {
            setRecipes(filteredRecipes);
            setAllRecipes(filteredRecipes);
        }
    }, [communityRecipes, selectedFilters, searchQuery, activeTab, savedRecipes]);

    // Infinite scroll observer
    useEffect(() => {
        const loadMoreRecipes = async () => {
            if (!user?.id || isLoadingMore || !hasMore) return;

            setIsLoadingMore(true);
            const nextPage = currentPage + 1;

            try {
                let sortType: 'newest' | 'trending' | 'popular' = 'newest';

                if (activeTab === "trending") {
                    sortType = "trending";
                } else if (activeTab === "popular") {
                    sortType = "popular";
                } else if (activeTab === "new") {
                    sortType = "newest";
                } else if (activeTab === "posted-by-you") {
                    // For posted-by-you, still use backend
                    const response = await fetchUserPostedRecipes(user.id, nextPage, 20, sortType);
                    if (response) {
                        const recipesArray = Array.isArray(response.recipes) ? response.recipes : [];
                        if (recipesArray.length > 0) {
                            const transformedRecipes = recipesArray.map(transformRecipe);
                            setRecipes(prev => [...prev, ...transformedRecipes]);
                            setAllRecipes(prev => [...prev, ...transformedRecipes]);
                            setHasMore(response.has_more || false);
                            setCurrentPage(nextPage);
                        } else {
                            setHasMore(false);
                        }
                    } else {
                        setHasMore(false);
                    }
                } else {
                    // For other tabs, fetch more from Redux store (without filters, since we filter client-side)
                    await dispatch(fetchCommunity({ page: nextPage, sort: sortType, filters: {} }));

                    // Wait a bit for Redux to update, then get fresh recipes
                    // Use a small timeout to ensure Redux state is updated
                    setTimeout(() => {
                        // Get updated recipes from Redux (will be available in next render)
                        // For now, just update hasMore based on meta
                        setHasMore(communityMeta.hasMore);
                        setCurrentPage(nextPage);
                    }, 100);
                }
            } catch (err) {
                console.error('Failed to load more recipes:', err);
                setHasMore(false);
            } finally {
                setIsLoadingMore(false);
            }
        };

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
                    loadMoreRecipes();
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [hasMore, isLoadingMore, currentPage, activeTab, user?.id, dispatch, communityMeta.hasMore]);

    // Card fade-in animations on scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("visible");
                    }
                });
            },
            { threshold: 0.1 }
        );
        // TODO: Replace with backend API call - POST /recipes/:id/like
        cardRefs.current.forEach((ref) => {
            if (ref) observer.observe(ref);
        });

        return () => {
            cardRefs.current.forEach((ref) => {
                if (ref) observer.unobserve(ref);
            });
        };
    }, [recipes]);

    const handleLike = async (recipeId: string) => {
        if (!user?.id) {
            alert("Please log in to like recipes");
            return;
        }

        const isLiked = likedRecipes.has(recipeId);

        // Find recipe to pass to optimistic update
        const recipe = communityRecipes.find(r => r.id === recipeId);
        if (!recipe) {
            // Try to find in local recipes
            const localRecipe = recipes.find(r => r.id === recipeId);
            if (!localRecipe) {
                alert('Recipe not found');
                return;
            }
        }

        // Use optimistic update thunk
        if (isLiked) {
            dispatch(unlikeRecipeOptimistic({ userId: user.id, recipeId }));
        } else {
            // Convert to UserRecipe format for optimistic update
            const userRecipe = recipe ? {
                id: recipe.id,
                user_id: recipe.posted_by?.id || '',
                title: recipe.title,
                description: recipe.description,
                meal_type: recipe.tags?.[0],
                image_url: recipe.image_url || undefined,
                created_at: recipe.created_at,
            } : undefined;

            if (userRecipe) {
                dispatch(likeRecipeOptimistic({ userId: user.id, recipeId, recipe: userRecipe }));
            }
        }

        // Update local recipes state and Redux store optimistically
        const updatedLikes = isLiked ? Math.max(0, (recipe?.likes || 0) - 1) : (recipe?.likes || 0) + 1;

        // Update Redux store
        if (recipe) {
            dispatch(updateCommunityRecipe({
                id: recipeId,
                likes: updatedLikes,
            }));
        }

        // Update local recipes state
        setRecipes((prevRecipes) =>
            prevRecipes.map((recipe) => {
                if (recipe.id === recipeId) {
                    return {
                        ...recipe,
                        likes: updatedLikes,
                    };
                }
                return recipe;
            })
        );
    };

    const handleSave = async (recipeId: string) => {
        if (!user?.id) {
            alert("Please log in to save recipes");
            return;
        }

        const isSaved = savedRecipes.has(recipeId);

        // Find recipe to pass to optimistic update
        const recipe = communityRecipes.find(r => r.id === recipeId);
        if (!recipe) {
            // Try to find in local recipes
            const localRecipe = recipes.find(r => r.id === recipeId);
            if (!localRecipe) {
                alert('Recipe not found');
                return;
            }
        }

        // Use optimistic update thunk
        if (isSaved) {
            dispatch(unsaveRecipeOptimistic({ userId: user.id, recipeId }));
        } else {
            // Convert to UserRecipe format for optimistic update
            const userRecipe = recipe ? {
                id: recipe.id,
                user_id: recipe.posted_by?.id || '',
                title: recipe.title,
                description: recipe.description,
                meal_type: recipe.tags?.[0],
                image_url: recipe.image_url || undefined,
                created_at: recipe.created_at,
            } : undefined;

            if (userRecipe) {
                dispatch(saveRecipeOptimistic({ userId: user.id, recipeId, recipe: userRecipe }));
            }
        }

        // Update local recipes state optimistically
        setRecipes((prevRecipes) =>
            prevRecipes.map((recipe) => {
                if (recipe.id === recipeId) {
                    // No visual change needed for save/unsave, just update Redux
                    return recipe;
                }
                return recipe;
            })
        );
    };

    const handleShare = async (recipeId: string) => {
        try {
            const session = await supabase.auth.getSession();
            if (!session.data.session?.access_token) {
                // Still allow sharing even if not logged in, just don't track
                return;
            }

            const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${backendUrl}/api/recipes/${recipeId}/share`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.data.session.access_token}`,
                },
            });

            if (!response.ok) {
                // Don't show error to user, sharing should still work
                console.error('Failed to track share event');
            }
        } catch (error) {
            // Don't show error to user, sharing should still work
            console.error('Error tracking share:', error);
        }
    };

    const handleDeleteClick = (recipeId: string) => {
        const recipe = recipes.find(r => r.id === recipeId);
        if (recipe) {
            setDeleteModalRecipe(recipe);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteModalRecipe || !user?.id) return;

        setIsDeleting(true);
        try {
            // Call backend API (non-blocking)
            await deleteRecipeFromCommunity(deleteModalRecipe.id);

            // Remove recipe from local state
            setRecipes((prevRecipes) => prevRecipes.filter(r => r.id !== deleteModalRecipe.id));
            setAllRecipes((prevRecipes) => prevRecipes.filter(r => r.id !== deleteModalRecipe.id));

            // Close modal
            setDeleteModalRecipe(null);

            // Show success message (you can add a toast here if you have one)
            // For now, we'll just silently remove it
        } catch (error) {
            console.error('Error deleting recipe:', error);
            alert(error instanceof Error ? error.message : 'Failed to delete recipe. Please try again.');
            // Keep modal open on error
        } finally {
            setIsDeleting(false);
        }
    };

    const handleViewDetails = (recipeId: string) => {
        setSelectedRecipeId(recipeId);
        setIsModalOpen(true);
    };

    // TODO: Replace with backend API call - Navigate to Feast Guide page
    const handleFeastGuide = (recipeId: string) => {
        navigate(`/recipe/${recipeId}/FeastGuide`);
    };

    const handleOpenComments = (recipeId: string) => {
        setCommentsModalRecipeId(recipeId);
    };

    const handleCommentAdded = () => {
        // Refresh recipes to update comments count
        // This could be optimized to just update the specific recipe
        setRecipes((prevRecipes) => [...prevRecipes]);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedRecipeId(null);
    };

    const handleShareSubmit = async (data: {
        image: File | null;
        title: string;
        description: string;
        tags: string[];
        isAiGenerated: boolean;
        recipeId?: string;
        steps?: RecipeStep[];
    }) => {
        setShareLoading(true);

        try {
            const session = await supabase.auth.getSession();
            if (!session.data.session?.access_token) {
                alert("Please log in to share recipes");
                setShareLoading(false);
                return;
            }

            const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

            // Prepare FormData
            const formData = new FormData();
            formData.append('title', data.title);
            formData.append('description', data.description);
            formData.append('tags', JSON.stringify(data.tags));
            formData.append('isAiGenerated', data.isAiGenerated.toString());

            if (data.recipeId) {
                formData.append('recipeId', data.recipeId);
            }

            if (data.image) {
                formData.append('image', data.image);
            }

            if (data.steps && data.steps.length > 0) {
                // Convert steps to the format expected by backend
                const stepsFormatted = data.steps.map((step, index) => ({
                    step_number: index + 1,
                    instruction: step.text,
                    step_type: step.step_type || "active"
                }));
                formData.append('steps', JSON.stringify(stepsFormatted));
            }

            const response = await fetch(`${backendUrl}/api/recipes/community`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.data.session.access_token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
                throw new Error(errorData.detail || `Failed to share recipe: ${response.statusText}`);
            }

            // Parse response to get the recipe
            const responseData = await response.json();
            const postedRecipe = responseData.recipe;

            // Transform the recipe to CommunityRecipe format and add to Redux
            if (postedRecipe) {
                const communityRecipe: CommunityRecipe = {
                    id: postedRecipe.id,
                    title: postedRecipe.title,
                    description: postedRecipe.description || "",
                    image_url: postedRecipe.image_url || null,
                    tags: postedRecipe.tags || [],
                    prep_time: postedRecipe.prep_time || null,
                    cook_time: postedRecipe.cook_time || null,
                    serving_size: postedRecipe.serving_size || null,
                    nutrition: postedRecipe.nutrition || {},
                    ingredients: postedRecipe.ingredients || [],
                    steps: postedRecipe.steps || [],
                    is_public: postedRecipe.is_public || true,
                    created_at: postedRecipe.created_at || new Date().toISOString(),
                    likes: 0,
                    views: 0,
                    shares: 0,
                    comments_count: 0,
                    featured: false,
                    is_ai_generated: postedRecipe.is_ai_generated || false,
                    posted_by: user ? {
                        id: user.id,
                        name: profile?.full_name || user.email || "Unknown",
                        avatar: profile?.avatar_url || null,
                    } : null,
                };

                // Add to Redux store
                dispatch(addCommunityRecipe(communityRecipe));
            }

            // Refresh recipes list to get updated data from backend
            // This ensures we have the latest data including proper sorting and community metrics
            try {
                const sortType = activeTab === "trending" ? "trending" : activeTab === "popular" ? "popular" : activeTab === "new" ? "newest" : "newest";
                const tagsArray = selectedFilters.size > 0 ? Array.from(selectedFilters) : undefined;
                const refreshResponse = await fetchCommunityRecipes(1, 20, sortType, tagsArray, searchQuery.trim() || undefined);

                if (refreshResponse) {
                    const transformedRecipes = refreshResponse.recipes.map(transformRecipe);

                    // For favorites tab, filter by saved recipes
                    if (activeTab === "favorites") {
                        const favorites = transformedRecipes.filter((recipe: Recipe) => savedRecipes.has(recipe.id));
                        setRecipes(favorites);
                        setAllRecipes(favorites);
                    } else {
                        setRecipes(transformedRecipes);
                        setAllRecipes(transformedRecipes);
                    }

                    setHasMore(refreshResponse.has_more);
                    setCurrentPage(1);
                }
            } catch (refreshErr) {
                console.error('Failed to refresh recipes after sharing:', refreshErr);
                // If refresh fails, the recipes will be updated on next tab change or page reload
                // The user can manually refresh the page if needed
            }

            setShareLoading(false);
            // Modal will close automatically after success message
        } catch (err) {
            console.error('Failed to post recipe:', err);
            alert(err instanceof Error ? err.message : 'Failed to share recipe. Please try again.');
            setShareLoading(false);
        }
    };

    const toggleFilter = (filter: string) => {
        setSelectedFilters((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(filter)) {
                newSet.delete(filter);
            } else {
                newSet.add(filter);
            }
            return newSet;
        });
    };

    return (
        <div className="min-h-screen relative">
            {/* Floating Food Icons Background */}
            <FloatingFoodIcons />

            {/* Hero Section with Radial Gradient */}
            <div
                className="relative pt-8 pb-6 sm:pt-12 sm:pb-8 md:pt-16 md:pb-12 mb-4 sm:mb-6 md:mb-8 bg-[radial-gradient(circle_at_center,rgba(220,252,231,0.8)_0%,rgba(255,255,255,1)_70%)]"
            >
                <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 text-center relative z-10">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-4">
                        LeanFeast Community
                    </h1>
                    <p className="text-base sm:text-lg md:text-xl text-neutral-75">
                        Discover what others are cooking and share your own creations
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 pb-12 sm:pb-16 md:pb-20 relative z-10">
                {/* Search Bar with Glassy Effect */}
                <div className="mb-6">
                    <div className="max-w-2xl mx-auto relative">
                        <input
                            type="text"
                            placeholder="Search recipes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full px-3 py-2 sm:px-4 sm:py-3 md:px-6 md:py-4 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 ${searchQuery.trim()
                                ? "border-primary bg-white/50"
                                : "border-neutral-200 bg-white/30"
                                } focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-lg text-sm sm:text-base md:text-lg`}
                            aria-label="Search recipes"
                        />
                        {isSearching && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                        {searchQuery.trim() && !isSearching && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary font-semibold">
                                {recipes.length} {recipes.length === 1 ? "result" : "results"}
                            </div>
                        )}
                    </div>
                </div>

                {/* Filter Chips */}
                <div className="mb-6 flex flex-wrap justify-center gap-1 sm:gap-2">
                    {filterOptions.map((filter) => (
                        <button
                            key={filter}
                            onClick={() => toggleFilter(filter)}
                            className={`px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-lg sm:rounded-xl border-2 transition-all duration-200 text-xs sm:text-sm ${selectedFilters.has(filter)
                                ? "bg-primary text-white border-primary font-semibold"
                                : "bg-white/50 border-neutral-200 text-neutral-700 hover:border-primary/50"
                                }`}
                            aria-pressed={selectedFilters.has(filter)}
                        >
                            {filter}
                        </button>
                    ))}
                </div>

                {/* Sorting Tabs */}
                <div className="mb-4 sm:mb-6 md:mb-8 flex justify-center border-b border-neutral-200">
                    <div className="flex gap-6">
                        {(["all", "trending", "new", "popular", "favorites", "posted-by-you"] as TabType[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-2 px-1 sm:pb-2.5 sm:px-2 md:pb-3 font-semibold transition-colors capitalize text-xs sm:text-sm md:text-base ${activeTab === tab
                                    ? "border-b-2 border-primary text-primary"
                                    : "text-neutral-75 hover:text-primary"
                                    }`}
                            >
                                {tab === "all"
                                    ? "All"
                                    : tab === "trending"
                                        ? "Trending"
                                        : tab === "new"
                                            ? "New"
                                            : tab === "popular"
                                                ? "Popular"
                                                : tab === "favorites"
                                                    ? "Your Favorites"
                                                    : "Posted by You"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Posted by You Section Header */}
                {activeTab === "posted-by-you" && (
                    <div className="mb-6 text-center">
                        <h2 className="text-2xl font-bold text-neutral-42 mb-2">
                            Your Posted Recipes
                        </h2>
                        <p className="text-neutral-61">
                            Recipes you've shared with the community
                        </p>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="text-center py-8 sm:py-12 md:py-16">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-base sm:text-lg text-neutral-61">Loading recipes...</p>
                    </div>
                )}

                {/* Error State */}
                {error && !isLoading && (
                    <div className="text-center py-8 sm:py-12 md:py-16">
                        <div className="text-4xl sm:text-5xl md:text-6xl mb-4">⚠️</div>
                        <h3 className="text-xl sm:text-2xl font-bold text-red-600 mb-2">Error loading recipes</h3>
                        <p className="text-neutral-61 mb-4">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Recipe Grid with Fade-in Animations */}
                {!isLoading && !error && recipes.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
                        {recipes.map((recipe) => (
                            <motion.div
                                key={recipe.id}
                                ref={(el) => {
                                    if (el) cardRefs.current.set(recipe.id, el);
                                }}
                                className="scroll-fade-in"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <RecipeCard
                                    recipe={recipe}
                                    onLike={handleLike}
                                    onSave={handleSave}
                                    onShare={handleShare}
                                    onViewDetails={handleViewDetails}
                                    isLiked={likedRecipes.has(recipe.id)}
                                    isSaved={savedRecipes.has(recipe.id)}
                                    showDeleteButton={activeTab === "posted-by-you"}
                                    onDelete={handleDeleteClick}
                                />
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && !error && recipes.length === 0 && (
                    <div className="text-center py-8 sm:py-12 md:py-16">
                        <div className="text-4xl sm:text-5xl md:text-6xl mb-4">🔍</div>
                        <h3 className="text-xl sm:text-2xl font-bold text-neutral-42 mb-2">No recipes found</h3>
                        <p className="text-neutral-61">
                            {searchQuery.trim()
                                ? "Try adjusting your search or filters"
                                : "Try selecting different filters"}
                        </p>
                    </div>
                )}

                {/* Infinite Scroll Trigger */}
                {hasMore && (
                    <div ref={observerTarget} className="mt-8 text-center">
                        {isLoadingMore && (
                            <div className="text-neutral-61">Loading more recipes...</div>
                        )}
                    </div>
                )}

                {/* Recipe Details Modal */}
                {selectedRecipeId && (
                    <RecipeDetailsModal
                        recipeId={selectedRecipeId}
                        isOpen={isModalOpen}
                        onClose={handleCloseModal}
                        onLike={handleLike}
                        onStartFeastGuide={handleFeastGuide}
                        isLiked={likedRecipes.has(selectedRecipeId)}
                        allRecipes={allRecipes}
                        onViewDetails={handleViewDetails}
                        onOpenComments={handleOpenComments}
                    />
                )}
                {commentsModalRecipeId && (
                    <CommentsModal
                        recipeId={commentsModalRecipeId}
                        isOpen={!!commentsModalRecipeId}
                        onClose={() => setCommentsModalRecipeId(null)}
                        onCommentAdded={handleCommentAdded}
                    />
                )}
            </div>

            {/* Floating Action Button */}
            <ShareMyFeastFAB
                onClick={() => setIsShareModalOpen(true)}
                position={isModalOpen || isShareModalOpen || !!commentsModalRecipeId ? "top-right" : "bottom-right"}
            />

            {/* Share Modal */}
            <ShareMyFeastModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                onSubmit={handleShareSubmit}
                loading={shareLoading}
            />

            {/* Delete Recipe Modal */}
            {deleteModalRecipe && (
                <DeleteRecipeModal
                    isOpen={!!deleteModalRecipe}
                    onClose={() => setDeleteModalRecipe(null)}
                    onConfirm={handleDeleteConfirm}
                    recipeTitle={deleteModalRecipe.title}
                    loading={isDeleting}
                />
            )}
        </div>
    );
}