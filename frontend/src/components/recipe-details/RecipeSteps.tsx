import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CollapsibleSection from '../feast-studio/CollapsibleSection';

interface RecipeStep {
    step_number: number;
    instruction: string;
    step_type?: "active" | "passive" | "wait";
}

interface RecipeStepsProps {
    steps: RecipeStep[];
    recipeId: string;
}

export default function RecipeSteps({ steps, recipeId }: RecipeStepsProps) {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    const handleFeastGuide = () => {
        // Store recipe_id in context for Feast Guide page
        localStorage.setItem('current_recipe_id', recipeId);
        navigate(`/recipe/${recipeId}/FeastGuide`);
    };

    return (
        <CollapsibleSection
            id="steps-section"
            title="Steps"
            icon="📝"
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
        >
            <ol className="space-y-2 sm:space-y-3 mb-2 sm:mb-3">
                {steps.map((step) => (
                    <li key={step.step_number} className="flex gap-2 sm:gap-3">
                        <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs sm:text-sm md:text-base">
                            {step.step_number}
                        </div>
                        <div className="flex-1 pt-0.5 sm:pt-1 md:pt-2">
                            <p className="text-neutral-61 text-xs sm:text-sm md:text-base leading-snug sm:leading-relaxed">
                                {step.instruction}
                            </p>
                        </div>
                    </li>
                ))}
            </ol>
            <button
                onClick={handleFeastGuide}
                className="w-full px-2 sm:px-3 py-2 sm:py-2.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 text-xs sm:text-sm"
                aria-label="Start Feast Guide cooking guide"
            >
                <span>🎧</span>
                <span>Get Feast Guide</span>
            </button>
        </CollapsibleSection>
    );
}

