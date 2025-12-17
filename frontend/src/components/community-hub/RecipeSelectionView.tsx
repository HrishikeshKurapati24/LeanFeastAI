import { useState, useMemo } from "react";
import { motion } from "framer-motion";

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
    is_public: boolean;
}


interface RecipeSelectionViewProps {
    savedRecipes: Recipe[];
    likedRecipes: Recipe[];
    onRecipeSelect: (recipe: Recipe) => void;
}

type SubTabType = "saved" | "liked";

export default function RecipeSelectionView({
    savedRecipes,
    likedRecipes,
    onRecipeSelect,
}: RecipeSelectionViewProps) {
    const [activeSubTab, setActiveSubTab] = useState<SubTabType>("saved");

    // Show the appropriate list based on active sub-tab
    // Backend already filtered out community recipes, so just display the lists directly
    const filteredRecipes = useMemo(() => {
        return activeSubTab === "saved" ? savedRecipes : likedRecipes;
    }, [activeSubTab, savedRecipes, likedRecipes]);

    return (
        <div className="space-y-4">
            {/* Sub-tabs */}
            <div className="flex gap-4 border-b border-neutral-200">
                <button
                    onClick={() => setActiveSubTab("saved")}
                    className={`pb-3 px-2 font-semibold transition-colors ${activeSubTab === "saved"
                        ? "border-b-2 border-primary text-primary"
                        : "text-neutral-75 hover:text-primary"
                        }`}
                >
                    Saved Recipes ({savedRecipes.length})
                </button>
                <button
                    onClick={() => setActiveSubTab("liked")}
                    className={`pb-3 px-2 font-semibold transition-colors ${activeSubTab === "liked"
                        ? "border-b-2 border-primary text-primary"
                        : "text-neutral-75 hover:text-primary"
                        }`}
                >
                    Liked Recipes ({likedRecipes.length})
                </button>
            </div>

            {/* Recipe Grid */}
            {filteredRecipes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
                    {filteredRecipes.map((recipe, index) => (
                        <motion.div
                            key={recipe.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => onRecipeSelect(recipe)}
                            className="bg-white rounded-xl border-2 border-neutral-200 hover:border-primary cursor-pointer transition-all duration-200 hover:shadow-lg overflow-hidden"
                        >
                            <div className="flex gap-4 p-4">
                                {/* Recipe Image */}
                                <div className="flex-shrink-0">
                                    <img
                                        src={recipe.image_url}
                                        alt={recipe.title}
                                        className="w-20 h-20 object-cover rounded-lg"
                                    />
                                </div>

                                {/* Recipe Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-neutral-42 mb-1 truncate">
                                        {recipe.title}
                                    </h3>
                                    <p className="text-sm text-neutral-61 line-clamp-2 mb-2">
                                        {recipe.description}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-neutral-61">
                                        {((recipe.prep_time || 0) + (recipe.cook_time || 0)) > 0 && (
                                            <>
                                                <span>⏱️ {(recipe.prep_time || 0) + (recipe.cook_time || 0)} min</span>
                                                {recipe.nutrition?.calories > 0 && <span>•</span>}
                                            </>
                                        )}
                                        {recipe.nutrition?.calories > 0 && (
                                            <span>🔥 {recipe.nutrition.calories} kcal</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <div className="text-5xl mb-4">📝</div>
                    <p className="text-neutral-61 mb-2">
                        No {activeSubTab === "saved" ? "saved" : "liked"} recipes available to share
                    </p>
                    <p className="text-sm text-neutral-75">
                        {activeSubTab === "saved"
                            ? "Save some recipes first to share them with the community"
                            : "Like some recipes first to share them with the community"}
                    </p>
                </div>
            )}
        </div>
    );
}