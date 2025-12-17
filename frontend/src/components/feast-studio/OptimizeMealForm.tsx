import { useState, useEffect } from "react";

interface OptimizeMealFormProps {
    onSubmit: (data: {
        recipeName: string;
        recipeDescription: string;
        optimizationGoal: string;
        additionalNotes: string;
    }) => void;
    loading?: boolean;
    initialRecipeName?: string;
    initialRecipeDescription?: string;
    onReset?: () => void;
}

const optimizationGoals = [
    "Lower calories",
    "Increase protein",
    "Make it vegan",
    "Simplify ingredients",
    "Healthier version",
    "Chef's upgrade",
];

export default function OptimizeMealForm({ 
    onSubmit, 
    loading = false,
    initialRecipeName,
    initialRecipeDescription,
    onReset
}: OptimizeMealFormProps) {
    const [recipeName, setRecipeName] = useState("");
    const [recipeDescription, setRecipeDescription] = useState("");
    const [optimizationGoal, setOptimizationGoal] = useState("");
    const [customGoal, setCustomGoal] = useState("");
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [additionalNotes, setAdditionalNotes] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Pre-fill form when initial values change
    useEffect(() => {
        // Set recipe name - use empty string if null/undefined
        setRecipeName(initialRecipeName || "");
        // Set recipe description - use empty string if null/undefined
        setRecipeDescription(initialRecipeDescription || "");
        // Reset optimization goal and custom goal (user must select new one)
        setOptimizationGoal("");
        setCustomGoal("");
        setShowCustomInput(false);
        setAdditionalNotes("");
    }, [initialRecipeName, initialRecipeDescription]);

    // Handle reset - clear all form fields
    const handleReset = () => {
        setRecipeName("");
        setRecipeDescription("");
        setOptimizationGoal("");
        setCustomGoal("");
        setShowCustomInput(false);
        setAdditionalNotes("");
        setErrors({});
        if (onReset) {
            onReset();
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};

        if (!recipeDescription.trim()) {
            newErrors.recipeDescription = "Please provide a recipe description or URL";
        }

        if (!optimizationGoal) {
            newErrors.optimizationGoal = "Please select an optimization goal";
        }

        // Validate custom goal if "Other" is selected
        if (optimizationGoal === "Other" && !customGoal.trim()) {
            newErrors.customGoal = "Please specify your custom optimization goal";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // Use custom goal if "Other" is selected, otherwise use the selected goal
        const finalOptimizationGoal = optimizationGoal === "Other" ? customGoal.trim() : optimizationGoal;

        onSubmit({
            recipeName: recipeName.trim(),
            recipeDescription: recipeDescription.trim(),
            optimizationGoal: finalOptimizationGoal,
            additionalNotes: additionalNotes.trim(),
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 md:space-y-6">
            {/* Reset Button */}
            {onReset && (
                <div className="flex justify-end mb-4">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="text-neutral-61 hover:text-red-600 font-semibold py-1.5 sm:py-2 px-3 sm:px-4 rounded-xl border-2 border-neutral-200 hover:border-red-300 transition-all duration-200 bg-white/50 hover:bg-red-50/80 text-xs sm:text-sm"
                        title="Reset form to start over"
                    >
                        🔄 Reset
                    </button>
                </div>
            )}
            
            {/* Recipe Name */}
            <div>
                <label htmlFor="optimize-recipe-name" className="block text-[11px] sm:text-sm font-semibold text-neutral-42 mb-1.5 sm:mb-2">
                    Recipe Name <span className="text-neutral-400 text-xs">(Optional)</span>
                </label>
                <input
                    type="text"
                    id="optimize-recipe-name"
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 border-neutral-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white/50 text-xs sm:text-base"
                    placeholder="e.g., Grandma's Chocolate Cake"
                />
            </div>

            {/* Recipe Description or URL */}
            <div>
                <label htmlFor="optimize-recipe-description" className="block text-[11px] sm:text-sm font-semibold text-neutral-42 mb-1.5 sm:mb-2">
                    Recipe Description or URL <span className="text-red-500">*</span>
                </label>
                <textarea
                    id="optimize-recipe-description"
                    value={recipeDescription}
                    onChange={(e) => {
                        setRecipeDescription(e.target.value);
                        if (errors.recipeDescription) {
                            setErrors((prev) => ({ ...prev, recipeDescription: "" }));
                        }
                    }}
                    rows={4}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 transition-colors text-xs sm:text-base ${
                        errors.recipeDescription
                            ? "border-red-500 focus:border-red-500"
                            : "border-neutral-200 focus:border-primary"
                    } focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white/50 resize-none`}
                    placeholder="Paste your recipe or URL here...&#10;&#10;Example:&#10;Ingredients:&#10;- 2 cups flour&#10;- 1 cup sugar&#10;...&#10;&#10;Instructions:&#10;1. Mix ingredients..."
                />
                {errors.recipeDescription && (
                    <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.recipeDescription}</p>
                )}
            </div>

            {/* Optimization Goal */}
            <div>
                <label htmlFor="optimize-goal" className="block text-[11px] sm:text-sm font-semibold text-neutral-42 mb-1.5 sm:mb-2">
                    Optimization Goal <span className="text-red-500">*</span>
                </label>
                <select
                    id="optimize-goal"
                    value={optimizationGoal}
                    onChange={(e) => {
                        const value = e.target.value;
                        setOptimizationGoal(value);
                        
                        // Show custom input if "Other" is selected
                        if (value === "Other") {
                            setShowCustomInput(true);
                            setCustomGoal(""); // Clear previous custom goal
                        } else {
                            setShowCustomInput(false);
                            setCustomGoal("");
                        }
                        
                        // Clear errors
                        if (errors.optimizationGoal) {
                            setErrors((prev) => ({ ...prev, optimizationGoal: "" }));
                        }
                        if (errors.customGoal) {
                            setErrors((prev) => ({ ...prev, customGoal: "" }));
                        }
                    }}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 transition-colors text-xs sm:text-base ${
                        errors.optimizationGoal
                            ? "border-red-500 focus:border-red-500"
                            : "border-neutral-200 focus:border-primary"
                    } focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white/50`}
                >
                    <option value="">Select an optimization goal...</option>
                    {optimizationGoals.map((goal) => (
                        <option key={goal} value={goal}>
                            {goal}
                        </option>
                    ))}
                    <option value="Other">Other (specify below)</option>
                </select>
                {errors.optimizationGoal && (
                    <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.optimizationGoal}</p>
                )}
                
                {/* Custom Goal Input - shown when "Other" is selected */}
                {showCustomInput && (
                    <div className="mt-3">
                        <label htmlFor="custom-goal" className="block text-[11px] sm:text-sm font-semibold text-neutral-42 mb-1.5 sm:mb-2">
                            Custom Optimization Goal <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="custom-goal"
                            value={customGoal}
                            onChange={(e) => {
                                setCustomGoal(e.target.value);
                                if (errors.customGoal) {
                                    setErrors((prev) => ({ ...prev, customGoal: "" }));
                                }
                            }}
                            className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 transition-colors text-xs sm:text-base ${
                                errors.customGoal
                                    ? "border-red-500 focus:border-red-500"
                                    : "border-neutral-200 focus:border-primary"
                            } focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white/50`}
                            placeholder="e.g., Make it keto-friendly, Add more fiber, Reduce cooking time..."
                        />
                        {errors.customGoal && (
                            <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.customGoal}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Additional Notes */}
            <div>
                <label htmlFor="optimize-notes" className="block text-[11px] sm:text-sm font-semibold text-neutral-42 mb-1.5 sm:mb-2">
                    Anything else you want changed? <span className="text-neutral-400 text-xs">(Optional)</span>
                </label>
                <textarea
                    id="optimize-notes"
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 border-neutral-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white/50 resize-none text-xs sm:text-base"
                    placeholder="e.g., Make it gluten-free, reduce sodium, add more vegetables..."
                />
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 sm:py-3 md:py-4 px-4 sm:px-5 md:px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-base md:text-lg"
            >
                {loading ? "Optimizing Recipe... ✨" : "Optimize My Recipe ✨"}
            </button>
        </form>
    );
}

