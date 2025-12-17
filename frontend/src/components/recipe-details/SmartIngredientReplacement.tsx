import { useState, useEffect } from 'react';

interface Ingredient {
    name: string;
    quantity: string;
    unit?: string;
}

interface SmartIngredientReplacementProps {
    ingredients: Ingredient[];
    isOpen: boolean;
    onClose: () => void;
    onReplace: (ingredientIndices: number[], reason: string) => void;
}

export default function SmartIngredientReplacement({
    ingredients,
    isOpen,
    onClose,
    onReplace,
}: SmartIngredientReplacementProps) {
    const [selectedIngredients, setSelectedIngredients] = useState<Set<number>>(new Set());
    const [replacementReason, setReplacementReason] = useState<string>('');

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setSelectedIngredients(new Set());
            setReplacementReason('');
        }
    }, [isOpen]);

    const toggleIngredient = (index: number) => {
        setSelectedIngredients((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (selectedIngredients.size === 0 || !replacementReason.trim()) {
            alert('Please select at least one ingredient and provide a replacement reason');
            return;
        }

        // Call parent's onReplace handler - it will handle the API call
        onReplace(Array.from(selectedIngredients), replacementReason.trim());
    };

    const formatIngredient = (ingredient: Ingredient): string => {
        if (ingredient.unit) {
            return `${ingredient.quantity} ${ingredient.unit} ${ingredient.name}`;
        }
        return `${ingredient.quantity} ${ingredient.name}`;
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
                        <span>🔄</span>
                        <span>Smart Ingredient Replacement</span>
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-2xl text-neutral-61 hover:text-neutral-42 transition-colors"
                        aria-label="Close modal"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Multi-select Ingredient Checkboxes */}
                    <div>
                        <label className="block text-xs sm:text-sm font-semibold text-neutral-42 mb-2">
                            Select Ingredients to Replace <span className="text-red-500">*</span>
                        </label>
                        <div className="space-y-2 p-3 sm:p-4 bg-neutral-50 rounded-xl max-h-64 overflow-y-auto border-2 border-neutral-200">
                            {ingredients.map((ingredient, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-white transition-colors cursor-pointer"
                                    onClick={() => toggleIngredient(index)}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIngredients.has(index)}
                                        onChange={() => toggleIngredient(index)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-4 h-4 sm:w-5 sm:h-5 rounded border-neutral-300 text-primary focus:ring-primary cursor-pointer"
                                        aria-label={`Select ${formatIngredient(ingredient)}`}
                                    />
                                    <span className="flex-1 text-xs sm:text-sm text-neutral-61">
                                        {formatIngredient(ingredient)}
                                    </span>
                                </div>
                            ))}
                        </div>
                        {selectedIngredients.size > 0 && (
                            <p className="mt-2 text-xs sm:text-sm text-neutral-61">
                                {selectedIngredients.size} ingredient{selectedIngredients.size !== 1 ? 's' : ''} selected
                            </p>
                        )}
                    </div>

                    {/* Replacement Reason Text Field */}
                    <div>
                        <label htmlFor="replacement-reason" className="block text-sm font-semibold text-neutral-42 mb-2">
                            Replacement Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="replacement-reason"
                            value={replacementReason}
                            onChange={(e) => setReplacementReason(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white resize-none"
                            rows={4}
                            placeholder="e.g., Need vegan alternatives, want to reduce calories, dietary restrictions..."
                            required
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={selectedIngredients.size === 0 || !replacementReason.trim()}
                        className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <span>✨</span>
                        <span>Find Smart Replacements</span>
                    </button>
                </form>
            </div>
        </div>
    );
}
