import { useState } from 'react';
import OptimizeMealForm from '../feast-studio/OptimizeMealForm';
import CollapsibleSection from '../feast-studio/CollapsibleSection';

interface Ingredient {
    name: string;
    quantity: string;
    unit?: string;
}

interface RecipeStep {
    step_number: number;
    instruction: string;
    step_type?: "active" | "passive" | "wait";
}

interface RecipeOptimizerProps {
    title: string;
    description: string;
    ingredients: Ingredient[];
    steps: RecipeStep[];
    tags?: string[];
    onOptimize: (optimizedRecipe: any) => void;
}

export default function RecipeOptimizer({
    title,
    description,
    ingredients,
    steps,
    tags = [],
    onOptimize,
}: RecipeOptimizerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [optimizedRecipe, setOptimizedRecipe] = useState<any>(null);

    // Format current recipe as text for the form
    const formatRecipeAsText = (): string => {
        const ingredientsText = ingredients
            .map((ing) => {
                if (ing.unit) {
                    return `- ${ing.quantity} ${ing.unit} ${ing.name}`;
                }
                return `- ${ing.quantity} ${ing.name}`;
            })
            .join('\n');

        const stepsText = steps
            .map((step) => `${step.step_number}. ${step.instruction}`)
            .join('\n');

        const tagsText = tags.length > 0 ? `\nTags: ${tags.join(', ')}` : '';

        return `Recipe: ${title}\n\nDescription: ${description}${tagsText}\n\nIngredients:\n${ingredientsText}\n\nInstructions:\n${stepsText}`;
    };

    const handleOptimize = async (data: {
        recipeName: string;
        recipeDescription: string;
        optimizationGoal: string;
        additionalNotes: string;
    }) => {
        setLoading(true);

        // Use the formatted recipe text if description is empty
        const recipeDescription = data.recipeDescription || formatRecipeAsText();
        const recipeName = data.recipeName || title;

        // TODO: Call backend API when implemented
        // POST /api/recipes/{recipe_id}/optimize
        // For now, show mock result
        setTimeout(() => {
            const mockOptimized = {
                title: recipeName,
                description: recipeDescription,
                optimizationGoal: data.optimizationGoal,
                changes: [
                    'Reduced oil by 50%',
                    'Added more vegetables',
                    'Replaced refined flour with whole wheat',
                ],
            };
            setOptimizedRecipe(mockOptimized);
            setLoading(false);
            onOptimize(mockOptimized);
        }, 2000);
    };

    return (
        <CollapsibleSection
            title="Optimize Recipe"
            icon="✨"
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
        >
            <div className="mb-4 p-4 bg-neutral-50 rounded-xl">
                <p className="text-sm text-neutral-61 mb-2">
                    <strong>Current Recipe:</strong> {title}
                </p>
                <p className="text-xs text-neutral-400">
                    The form below is pre-filled with your current recipe. Select an optimization goal to proceed.
                </p>
            </div>
            <OptimizeMealForm
                onSubmit={handleOptimize}
                loading={loading}
            />

            {/* Display Optimized Recipe Result */}
            {optimizedRecipe && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <h4 className="font-semibold text-blue-800 mb-3">Optimized Recipe:</h4>
                    <div className="space-y-2 text-blue-700">
                        <p>
                            <strong>Title:</strong> {optimizedRecipe.title}
                        </p>
                        <p>
                            <strong>Description:</strong> {optimizedRecipe.description}
                        </p>
                        {optimizedRecipe.changes && optimizedRecipe.changes.length > 0 && (
                            <div>
                                <strong>Changes Made:</strong>
                                <ul className="list-disc list-inside mt-1">
                                    {optimizedRecipe.changes.map((change: string, index: number) => (
                                        <li key={index}>{change}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-blue-600 mt-3">
                        Note: Backend API integration pending. This is a mock result.
                    </p>
                </div>
            )}
        </CollapsibleSection>
    );
}

