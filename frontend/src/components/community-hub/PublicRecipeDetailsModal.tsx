import { useState, useEffect, useRef } from "react";

interface RecipeStep {
    text: string;
    instruction?: string;
    step_type?: "active" | "passive" | "wait";
}

interface Ingredient {
    name: string;
    quantity?: string;
    unit?: string;
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
    ingredients: (string | Ingredient)[];
    steps: RecipeStep[];
    likes: number;
    comments_count: number;
    is_public: boolean;
    posted_by?: {
        id: string;
        name: string;
        avatar?: string;
    };
    created_at?: string;
    is_ai_generated?: boolean;
}

interface PublicRecipeDetailsModalProps {
    recipeId: string;
    isOpen: boolean;
    onClose: () => void;
    onOpenComments?: (recipeId: string) => void;
}

export default function PublicRecipeDetailsModal({
    recipeId,
    isOpen,
    onClose,
    onOpenComments,
}: PublicRecipeDetailsModalProps) {
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isIngredientsOpen, setIsIngredientsOpen] = useState(true);
    const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
    const modalRef = useRef<HTMLDivElement>(null);

    // Fetch recipe from public endpoint when modal opens
    useEffect(() => {
        const loadRecipe = async () => {
            if (!isOpen || !recipeId) return;

            setLoading(true);
            setError(null);

            try {
                const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                const recipeResponse = await fetch(`${backendUrl}/api/recipes/${recipeId}/public`);

                if (!recipeResponse.ok) {
                    throw new Error(`Failed to fetch recipe: ${recipeResponse.statusText}`);
                }

                const result = await recipeResponse.json();
                const recipeData = result.recipe;

                // Normalize prep_time and cook_time to preserve 0 values (default to 0 if null/undefined)
                recipeData.prep_time = recipeData.prep_time ?? 0;
                recipeData.cook_time = recipeData.cook_time ?? 0;

                // Transform steps from backend format to frontend format
                if (recipeData.steps && Array.isArray(recipeData.steps)) {
                    recipeData.steps = recipeData.steps.map((step: any) => ({
                        text: step.instruction || step.text || "",
                        step_type: step.step_type || "active"
                    }));
                }

                setRecipe(recipeData);
            } catch (err) {
                console.error('Error loading recipe:', err);
                setError(err instanceof Error ? err.message : 'Failed to load recipe');
            } finally {
                setLoading(false);
            }
        };

        loadRecipe();
    }, [isOpen, recipeId]);

    // Close modal on ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [isOpen, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    // Focus trap
    useEffect(() => {
        if (isOpen && modalRef.current) {
            const focusableElements = modalRef.current.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

            const handleTab = (e: KeyboardEvent) => {
                if (e.key !== "Tab") return;

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            };

            document.addEventListener("keydown", handleTab);
            firstElement?.focus();

            return () => {
                document.removeEventListener("keydown", handleTab);
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    if (loading) {
        return (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 text-center">
                    <div className="text-3xl sm:text-4xl md:text-5xl mb-2 sm:mb-3 md:mb-4 animate-pulse">🍳</div>
                    <p className="text-xs sm:text-sm md:text-base text-neutral-61">Loading recipe...</p>
                </div>
            </div>
        );
    }

    if (error || !recipe) {
        return (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 text-center max-w-md">
                    <div className="text-3xl sm:text-4xl md:text-5xl mb-2 sm:mb-3 md:mb-4">⚠️</div>
                    <p className="text-xs sm:text-sm md:text-base text-neutral-61 mb-3 sm:mb-4">{error || 'Recipe not found'}</p>
                    <button
                        onClick={onClose}
                        className="px-4 sm:px-6 py-2 sm:py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors text-xs sm:text-sm md:text-base"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    const handleOpenComments = () => {
        if (onOpenComments) {
            onOpenComments(recipe.id);
        }
    };

    const toggleIngredient = (index: number) => {
        setCheckedIngredients((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const totalTime = recipe.prep_time + recipe.cook_time;
    const formatDate = (dateString?: string) => {
        if (!dateString) return "Recently";
        const date = new Date(dateString);
        return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
            Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
            "day"
        );
    };

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-start justify-center pt-24 sm:pt-20 md:pt-24 lg:pt-20 xl:pt-24 px-0 md:px-4 pb-0 md:pb-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="recipe-modal-title"
        >
            <div
                ref={modalRef}
                className="bg-white rounded-none md:rounded-3xl w-full h-[60vh] max-h-[60vh] md:h-[75vh] md:max-h-[75vh] md:max-w-4xl lg:h-[80vh] lg:max-h-[80vh] lg:max-w-5xl xl:h-[82vh] xl:max-h-[82vh] xl:max-w-6xl overflow-hidden flex flex-col animate-slide-up"
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "rgba(255, 255, 255, 0.95)",
                    backdropFilter: "blur(20px) saturate(180%)",
                    WebkitBackdropFilter: "blur(20px) saturate(180%)",
                }}
            >
                {/* Header with Close Button */}
                <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-20 flex justify-between items-center p-3 sm:p-4 border-b border-neutral-200">
                    <h2 id="recipe-modal-title" className="text-base sm:text-lg md:text-2xl font-bold text-neutral-42">
                        {recipe.title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-neutral-200 hover:bg-neutral-300 transition-colors text-neutral-61 hover:text-neutral-42"
                        aria-label="Close modal"
                    >
                        <span className="text-2xl font-bold">×</span>
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto flex-1 min-h-0 px-3 sm:px-4 md:px-6 pb-4 sm:pb-5 md:pb-6">
                    {/* Hero Image */}
                    <div className="relative h-40 sm:h-56 md:h-72 rounded-xl sm:rounded-2xl overflow-hidden mb-4 sm:mb-5 md:mb-6 bg-neutral-100 flex items-center justify-center">
                        <img
                            src={recipe.image_url || "https://via.placeholder.com/800x400?text=Recipe"}
                            alt={recipe.title}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://via.placeholder.com/800x400?text=Recipe";
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3 md:bottom-4 md:left-4 md:right-4">
                            <h2 id="recipe-modal-title" className="text-lg sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2">
                                {recipe.title}
                            </h2>
                            {/* Tags */}
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                {/* AI Generated Tag */}
                                {recipe.is_ai_generated && (
                                    <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full text-[10px] sm:text-xs md:text-sm font-bold shadow-md">
                                        ✨ AI Generated
                                    </span>
                                )}
                                {/* Regular Tags */}
                                {recipe.tags && recipe.tags.length > 0 && (
                                    <>
                                        {recipe.tags.map((tag, index) => (
                                            <span
                                                key={index}
                                                className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white/90 backdrop-blur-sm rounded-full text-[10px] sm:text-xs md:text-sm font-semibold text-neutral-42"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Description & Author Info */}
                    <div className="mb-4 sm:mb-5 md:mb-6">
                        <p className="text-xs sm:text-sm md:text-base text-neutral-61 mb-3 sm:mb-4">{recipe.description}</p>
                        <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3 md:gap-4">
                            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 text-[11px] sm:text-sm text-neutral-61">
                                {recipe.posted_by && (
                                    <div className="flex items-center gap-2">
                                        <span>👤</span>
                                        <span>{recipe.posted_by.name}</span>
                                    </div>
                                )}
                                <span>{formatDate(recipe.created_at)}</span>
                            </div>
                            {/* Read-only Stats */}
                            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                                <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-neutral-100 text-neutral-61 text-xs sm:text-sm">
                                    <span className="text-lg sm:text-xl">❤️</span>
                                    <span>{recipe.likes}</span>
                                </div>
                                <button
                                    onClick={handleOpenComments}
                                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-neutral-100 text-neutral-61 hover:bg-neutral-200 transition-colors text-xs sm:text-sm"
                                    aria-label="View comments"
                                >
                                    <span className="text-lg sm:text-xl">💬</span>
                                    <span>{recipe.comments_count || 0}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-5 md:mb-6 p-3 sm:p-4 bg-neutral-50 rounded-xl sm:rounded-2xl">
                        {recipe.prep_time > 0 && (
                            <div>
                                <div className="text-[11px] sm:text-xs md:text-sm text-neutral-61">Prep Time</div>
                                <div className="text-sm sm:text-base md:text-lg font-bold text-neutral-42">
                                    {recipe.prep_time}m
                                </div>
                            </div>
                        )}
                        {recipe.cook_time > 0 && (
                            <div>
                                <div className="text-[11px] sm:text-xs md:text-sm text-neutral-61">Cook Time</div>
                                <div className="text-sm sm:text-base md:text-lg font-bold text-neutral-42">
                                    {recipe.cook_time}m
                                </div>
                            </div>
                        )}
                        {totalTime > 0 && (
                            <div>
                                <div className="text-[11px] sm:text-xs md:text-sm text-neutral-61">Total Time</div>
                                <div className="text-sm sm:text-base md:text-lg font-bold text-neutral-42">
                                    {totalTime}m
                                </div>
                            </div>
                        )}
                        <div>
                            <div className="text-[11px] sm:text-xs md:text-sm text-neutral-61">Servings</div>
                            <div className="text-sm sm:text-base md:text-lg font-bold text-neutral-42">{recipe.serving_size}</div>
                        </div>
                    </div>

                    {/* Ingredients Section (Collapsible) */}
                    {recipe.ingredients && Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 && (
                        <div className="mb-4 sm:mb-5 md:mb-6">
                            <button
                                onClick={() => setIsIngredientsOpen(!isIngredientsOpen)}
                                className="flex items-center justify-between w-full p-3 sm:p-4 bg-neutral-50 rounded-xl sm:rounded-2xl mb-1.5 sm:mb-2 hover:bg-neutral-100 transition-colors"
                                aria-expanded={isIngredientsOpen}
                                aria-controls="ingredients-list"
                            >
                                <h3 className="text-sm sm:text-base md:text-lg font-bold text-neutral-42">Ingredients</h3>
                                <span className="text-lg sm:text-xl md:text-2xl">{isIngredientsOpen ? "▼" : "▶"}</span>
                            </button>
                            {isIngredientsOpen && (
                                <div id="ingredients-list" className="space-y-1.5 sm:space-y-2 p-3 sm:p-4">
                                    {recipe.ingredients.map((ingredient, index) => {
                                        // Handle both string and object formats
                                        const ingredientText = typeof ingredient === 'string'
                                            ? ingredient
                                            : ingredient.name
                                                ? `${ingredient.quantity || ''} ${ingredient.unit || ''} ${ingredient.name}`.trim()
                                                : JSON.stringify(ingredient);

                                        return (
                                                <label
                                                    key={index}
                                                    className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg hover:bg-neutral-50 cursor-pointer"
                                                >
                                                <input
                                                    type="checkbox"
                                                    checked={checkedIngredients.has(index)}
                                                    onChange={() => toggleIngredient(index)}
                                                    className="w-4 h-4 sm:w-5 sm:h-5 rounded border-neutral-300 text-primary focus:ring-primary"
                                                    aria-label={`Ingredient: ${ingredientText}`}
                                                />
                                                <span
                                                    className={`flex-1 text-xs sm:text-sm ${checkedIngredients.has(index) ? "line-through text-neutral-400" : "text-neutral-61"}`}
                                                >
                                                    {ingredientText}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Steps Section */}
                    {recipe.steps && recipe.steps.length > 0 && (
                        <div className="mb-4 sm:mb-5 md:mb-6">
                            <h3 className="text-sm sm:text-base md:text-lg font-bold text-neutral-42 mb-2 sm:mb-3 md:mb-4">Steps</h3>
                            <ol className="space-y-2.5 sm:space-y-3.5 md:space-y-4">
                                {recipe.steps.map((step, index) => (
                                    <li key={index} className="flex gap-2 sm:gap-3 md:gap-4">
                                        <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs sm:text-sm md:text-base">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs sm:text-sm md:text-base text-neutral-61 mb-0.5 sm:mb-1">{step.text || step.instruction || ""}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}

                    {/* Nutrition Panel */}
                    {recipe.nutrition &&
                        (recipe.nutrition.calories > 0 ||
                            recipe.nutrition.protein ||
                            recipe.nutrition.carbs ||
                            recipe.nutrition.fats) && (
                            <div className="mb-4 sm:mb-5 md:mb-6 p-3 sm:p-4 bg-neutral-50 rounded-xl sm:rounded-2xl">
                                <h3 className="text-sm sm:text-base md:text-lg font-bold text-neutral-42 mb-2 sm:mb-3 md:mb-4">Nutrition</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                                    {recipe.nutrition.calories > 0 && (
                                        <div>
                                            <div className="text-[11px] sm:text-xs md:text-sm text-neutral-61">Calories</div>
                                            <div className="text-sm sm:text-base md:text-lg font-bold text-neutral-42">{recipe.nutrition.calories}</div>
                                        </div>
                                    )}
                                    {recipe.nutrition.protein && (
                                        <div>
                                            <div className="text-[11px] sm:text-xs md:text-sm text-neutral-61">Protein</div>
                                            <div className="text-sm sm:text-base md:text-lg font-bold text-neutral-42">{recipe.nutrition.protein}g</div>
                                        </div>
                                    )}
                                    {recipe.nutrition.carbs && (
                                        <div>
                                            <div className="text-[11px] sm:text-xs md:text-sm text-neutral-61">Carbs</div>
                                            <div className="text-sm sm:text-base md:text-lg font-bold text-neutral-42">{recipe.nutrition.carbs}g</div>
                                        </div>
                                    )}
                                    {recipe.nutrition.fats && (
                                        <div>
                                            <div className="text-[11px] sm:text-xs md:text-sm text-neutral-61">Fats</div>
                                            <div className="text-sm sm:text-base md:text-lg font-bold text-neutral-42">{recipe.nutrition.fats}g</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                </div>
            </div>
        </div>
    );
}

