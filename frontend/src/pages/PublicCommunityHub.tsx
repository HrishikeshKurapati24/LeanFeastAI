import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import PublicRecipeCard from "../components/community-hub/PublicRecipeCard";
import PublicRecipeDetailsModal from "../components/community-hub/PublicRecipeDetailsModal";
import PublicCommentsModal from "../components/community-hub/PublicCommentsModal";
import FloatingFoodIcons from "../components/FloatingFoodIcons";
import { Link } from "react-router-dom";
import type { CommunityRecipe } from "../utils/communityApi";

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

// Helper function to transform backend recipe to frontend Recipe format
const transformRecipe = (backendRecipe: CommunityRecipe): Recipe => {
    return {
        id: backendRecipe.id,
        title: backendRecipe.title,
        image_url: backendRecipe.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800",
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

type TabType = "all" | "trending" | "new" | "popular";

// Helper function to calculate trending score (same as backend)
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

export default function PublicCommunityHub() {
    const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
    const [commentsModalRecipeId, setCommentsModalRecipeId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
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

    // Fetch recipes from public endpoint
    const fetchPublicRecipes = async (page: number, sortType: 'newest' | 'trending' | 'popular', tags?: string[], search?: string) => {
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const params = new URLSearchParams({
            page: page.toString(),
            limit: '20',
            sort: sortType,
        });

        if (tags && tags.length > 0) {
            params.append('tags', tags.join(','));
        }
        if (search && search.trim()) {
            params.append('search', search.trim());
        }

        const response = await fetch(`${backendUrl}/api/recipes/community/public?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch recipes: ${response.statusText}`);
        }
        return await response.json();
    };

    // Fetch recipes based on active tab, filters, and search
    useEffect(() => {
        const loadRecipes = async () => {
            setIsLoading(true);
            setError(null);
            setCurrentPage(1);

            try {
                let sortType: 'newest' | 'trending' | 'popular' = 'newest';

                if (activeTab === "trending") {
                    sortType = "trending";
                } else if (activeTab === "popular") {
                    sortType = "popular";
                } else {
                    sortType = "newest";
                }

                const tagsArray = selectedFilters.size > 0 ? Array.from(selectedFilters) : undefined;
                const response = await fetchPublicRecipes(1, sortType, tagsArray, searchQuery.trim() || undefined);

                if (response && response.recipes) {
                    const recipesArray = Array.isArray(response.recipes) ? response.recipes : [];
                    let transformedRecipes = recipesArray.map(transformRecipe);

                    // Apply client-side sorting based on active tab
                    if (activeTab === "trending") {
                        const recipesWithScore: RecipeWithScore[] = transformedRecipes.map((recipe: Recipe) => ({
                            ...recipe,
                            _trending_score: calculateTrendingScore(recipe)
                        }));
                        recipesWithScore.sort((a, b) => (b._trending_score || 0) - (a._trending_score || 0));
                        transformedRecipes = recipesWithScore;
                    } else if (activeTab === "popular") {
                        const recipesWithScore: RecipeWithScore[] = transformedRecipes.map((recipe: Recipe) => ({
                            ...recipe,
                            _popular_score: calculatePopularScore(recipe)
                        }));
                        recipesWithScore.sort((a, b) => (b._popular_score || 0) - (a._popular_score || 0));
                        transformedRecipes = recipesWithScore;
                    } else {
                        transformedRecipes.sort((a: Recipe, b: Recipe) => {
                            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                            return dateB - dateA;
                        });
                    }

                    setRecipes(transformedRecipes);
                    setAllRecipes(transformedRecipes);
                    setHasMore(response.has_more || false);
                } else {
                    setRecipes([]);
                    setAllRecipes([]);
                    setHasMore(false);
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
    }, [activeTab, selectedFilters, searchQuery]);

    // Calculate dynamic filter options from all tags
    const filterOptions = useMemo(() => {
        const allTags = new Set<string>();
        allRecipes.forEach((recipe) => {
            if (recipe.tags && Array.isArray(recipe.tags)) {
                recipe.tags.forEach((tag) => {
                    if (tag && typeof tag === 'string') {
                        allTags.add(tag);
                    }
                });
            }
        });
        return Array.from(allTags).sort();
    }, [allRecipes]);

    // Infinite scroll observer
    useEffect(() => {
        const loadMoreRecipes = async () => {
            if (isLoadingMore || !hasMore) return;

            setIsLoadingMore(true);
            const nextPage = currentPage + 1;

            try {
                let sortType: 'newest' | 'trending' | 'popular' = 'newest';

                if (activeTab === "trending") {
                    sortType = "trending";
                } else if (activeTab === "popular") {
                    sortType = "popular";
                } else {
                    sortType = "newest";
                }

                const tagsArray = selectedFilters.size > 0 ? Array.from(selectedFilters) : undefined;
                const response = await fetchPublicRecipes(nextPage, sortType, tagsArray, searchQuery.trim() || undefined);

                if (response && response.recipes) {
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
    }, [hasMore, isLoadingMore, currentPage, activeTab, selectedFilters, searchQuery]);

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

        cardRefs.current.forEach((ref) => {
            if (ref) observer.observe(ref);
        });

        return () => {
            cardRefs.current.forEach((ref) => {
                if (ref) observer.unobserve(ref);
            });
        };
    }, [recipes]);

    // Read-only handlers (no actions, just navigation)
    const handleViewDetails = (recipeId: string) => {
        setSelectedRecipeId(recipeId);
        setIsModalOpen(true);
    };

    const handleOpenComments = (recipeId: string) => {
        setCommentsModalRecipeId(recipeId);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedRecipeId(null);
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
                className="relative pt-8 pb-6 sm:pt-12 sm:pb-10 md:pt-16 md:pb-12 mb-2 sm:mb-3"
                style={{
                    background: "radial-gradient(circle at center, rgba(220, 252, 231, 0.8) 0%, rgba(255, 255, 255, 1) 70%)",
                }}
            >
                <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 text-center relative z-10">
                    <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-primary mb-2 sm:mb-3 md:mb-4">
                        Explore Community Recipes
                    </h1>
                    <p className="text-sm sm:text-base md:text-xl text-neutral-75 mb-3 sm:mb-4">
                        Discover what others are cooking
                    </p>
                    <Link
                        to="/signup"
                        className="inline-block bg-primary hover:bg-primary-dark text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 text-xs sm:text-sm md:text-base"
                    >
                        Sign Up to Like & Save Recipes
                    </Link>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-16 sm:pb-20 relative z-10">
                {/* Search Bar */}
                <div className="mb-4 sm:mb-6">
                    <div className="max-w-2xl mx-auto relative">
                        <input
                            type="text"
                            placeholder="Search recipes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-2xl border-2 transition-all duration-300 ${searchQuery.trim()
                                ? "border-primary bg-white/50"
                                : "border-neutral-200 bg-white/30"
                                } focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-md shadow-lg text-sm sm:text-base md:text-lg`}
                            aria-label="Search recipes"
                        />
                        {isSearching && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
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
                {filterOptions.length > 0 && (
                    <div className="mb-4 sm:mb-6 flex flex-wrap justify-center gap-1.5 sm:gap-2">
                        {filterOptions.map((filter) => (
                            <button
                                key={filter}
                                onClick={() => toggleFilter(filter)}
                                className={`px-2 sm:px-3 py-1 sm:py-1.5 md:py-2 rounded-xl border-2 transition-all duration-200 text-xs sm:text-sm ${selectedFilters.has(filter)
                                    ? "bg-primary text-white border-primary font-semibold"
                                    : "bg-white/50 border-neutral-200 text-neutral-700 hover:border-primary/50"
                                    }`}
                                aria-pressed={selectedFilters.has(filter)}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                )}

                {/* Sorting Tabs */}
                <div className="mb-5 sm:mb-8 flex justify-center border-b border-neutral-200">
                    <div className="flex gap-3 sm:gap-5 md:gap-6">
                        {(["all", "trending", "new", "popular"] as TabType[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-2 sm:pb-3 px-1.5 sm:px-2 text-xs sm:text-sm md:text-base font-semibold transition-colors capitalize ${activeTab === tab
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
                                            : "Popular"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-lg text-neutral-61">Loading recipes...</p>
                    </div>
                )}

                {/* Error State */}
                {error && !isLoading && (
                    <div className="text-center py-16">
                        <div className="text-6xl mb-4">⚠️</div>
                        <h3 className="text-2xl font-bold text-red-600 mb-2">Error loading recipes</h3>
                        <p className="text-neutral-61 mb-4">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Recipe Grid */}
                {!isLoading && !error && recipes.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
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
                                <PublicRecipeCard
                                    recipe={recipe}
                                    onViewDetails={handleViewDetails}
                                />
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && !error && recipes.length === 0 && (
                    <div className="text-center py-16">
                        <div className="text-6xl mb-4">🔍</div>
                        <h3 className="text-2xl font-bold text-neutral-42 mb-2">No recipes found</h3>
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
                    <PublicRecipeDetailsModal
                        recipeId={selectedRecipeId}
                        isOpen={isModalOpen}
                        onClose={handleCloseModal}
                        onOpenComments={handleOpenComments}
                    />
                )}

                {/* Comments Modal (read-only) */}
                {commentsModalRecipeId && (
                    <PublicCommentsModal
                        recipeId={commentsModalRecipeId}
                        isOpen={!!commentsModalRecipeId}
                        onClose={() => setCommentsModalRecipeId(null)}
                    />
                )}
            </div>
        </div>
    );
}