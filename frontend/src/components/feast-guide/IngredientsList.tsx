import { useState, memo } from 'react';
import { motion } from 'framer-motion';

interface IngredientsListProps {
    ingredients: string[] | Array<{ name: string; quantity?: string; unit?: string }>;
}

function IngredientsList({ ingredients }: IngredientsListProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());

    if (!ingredients || ingredients.length === 0) {
        return null;
    }

    const toggleIngredient = (index: number) => {
        setCheckedIngredients(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const formatIngredient = (ing: string | { name: string; quantity?: string; unit?: string }, index: number): string => {
        if (typeof ing === 'string') {
            return ing;
        }
        const parts = [];
        if (ing.quantity) parts.push(ing.quantity);
        if (ing.unit) parts.push(ing.unit);
        if (ing.name) parts.push(ing.name);
        return parts.join(' ');
    };

    return (
        <div className="rounded-xl sm:rounded-2xl overflow-hidden bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-xl backdrop-saturate-180 border border-white/40 shadow-[0_12px_40px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.08)]"
        >
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`w-full p-3 sm:p-3.5 md:p-4 flex items-center justify-between transition-all duration-300 cursor-pointer group ${isExpanded ? 'bg-gradient-to-br from-emerald-500/8 to-emerald-600/5' : 'bg-transparent'}`}
                aria-expanded={isExpanded}
            >
                <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3">
                    <span className="text-xl sm:text-2xl">🥘</span>
                    <h3 className="text-sm sm:text-base md:text-lg font-semibold text-neutral-61">Ingredients</h3>
                    <span className="text-xs sm:text-sm text-neutral-75">({ingredients.length})</span>
                </div>
                <svg
                    className={`w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-neutral-61 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            </button>

            {isExpanded && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="px-3 pb-3 sm:px-3.5 sm:pb-3.5 md:px-4 md:pb-4"
                >
                    <div className="space-y-1.5 sm:space-y-2">
                        {ingredients.map((ing, index) => {
                            const isChecked = checkedIngredients.has(index);
                            const ingredientText = formatIngredient(ing, index);
                            
                            return (
                                <label
                                    key={index}
                                    className="flex items-start gap-2 sm:gap-2.5 md:gap-3 p-2 sm:p-2.5 md:p-3 rounded-lg bg-white/60 border border-primary/10 cursor-pointer hover:bg-primary/5 transition-colors group"
                                >
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleIngredient(index)}
                                        className="mt-1 w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded border-2 border-primary/30 text-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
                                    />
                                    <span
                                        className={`text-neutral-61 text-xs sm:text-sm flex-1 ${
                                            isChecked ? 'line-through text-neutral-75' : ''
                                        }`}
                                    >
                                        {ingredientText}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </motion.div>
            )}
        </div>
    );
}

export default memo(IngredientsList);

