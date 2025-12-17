import { useState } from 'react';

interface Nutrition {
    calories?: number;
    protein?: number;
    carbs?: number;
    fats?: number;
}

interface RecipeHeaderProps {
    title: string;
    imageUrl?: string | null;
    imageBase64?: string | null;
    imageLoading?: boolean;
    tags?: string[];
    prepTime?: number;
    cookTime?: number;
    servingSize?: number;
    nutrition?: Nutrition;
    onImageLoad?: () => void;
}

export default function RecipeHeader({
    title,
    imageUrl,
    imageBase64,
    imageLoading = false,
    tags = [],
    prepTime,
    cookTime,
    servingSize,
    nutrition,
    onImageLoad,
}: RecipeHeaderProps) {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    // Determine image source - prioritize imageUrl, fallback to base64
    const imageSrc = imageUrl || (imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : null);
    const totalTime = (prepTime || 0) + (cookTime || 0);

    const handleImageLoad = () => {
        setImageLoaded(true);
        if (onImageLoad) {
            onImageLoad();
        }
    };

    const handleImageError = () => {
        setImageError(true);
    };

    return (
        <div className="relative mb-2 sm:mb-3 md:mb-4">
            {/* Hero Image */}
            <div className="relative h-32 sm:h-44 md:h-56 lg:h-72 rounded-md sm:rounded-lg overflow-hidden mb-2 sm:mb-3 max-w-[420px] sm:max-w-full mx-auto">
                {imageLoading && !imageSrc ? (
                    // Show spinner when image is still being generated
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 border-3 sm:border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-1"></div>
                            <span className="text-xs text-primary font-semibold">Generating image...</span>
                        </div>
                    </div>
                ) : imageSrc && !imageError ? (
                    <>
                        {!imageLoaded && (
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center z-10">
                                <div className="text-center">
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 border-3 sm:border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-1"></div>
                                    <span className="text-xs text-primary font-semibold">Loading image...</span>
                                </div>
                            </div>
                        )}
                        <img
                            src={imageSrc}
                            alt={title}
                            className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                            onLoad={handleImageLoad}
                            onError={handleImageError}
                        />
                    </>
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                        <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl">🍳</span>
                    </div>
                )}
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

                {/* Title Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-1.5 sm:p-2 md:p-4">
                    <h1 className="text-sm sm:text-base md:text-lg lg:text-2xl font-bold text-white mb-0.5 sm:mb-1 md:mb-2 drop-shadow-lg">
                        {title}
                    </h1>

                    {/* Tags */}
                    {tags && tags.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 sm:gap-1">
                            {tags.slice(0, 4).map((tag, index) => (
                                <span
                                    key={index}
                                    className="px-1.5 sm:px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-neutral-42"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Meta Information */}
            <div className="grid grid-cols-4 gap-1 sm:gap-1.5 p-1.5 sm:p-2 bg-gradient-to-br from-primary/10 to-primary/5 rounded-md sm:rounded-lg border border-primary/20 mb-1.5 sm:mb-2">
                {prepTime !== undefined && (
                    <div className="text-center p-1.5 sm:p-2 bg-white/50 rounded-md">
                        <div className="text-xs text-neutral-61 mb-0.5">Prep Time</div>
                        <div className="text-sm sm:text-base md:text-lg font-bold text-neutral-42">{prepTime}m</div>
                    </div>
                )}
                {cookTime !== undefined && (
                    <div className="text-center p-1.5 sm:p-2 bg-white/50 rounded-md">
                        <div className="text-xs text-neutral-61 mb-0.5">Cook Time</div>
                        <div className="text-sm sm:text-base md:text-lg font-bold text-neutral-42">{cookTime}m</div>
                    </div>
                )}
                {totalTime > 0 && (
                    <div className="text-center p-1.5 sm:p-2 bg-white/50 rounded-md">
                        <div className="text-xs text-neutral-61 mb-0.5">Total Time</div>
                        <div className="text-sm sm:text-base md:text-lg font-bold text-neutral-42">{totalTime}m</div>
                    </div>
                )}
                {servingSize !== undefined && (
                    <div className="text-center p-1.5 sm:p-2 bg-white/50 rounded-md">
                        <div className="text-xs text-neutral-61 mb-0.5">Servings</div>
                        <div className="text-sm sm:text-base md:text-lg font-bold text-neutral-42">{servingSize}</div>
                    </div>
                )}
            </div>

            {/* Nutrition Information */}
            {nutrition && Object.keys(nutrition).length > 0 && (
                <div className="p-2 sm:p-3 md:p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-md sm:rounded-lg border border-primary/20">
                    <h3 className="text-sm sm:text-base md:text-lg font-bold text-neutral-42 mb-1.5 sm:mb-2">Nutrition Facts</h3>
                    <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
                        {nutrition.calories !== undefined && (
                            <div className="text-center p-1 sm:p-1.5 md:p-2 bg-white/50 rounded-md">
                                <div className="text-xs text-neutral-61 mb-0.5">Calories</div>
                                <div className="text-sm sm:text-base md:text-lg font-bold text-primary">{nutrition.calories}</div>
                                <div className="text-xs text-neutral-400">kcal</div>
                            </div>
                        )}
                        {nutrition.protein !== undefined && (
                            <div className="text-center p-1 sm:p-1.5 md:p-2 bg-white/50 rounded-md">
                                <div className="text-xs text-neutral-61 mb-0.5">Protein</div>
                                <div className="text-sm sm:text-base md:text-lg font-bold text-neutral-42">{nutrition.protein}g</div>
                            </div>
                        )}
                        {nutrition.carbs !== undefined && (
                            <div className="text-center p-1 sm:p-1.5 md:p-2 bg-white/50 rounded-md">
                                <div className="text-xs text-neutral-61 mb-0.5">Carbs</div>
                                <div className="text-sm sm:text-base md:text-lg font-bold text-neutral-42">{nutrition.carbs}g</div>
                            </div>
                        )}
                        {nutrition.fats !== undefined && (
                            <div className="text-center p-1 sm:p-1.5 md:p-2 bg-white/50 rounded-md">
                                <div className="text-xs text-neutral-61 mb-0.5">Fats</div>
                                <div className="text-sm sm:text-base md:text-lg font-bold text-neutral-42">{nutrition.fats}g</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

