// Shared type definitions for admin store

export interface User {
    id: string;
    user_id: string;
    email: string;
    full_name: string;
    status: string;
    created_at: string;
    last_login: string | null;
    email_confirmed_at?: string | null;
    recipes_count: number;
    profile: any;
}

export interface UserAnalytics {
    active_users: number;
    inactive_users: number;
    suspended_users: number;
    deleted_users: number;
    unverified_users: number;
    total_users: number;
    growth_data: any[];
}

export interface Recipe {
    id: string;
    title: string;
    description: string;
    meal_type: string;
    tags: string[];
    created_at: string;
    image_url: string;
    performance?: any;
}

export interface RecipeAnalytics {
    total_recipes: number;
    ai_generated_count: number;
    meal_type_distribution: Record<string, number>;
    tag_distribution: Record<string, number>;
    performance_data: any[];
}

export interface CommunityRecipe {
    recipe_id: string;
    posted_by: string;
    likes: number;
    views: number;
    shares: number;
    comments_count: number;
    is_featured: boolean;
    created_at: string;
    recipes?: {
        title: string;
        description: string;
        image_url: string;
        user_id?: string;
    };
}

export interface CommunityAnalytics {
    total_community_recipes: number;
    featured_count: number;
    total_likes: number;
    total_views: number;
    total_shares: number;
    total_comments: number;
    engagement_data: any[];
}

