// Type definitions for profile-related data structures

export interface Profile {
    id: string;
    user_id: string;
    full_name: string;
    avatar_url?: string;
    bio?: string;
    dietary_preferences: string[];
    goals: string[];
    allergies: string[];
    saved_recipes: string[];
    liked_recipes: string[];
    created_at: string;
}

export interface UserRecipe {
    id: string;
    user_id: string;
    title: string;
    description: string;
    meal_type?: string;
    image_url?: string;
    nutrition?: {
        calories?: number;
        protein?: number;
        carbs?: number;
        fats?: number;
    };
    created_at: string;
    is_ai_generated?: boolean;
}

export interface UserAnalytics {
    total_recipes_created: number;
    total_recipes_shared: number;
    total_optimized: number;
    avg_calories: number;
    most_cooked_meal?: {
        id: string;
        title: string;
        count: number;
    };
}

export interface UserActivity {
    id: string;
    action_type: string;
    recipe_id?: string;
    recipe_title?: string;
    timestamp: string;
    metadata?: Record<string, any>;
}

