import { useState } from 'react';
import CollapsibleSection from '../feast-studio/CollapsibleSection';

interface Ingredient {
    name: string;
    quantity: string;
    unit?: string;
}

interface RecipeIngredientsProps {
    ingredients: Ingredient[];
    onOpenSmartReplacement?: () => void;
}

export default function RecipeIngredients({
    ingredients,
    onOpenSmartReplacement,
}: RecipeIngredientsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());

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

    const formatIngredient = (ingredient: Ingredient): string => {
        if (ingredient.unit) {
            return `${ingredient.quantity} ${ingredient.unit} ${ingredient.name}`;
        }
        return `${ingredient.quantity} ${ingredient.name}`;
    };

    return (
        <CollapsibleSection
            id="ingredients-section"
            title="Ingredients"
            icon="🥘"
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
        >
            <div className="space-y-1 sm:space-y-1.5 mb-2 sm:mb-3">
                {ingredients.map((ingredient, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-md hover:bg-neutral-50 transition-colors"
                    >
                        <input
                            type="checkbox"
                            checked={checkedIngredients.has(index)}
                            onChange={() => toggleIngredient(index)}
                            className="w-4 h-4 sm:w-5 sm:h-5 rounded border-neutral-300 text-primary focus:ring-primary cursor-pointer flex-shrink-0"
                            aria-label={`Ingredient: ${formatIngredient(ingredient)}`}
                        />
                        <span
                            className={`flex-1 text-xs sm:text-sm ${
                                checkedIngredients.has(index)
                                    ? 'line-through text-neutral-400'
                                    : 'text-neutral-61'
                            }`}
                        >
                            {formatIngredient(ingredient)}
                        </span>
                    </div>
                ))}
            </div>
            {onOpenSmartReplacement && (
                <button
                    onClick={onOpenSmartReplacement}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 text-xs sm:text-sm"
                    aria-label="Open Smart Ingredient Replacement"
                >
                    <span>🔄</span>
                    <span>Smart Ingredient Replacement</span>
                </button>
            )}
        </CollapsibleSection>
    );
}

