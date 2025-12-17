import { useState } from "react";
import CollapsibleSection from "./CollapsibleSection";

interface Change {
    type: string;
    description: string;
    emoji: string;
}

interface OptimizedRecipe {
    original: {
        name: string;
        ingredients: string[];
        instructions: string[];
    };
    optimized: {
        name: string;
        ingredients: string[];
        instructions: string[];
        image_base64?: string;
        nutrition?: {
            calories?: number;
            protein?: number;
            carbs?: number;
            fats?: number;
            fiber?: number;
            sugar?: number;
        };
    };
    changes: Change[];
}

interface OptimizedRecipeViewProps {
    recipe: OptimizedRecipe;
    onUseRecipe: () => void;
    onTryAnother: () => void;
    isSaving?: boolean;
}

export default function OptimizedRecipeView({
    recipe,
    onUseRecipe,
    onTryAnother,
    isSaving = false,
}: OptimizedRecipeViewProps) {
    const [showOriginalRecipe, setShowOriginalRecipe] = useState(false);
    const [ingredientsExpanded, setIngredientsExpanded] = useState(false);
    const [instructionsExpanded, setInstructionsExpanded] = useState(false);
    const [originalIngredientsExpanded, setOriginalIngredientsExpanded] = useState(false);
    const [originalInstructionsExpanded, setOriginalInstructionsExpanded] = useState(false);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Section */}
            <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-primary mb-4">{recipe.optimized.name}</h2>

                {/* Image */}
                {recipe.optimized.image_base64 && (
                    <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden mb-6">
                        <img
                            src={`data:image/jpeg;base64,${recipe.optimized.image_base64}`}
                            alt={recipe.optimized.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                {/* Nutrition Info */}
                {recipe.optimized.nutrition && (
                    <div className="mb-6 p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20">
                        <h3 className="text-xl sm:text-2xl font-bold text-neutral-42 mb-4">Nutrition Facts</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {recipe.optimized.nutrition.calories !== undefined && (
                                <div className="text-center p-4 bg-white/50 rounded-xl">
                                    <div className="text-xs sm:text-sm text-neutral-61 mb-2">Calories</div>
                                    <div className="text-xl sm:text-2xl font-bold text-primary">{Math.round(recipe.optimized.nutrition.calories)}</div>
                                    <div className="text-[11px] sm:text-xs text-neutral-400">kcal</div>
                                </div>
                            )}
                            {recipe.optimized.nutrition.protein !== undefined && (
                                <div className="text-center p-4 bg-white/50 rounded-xl">
                                    <div className="text-xs sm:text-sm text-neutral-61 mb-2">Protein</div>
                                    <div className="text-xl sm:text-2xl font-bold text-neutral-42">{Math.round(recipe.optimized.nutrition.protein)}g</div>
                                </div>
                            )}
                            {recipe.optimized.nutrition.carbs !== undefined && (
                                <div className="text-center p-4 bg-white/50 rounded-xl">
                                    <div className="text-xs sm:text-sm text-neutral-61 mb-2">Carbs</div>
                                    <div className="text-xl sm:text-2xl font-bold text-neutral-42">{Math.round(recipe.optimized.nutrition.carbs)}g</div>
                                </div>
                            )}
                            {recipe.optimized.nutrition.fats !== undefined && (
                                <div className="text-center p-4 bg-white/50 rounded-xl">
                                    <div className="text-xs sm:text-sm text-neutral-61 mb-2">Fats</div>
                                    <div className="text-xl sm:text-2xl font-bold text-neutral-42">{Math.round(recipe.optimized.nutrition.fats)}g</div>
                                </div>
                            )}
                            {recipe.optimized.nutrition.fiber !== undefined && (
                                <div className="text-center p-4 bg-white/50 rounded-xl">
                                    <div className="text-xs sm:text-sm text-neutral-61 mb-2">Fiber</div>
                                    <div className="text-xl sm:text-2xl font-bold text-neutral-42">{Math.round(recipe.optimized.nutrition.fiber)}g</div>
                                </div>
                            )}
                            {recipe.optimized.nutrition.sugar !== undefined && (
                                <div className="text-center p-4 bg-white/50 rounded-xl">
                                    <div className="text-xs sm:text-sm text-neutral-61 mb-2">Sugar</div>
                                    <div className="text-xl sm:text-2xl font-bold text-neutral-42">{Math.round(recipe.optimized.nutrition.sugar)}g</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Optimizations Made Section - Compact Badge Style */}
            <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                <h3 className="text-xl sm:text-2xl font-bold text-primary mb-4">✨ Optimizations Made</h3>
                <div className="flex flex-wrap gap-2">
                    {recipe.changes.map((change, index) => (
                        <div
                            key={index}
                            className="px-2.5 sm:px-3 py-1 bg-primary/10 text-primary rounded-full text-xs sm:text-sm flex items-center gap-1.5"
                        >
                            <span>{change.emoji}</span>
                            <span>{change.description}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Optimized Recipe Section - Main Focus */}
            <div className="mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-primary mb-4">✨ Optimized Recipe</h3>

                {/* Ingredients Section - Collapsible */}
                <div className="mb-4">
                    <button
                        onClick={() => setIngredientsExpanded(!ingredientsExpanded)}
                        className="flex items-center justify-between w-full mb-2 text-base sm:text-lg font-semibold text-neutral-42 hover:text-primary transition-colors"
                    >
                        <span>Ingredients ({recipe.optimized.ingredients.length})</span>
                        <span className="text-sm">{ingredientsExpanded ? "▼" : "▶"}</span>
                    </button>
                    {ingredientsExpanded && (
                        <div className="space-y-2 p-3 sm:p-4 bg-white/50 rounded-2xl h-64 overflow-y-auto">
                            {recipe.optimized.ingredients.map((ingredient, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors"
                                >
                                    <span className="text-neutral-61">{ingredient}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Instructions Section - Collapsible */}
                <div className="mb-4">
                    <button
                        onClick={() => setInstructionsExpanded(!instructionsExpanded)}
                        className="flex items-center justify-between w-full mb-2 text-base sm:text-lg font-semibold text-neutral-42 hover:text-primary transition-colors"
                    >
                        <span>Instructions ({recipe.optimized.instructions.length} steps)</span>
                        <span className="text-sm">{instructionsExpanded ? "▼" : "▶"}</span>
                    </button>
                    {instructionsExpanded && (
                        <div className="space-y-2 h-64 overflow-y-auto">
                            {recipe.optimized.instructions.map((instruction, index) => (
                                <div key={index} className="flex gap-4">
                                    <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-base sm:text-lg">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 pt-2">
                                        <p className="text-neutral-61 text-sm sm:text-base leading-relaxed">
                                            {instruction}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Original Recipe Section - Collapsible */}
            <div className="mb-6">
                <CollapsibleSection
                    id="original-recipe-section"
                    title="Original Recipe"
                    icon="📋"
                    isOpen={showOriginalRecipe}
                    onToggle={() => setShowOriginalRecipe(!showOriginalRecipe)}
                >
                    <div>
                        <h4 className="text-base sm:text-lg font-bold text-neutral-42 mb-3">{recipe.original.name}</h4>

                        {/* Original Ingredients - Collapsible */}
                        <div className="mb-4">
                            <button
                                onClick={() => setOriginalIngredientsExpanded(!originalIngredientsExpanded)}
                                className="flex items-center justify-between w-full mb-2 text-base sm:text-lg font-semibold text-neutral-42 hover:text-primary transition-colors"
                            >
                                <span>Ingredients ({recipe.original.ingredients.length})</span>
                                <span className="text-sm">{originalIngredientsExpanded ? "▼" : "▶"}</span>
                            </button>
                            {originalIngredientsExpanded && (
                                <div className="space-y-2 p-3 sm:p-4 bg-white/50 rounded-2xl h-64 overflow-y-auto">
                                    {recipe.original.ingredients.map((ingredient, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors"
                                        >
                                            <span className="text-neutral-61 text-sm sm:text-base">{ingredient}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Original Instructions - Collapsible */}
                        {recipe.original.instructions && recipe.original.instructions.length > 0 && (
                            <div className="mb-4">
                                <button
                                    onClick={() => setOriginalInstructionsExpanded(!originalInstructionsExpanded)}
                                    className="flex items-center justify-between w-full mb-2 text-base sm:text-lg font-semibold text-neutral-42 hover:text-primary transition-colors"
                                >
                                    <span>Instructions ({recipe.original.instructions.length} steps)</span>
                                    <span className="text-sm">{originalInstructionsExpanded ? "▼" : "▶"}</span>
                                </button>
                                {originalInstructionsExpanded && (
                                    <div className="space-y-2 h-64 overflow-y-auto">
                                        {recipe.original.instructions.map((instruction, index) => (
                                            <div key={index} className="flex gap-4">
                                                <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-neutral-300 text-neutral-42 flex items-center justify-center font-bold text-base sm:text-lg">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1 pt-2">
                                                    <p className="text-neutral-61 text-sm sm:text-base leading-relaxed">
                                                        {instruction}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </CollapsibleSection>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 pt-4">
                <button
                    onClick={onUseRecipe}
                    disabled={isSaving}
                    className="flex-1 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl min-w-[150px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? '💾 Saving...' : '✅ Use This Recipe'}
                </button>
                <button
                    onClick={onTryAnother}
                    className="flex-1 px-6 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-42 font-semibold rounded-xl transition-colors min-w-[150px]"
                >
                    🔄 Try Another Optimization
                </button>
            </div>
        </div>
    );
}
