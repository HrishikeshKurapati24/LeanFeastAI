export interface FormData {
    mealName: string;
    description: string;
    servingSize: string;
    mealType: string;
    flavorControls: Record<string, string>;
    timeConstraints: string;
    calorieRange: string;
    proteinTargetPerServing: string;
}

export interface FieldErrors {
    mealName?: string;
    description?: string;
    servingSize?: string;
    mealType?: string;
    calorieRange?: string;
    proteinTargetPerServing?: string;
}

export interface OptimizeFormData {
    recipeName: string;
    recipeDescription: string;
    optimizationGoal: string;
    additionalNotes: string;
}

export interface ShareFormData {
    image: File | null;
    title: string;
    description: string;
    tags: string[];
    isAiGenerated: boolean;
}

export interface Step {
    number: number;
    name: string;
    title: string;
}

export const STORAGE_KEY = 'leanfeast_form_data';

