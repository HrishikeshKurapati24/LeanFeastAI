import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface RecipeStep {
    text?: string;
    instruction?: string;
    step_type?: "active" | "passive" | "wait";
}

interface Recipe {
    id: string;
    title: string;
    image_url?: string;
    description?: string;
    tags?: string[];
    prep_time?: number;
    cook_time?: number;
    serving_size?: number;
    nutrition?: {
        calories?: number;
        protein?: number;
        carbs?: number;
        fats?: number;
    };
    ingredients?: string[];
    steps?: RecipeStep[];
    created_at?: string;
    posted_by?: {
        id: string;
        name: string;
        avatar?: string;
    };
}

export default function RecipePage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isIngredientsOpen, setIsIngredientsOpen] = useState(true);

    useEffect(() => {
        const fetchRecipe = async () => {
            if (!id) {
                setError("Recipe ID is missing");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                const response = await fetch(`${backendUrl}/api/recipes/${id}/public`);

                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error("Recipe not found");
                    }
                    throw new Error(`Failed to load recipe: ${response.statusText}`);
                }

                const result = await response.json();
                const recipeData = result.recipe;

                // Transform steps from backend format to frontend format
                if (recipeData.steps && Array.isArray(recipeData.steps)) {
                    recipeData.steps = recipeData.steps.map((step: any) => ({
                        text: step.instruction || step.text || "",
                        step_type: step.step_type || "active"
                    }));
                }

                setRecipe(recipeData);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load recipe. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchRecipe();
    }, [id]);

    const formatDate = (dateString?: string) => {
        if (!dateString) return "Recently";
        try {
            const date = new Date(dateString);
            return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
                Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
                "day"
            );
        } catch {
            return "Recently";
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center"
                style={{
                    background: 'linear-gradient(135deg, #fafcfb 0%, #dcfce7 50%, #ffffff 100%)',
                }}
            >
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                    <p className="text-neutral-61">Loading recipe...</p>
                </div>
            </div>
        );
    }

    if (error || !recipe) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4"
                style={{
                    background: 'linear-gradient(135deg, #fafcfb 0%, #dcfce7 50%, #ffffff 100%)',
                }}
            >
                <div className="text-center max-w-md">
                    <h1 className="text-2xl font-bold text-neutral-42 mb-4">Recipe Not Found</h1>
                    <p className="text-neutral-61 mb-6">{error || "The recipe you're looking for doesn't exist."}</p>
                    <Link
                        to="/"
                        className="inline-block px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors"
                    >
                        Visit LeanFeastAI
                    </Link>
                </div>
            </div>
        );
    }

    const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

    return (
        <div className="min-h-screen"
            style={{
                background: '#fafcfb',
            }}
        >
            {/* Navigation Header */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-primary/20">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    {user ? (
                        <button
                            onClick={() => navigate(-1)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors"
                        >
                            <span>←</span>
                            <span>Back</span>
                        </button>
                    ) : (
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors"
                        >
                            <span>←</span>
                            <span>Visit LeanFeastAI</span>
                        </Link>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-2 sm:px-4 py-3 sm:py-6">
                {/* Hero Image */}
                <div className="relative h-32 sm:h-48 md:h-64 rounded-lg sm:rounded-xl overflow-hidden mb-3 sm:mb-4 bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                    {recipe.image_url ? (
                        <img
                            src={recipe.image_url}
                            alt={recipe.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = "";
                            }}
                        />
                    ) : (
                        <span className="text-3xl sm:text-4xl md:text-6xl">🍳</span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-4 md:p-6">
                        <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2 drop-shadow-lg">
                            {recipe.title}
                        </h1>
                        {/* Tags */}
                        {recipe.tags && recipe.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 sm:gap-2">
                                {recipe.tags.map((tag, index) => (
                                    <span
                                        key={index}
                                        className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs sm:text-sm font-semibold text-neutral-42"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Description & Author Info */}
                {recipe.description && (
                    <div className="mb-3 sm:mb-4">
                        <p className="text-neutral-61 text-xs sm:text-sm mb-2 sm:mb-3">{recipe.description}</p>
                    </div>
                )}

                <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-neutral-61 mb-3 sm:mb-4">
                    {recipe.posted_by && (
                        <div className="flex items-center gap-1 sm:gap-2">
                            <span>👤</span>
                            <span>{recipe.posted_by.name}</span>
                        </div>
                    )}
                    <span>{formatDate(recipe.created_at)}</span>
                </div>

                {/* Meta Info */}
                {(recipe.prep_time || recipe.cook_time || recipe.serving_size) && (
                    <div className="grid grid-cols-4 gap-1 sm:gap-1.5 mb-3 sm:mb-4 p-1.5 sm:p-2 bg-gradient-to-br from-primary/10 to-primary/5 rounded-md sm:rounded-lg border border-primary/20">
                        {recipe.prep_time !== undefined && (
                            <div className="text-center p-1 sm:p-1.5 md:p-2 bg-white/50 rounded-md">
                                <div className="text-xs text-neutral-61 mb-0.5">Prep Time</div>
                                <div className="text-sm sm:text-base md:text-lg font-bold text-neutral-42">{recipe.prep_time}m</div>
                            </div>
                        )}
                        {recipe.cook_time !== undefined && (
                            <div className="text-center p-1 sm:p-1.5 md:p-2 bg-white/50 rounded-md">
                                <div className="text-xs text-neutral-61 mb-0.5">Cook Time</div>
                                <div className="text-sm sm:text-base md:text-lg font-bold text-neutral-42">{recipe.cook_time}m</div>
                            </div>
                        )}
                        {totalTime > 0 && (
                            <div className="text-center p-1 sm:p-1.5 md:p-2 bg-white/50 rounded-md">
                                <div className="text-xs text-neutral-61 mb-0.5">Total Time</div>
                                <div className="text-sm sm:text-base md:text-lg font-bold text-neutral-42">{totalTime}m</div>
                            </div>
                        )}
                        {recipe.serving_size !== undefined && (
                            <div className="text-center p-1 sm:p-1.5 md:p-2 bg-white/50 rounded-md">
                                <div className="text-xs text-neutral-61 mb-0.5">Servings</div>
                                <div className="text-sm sm:text-base md:text-lg font-bold text-neutral-42">{recipe.serving_size}</div>
                            </div>
                        )}
                    </div>
                )}

                {/* Nutrition Section */}
                {recipe.nutrition && (
                    (recipe.nutrition.calories !== 0 ||
                        recipe.nutrition.protein !== undefined ||
                        recipe.nutrition.carbs !== undefined ||
                        recipe.nutrition.fats !== undefined) && (
                        <div className="mb-3 sm:mb-4 p-2 sm:p-3 md:p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-md sm:rounded-lg border border-primary/20">
                            <h3 className="text-sm sm:text-base md:text-lg font-bold text-neutral-42 mb-1.5 sm:mb-2">Nutrition Facts</h3>
                            <div className="grid grid-cols-4 gap-1 sm:gap-1.5 md:gap-2">
                                {recipe.nutrition.calories !== undefined && (
                                    <div className="text-center p-1 sm:p-1.5 md:p-2 bg-white/50 rounded-md">
                                        <div className="text-xs text-neutral-61 mb-0.5 sm:mb-1">Calories</div>
                                        <div className="text-base sm:text-lg md:text-xl font-bold text-primary">{recipe.nutrition.calories}</div>
                                        <div className="text-xs text-neutral-400">kcal</div>
                                    </div>
                                )}
                                {recipe.nutrition.protein !== undefined && (
                                    <div className="text-center p-1 sm:p-1.5 md:p-2 bg-white/50 rounded-md">
                                        <div className="text-xs text-neutral-61 mb-0.5 sm:mb-1">Protein</div>
                                        <div className="text-base sm:text-lg md:text-xl font-bold text-neutral-42">{recipe.nutrition.protein}g</div>
                                    </div>
                                )}
                                {recipe.nutrition.carbs !== undefined && (
                                    <div className="text-center p-1 sm:p-1.5 md:p-2 bg-white/50 rounded-md">
                                        <div className="text-xs text-neutral-61 mb-0.5 sm:mb-1">Carbs</div>
                                        <div className="text-base sm:text-lg md:text-xl font-bold text-neutral-42">{recipe.nutrition.carbs}g</div>
                                    </div>
                                )}
                                {recipe.nutrition.fats !== undefined && (
                                    <div className="text-center p-1 sm:p-1.5 md:p-2 bg-white/50 rounded-md">
                                        <div className="text-xs text-neutral-61 mb-0.5 sm:mb-1">Fats</div>
                                        <div className="text-base sm:text-lg md:text-xl font-bold text-neutral-42">{recipe.nutrition.fats}g</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                )}

                {/* Ingredients Section */}
                {recipe.ingredients && Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 && (
                    <div className="mb-3 sm:mb-4">
                        <button
                            onClick={() => setIsIngredientsOpen(!isIngredientsOpen)}
                            className="flex items-center justify-between w-full p-2 sm:p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg sm:rounded-xl border border-primary/20 mb-1 sm:mb-2 hover:from-primary/15 hover:to-primary/10 transition-colors"
                            aria-expanded={isIngredientsOpen}
                            aria-controls="ingredients-list"
                        >
                            <h3 className="text-sm sm:text-base md:text-lg font-bold text-neutral-42">Ingredients</h3>
                            <span className="text-lg sm:text-xl">{isIngredientsOpen ? "▼" : "▶"}</span>
                        </button>
                        {isIngredientsOpen && (
                            <div id="ingredients-list" className="space-y-1 sm:space-y-2 p-2 sm:p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                                {recipe.ingredients.map((ingredient, index) => {
                                    // Handle both string and object formats
                                    let ingredientText: string;
                                    if (typeof ingredient === 'string') {
                                        ingredientText = ingredient;
                                    } else if (ingredient && typeof ingredient === 'object') {
                                        // Format object with name, quantity, unit
                                        const name = (ingredient as any).name || '';
                                        const quantity = (ingredient as any).quantity || '';
                                        const unit = (ingredient as any).unit || '';
                                        if (unit) {
                                            ingredientText = `${quantity} ${unit} ${name}`;
                                        } else {
                                            ingredientText = `${quantity} ${name}`;
                                        }
                                    } else {
                                        ingredientText = String(ingredient);
                                    }

                                    return (
                                        <div
                                            key={index}
                                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-primary/20 transition-colors"
                                        >
                                            <span className="text-neutral-61 text-xs sm:text-sm">{ingredientText}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Steps Section */}
                {recipe.steps && recipe.steps.length > 0 && (
                    <div className="mb-3 sm:mb-4 p-3 sm:p-4 md:p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg sm:rounded-xl border border-primary/20">
                        <h3 className="text-sm sm:text-base md:text-lg font-bold text-neutral-42 mb-2 sm:mb-3">Steps</h3>
                        <ol className="space-y-2 sm:space-y-3">
                            {recipe.steps.map((step, index) => (
                                <li key={index} className="flex gap-2 sm:gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs sm:text-sm">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 p-2 sm:p-3 bg-white/50 rounded-lg">
                                        <p className="text-neutral-61 text-xs sm:text-sm mb-0.5 sm:mb-1">{step.text || step.instruction || ""}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                )}
            </div>
        </div>
    );
}