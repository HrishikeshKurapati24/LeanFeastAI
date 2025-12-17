import { useRef } from "react";
import { motion } from "framer-motion";
import RecipeCard from "./RecipeCard";

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
    created_at?: string;
    featured?: boolean;
}

interface TrendingCarouselProps {
    recipes: Recipe[];
    onLike: (id: string) => void;
    onSave: (id: string) => void;
    onShare: (id: string) => void;
    onViewDetails: (id: string) => void;
    likedRecipes: Set<string>;
    savedRecipes: Set<string>;
}

export default function TrendingCarousel({
    recipes,
    onLike,
    onSave,
    onShare,
    onViewDetails,
    likedRecipes,
    savedRecipes,
}: TrendingCarouselProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -300, behavior: "smooth" });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 300, behavior: "smooth" });
        }
    };

    // Filter trending recipes (likes > 50 or featured)
    const trendingRecipes = recipes.filter(
        (recipe) => recipe.likes > 50 || recipe.featured
    );

    if (trendingRecipes.length === 0) {
        return null;
    }

    return (
        <div className="relative mb-4 sm:mb-6 md:mb-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-42">🔥 Trending</h2>
                <div className="flex gap-2">
                    <button
                        onClick={scrollLeft}
                        className="p-2 rounded-full bg-white/50 backdrop-blur-sm border border-neutral-200 hover:bg-white transition-colors"
                        aria-label="Scroll left"
                    >
                        ←
                    </button>
                    <button
                        onClick={scrollRight}
                        className="p-2 rounded-full bg-white/50 backdrop-blur-sm border border-neutral-200 hover:bg-white transition-colors"
                        aria-label="Scroll right"
                    >
                        →
                    </button>
                </div>
            </div>

            <div
                ref={scrollContainerRef}
                className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto pb-4 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
                {trendingRecipes.map((recipe, index) => (
                    <motion.div
                        key={recipe.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex-shrink-0 w-56 sm:w-64 md:w-72"
                    >
                        <div className="relative">
                            <RecipeCard
                                recipe={recipe}
                                onLike={onLike}
                                onSave={onSave}
                                onShare={onShare}
                                onViewDetails={onViewDetails}
                                isLiked={likedRecipes.has(recipe.id)}
                                isSaved={savedRecipes.has(recipe.id)}
                            />
                            {recipe.featured && (
                                <div className="absolute top-3 right-3 z-10">
                                    <span className="px-3 py-1 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full text-xs font-bold shadow-lg">
                                        ⭐ Featured
                                    </span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}