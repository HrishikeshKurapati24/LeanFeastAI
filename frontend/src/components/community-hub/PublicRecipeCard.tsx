import { useRef } from "react";
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

interface PublicRecipeCardProps {
    recipe: Recipe;
    onViewDetails: (id: string) => void;
}

const PublicRecipeCard = ({
    recipe,
    onViewDetails,
}: PublicRecipeCardProps) => {
    const cardRef = useRef<HTMLDivElement>(null);

    const handleViewDetails = () => {
        onViewDetails(recipe.id);
    };

    const totalTime = recipe.prep_time + recipe.cook_time;

    return (
        <div
            ref={cardRef}
            className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer transform hover:scale-[1.02]"
            onClick={handleViewDetails}
            role="article"
            aria-label={`Recipe: ${recipe.title}`}
        >
            {/* Hero Image Section (48% height) */}
            <div className="relative h-24 sm:h-32 md:h-40 lg:h-48 overflow-hidden">
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
                <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-wrap gap-1.5 sm:gap-2">
                    {/* AI Generated Tag - Always first */}
                    {recipe.is_ai_generated && (
                        <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full text-xs font-bold shadow-lg">
                            ✨ AI Generated
                        </span>
                    )}
                    {/* Regular Tags - Show 1 if AI Generated is present, otherwise show 2 */}
                    {recipe.tags && recipe.tags.length > 0 && (
                        <>
                            {recipe.tags.slice(0, recipe.is_ai_generated ? 1 : 2).map((tag, index) => (
                                <span
                                    key={index}
                                    className="px-1.5 sm:px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-neutral-42"
                                >
                                    {tag}
                                </span>
                            ))}
                        </>
                    )}
                </div>

                {/* Optional Featured/Trending Ribbon (Top Right) */}
                {(recipe.likes > 50 || recipe.featured) && (
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
                        <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full text-xs font-bold shadow-lg">
                            {recipe.featured ? '⭐ Featured' : '🔥 Trending'}
                        </span>
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="p-2 sm:p-3 md:p-4 space-y-1.5 sm:space-y-2 md:space-y-3">
                {/* Meta Row */}
                <div className="flex items-center justify-between text-xs text-neutral-61">
                    <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-wrap">
                        {totalTime > 0 && (
                            <span className="flex items-center gap-0.5 sm:gap-1">
                                <span className="text-xs">⏱️</span>
                                <span className="text-xs">{totalTime}m</span>
                            </span>
                        )}
                        <span className="flex items-center gap-0.5 sm:gap-1">
                            <span className="text-xs">👥</span>
                            <span className="text-xs">{recipe.serving_size}</span>
                        </span>
                        {recipe.nutrition?.calories !== 0 && Number(recipe.nutrition.calories) > 0 && (
                            <span className="flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 md:px-2 py-0.5 bg-neutral-245 rounded-full text-xs">
                                <span>🔥</span>
                                <span>{recipe.nutrition.calories} cal</span>
                            </span>
                        )}
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-sm sm:text-base md:text-lg font-bold text-neutral-42 line-clamp-1">
                    {recipe.title}
                </h2>

                {/* Description */}
                <p className="text-xs text-neutral-61 line-clamp-2 min-h-[1.5rem] sm:min-h-[2rem] md:min-h-[2.5rem]">
                    {recipe.description}
                </p>

                {/* Action Row - Read-only stats */}
                <div className="flex items-center justify-between pt-1 sm:pt-1.5 md:pt-2 border-t border-neutral-200">

                    {/* Left: Stats (read-only) */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2 md:gap-4 text-neutral-61 min-w-0">

                        {/* Likes Count */}
                        <div className="flex items-center gap-1 shrink-0">
                            <span className="text-base sm:text-lg md:text-xl">❤️</span>
                            <span className="text-xs sm:inline">{recipe.likes}</span>
                        </div>

                        {/* Comments Count */}
                        <div className="flex items-center gap-1 shrink-0">
                            <span className="text-base sm:text-lg md:text-xl">💬</span>
                            <span className="text-xs sm:inline">{recipe.comments_count}</span>
                        </div>

                    </div>

                    {/* Right: View CTA */}
                    <button
                        onClick={handleViewDetails}
                        className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-lg sm:rounded-xl transition-all duration-200 min-w-[36px] sm:min-w-[44px] min-h-[32px] sm:min-h-[36px] md:min-h-[44px] flex items-center justify-center"
                        aria-label="View recipe details"
                    >
                        View
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PublicRecipeCard;