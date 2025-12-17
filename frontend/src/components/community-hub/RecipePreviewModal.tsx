import { motion, AnimatePresence } from "framer-motion";

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
}

interface RecipePreviewModalProps {
    recipe: Recipe;
    isOpen: boolean;
    onClose: () => void;
    onEditAndShare: () => void;
}

export default function RecipePreviewModal({
    recipe,
    isOpen,
    onClose,
    onEditAndShare,
}: RecipePreviewModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                                <h2 className="text-2xl font-bold text-neutral-42">
                                    Recipe Preview
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="text-neutral-61 hover:text-neutral-42 text-2xl font-bold transition-colors"
                                    aria-label="Close modal"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6">
                                {/* Recipe Image or Title */}
                                <div className="w-full h-64 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                                    {recipe.image_url ? (
                                        <img
                                            src={recipe.image_url}
                                            alt={recipe.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                // If image fails to load, replace with title
                                                const img = e.target as HTMLImageElement;
                                                img.style.display = 'none';
                                                const parent = img.parentElement;
                                                if (parent) {
                                                    const titleEl = document.createElement('h3');
                                                    titleEl.className = 'text-2xl md:text-3xl font-bold text-primary text-center px-4';
                                                    titleEl.textContent = recipe.title;
                                                    parent.appendChild(titleEl);
                                                }
                                            }}
                                        />
                                    ) : (
                                        <h3 className="text-2xl md:text-3xl font-bold text-primary text-center px-4">
                                            {recipe.title}
                                        </h3>
                                    )}
                                </div>

                                {/* Recipe Title - Only show if image exists */}
                                {recipe.image_url && (
                                    <h3 className="text-2xl font-bold text-neutral-42">
                                        {recipe.title}
                                    </h3>
                                )}

                                {/* Description */}
                                <p className="text-neutral-61">{recipe.description}</p>

                                {/* Tags */}
                                {recipe.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {recipe.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Recipe Info Grid */}
                                <div className="flex flex-wrap gap-4 p-4 bg-neutral-50 rounded-xl">
                                    {recipe.prep_time > 0 && (
                                        <div>
                                            <div className="text-sm text-neutral-61 mb-1">Prep Time</div>
                                            <div className="font-semibold text-neutral-42">
                                                {recipe.prep_time} min
                                            </div>
                                        </div>
                                    )}
                                    {recipe.cook_time > 0 && (
                                        <div>
                                            <div className="text-sm text-neutral-61 mb-1">Cook Time</div>
                                            <div className="font-semibold text-neutral-42">
                                                {recipe.cook_time} min
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <div className="text-sm text-neutral-61 mb-1">Servings</div>
                                        <div className="font-semibold text-neutral-42">
                                            {recipe.serving_size}
                                        </div>
                                    </div>
                                    {recipe.nutrition.calories > 0 && (
                                        <div>
                                            <div className="text-sm text-neutral-61 mb-1">Calories</div>
                                            <div className="font-semibold text-neutral-42">
                                                {recipe.nutrition.calories} kcal
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Nutrition Info */}
                                {(recipe.nutrition.protein ||
                                    recipe.nutrition.carbs ||
                                    recipe.nutrition.fats) && (
                                        <div className="p-4 bg-neutral-50 rounded-xl">
                                            <h4 className="font-semibold text-neutral-42 mb-3">
                                                Nutrition per serving
                                            </h4>
                                            <div className="grid grid-cols-3 gap-4">
                                                {recipe.nutrition.protein && (
                                                    <div>
                                                        <div className="text-sm text-neutral-61 mb-1">
                                                            Protein
                                                        </div>
                                                        <div className="font-semibold text-neutral-42">
                                                            {recipe.nutrition.protein}g
                                                        </div>
                                                    </div>
                                                )}
                                                {recipe.nutrition.carbs && (
                                                    <div>
                                                        <div className="text-sm text-neutral-61 mb-1">
                                                            Carbs
                                                        </div>
                                                        <div className="font-semibold text-neutral-42">
                                                            {recipe.nutrition.carbs}g
                                                        </div>
                                                    </div>
                                                )}
                                                {recipe.nutrition.fats && (
                                                    <div>
                                                        <div className="text-sm text-neutral-61 mb-1">
                                                            Fats
                                                        </div>
                                                        <div className="font-semibold text-neutral-42">
                                                            {recipe.nutrition.fats}g
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                {/* Action Buttons */}
                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={onClose}
                                        className="flex-1 px-6 py-3 border-2 border-neutral-200 hover:border-neutral-300 text-neutral-42 font-semibold rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={onEditAndShare}
                                        className="flex-1 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                                    >
                                        Edit & Share
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}