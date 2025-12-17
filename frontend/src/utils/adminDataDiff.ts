/**
 * Utility functions for detecting incremental changes in admin data
 * Used to update UI smoothly without full re-renders
 */

interface User {
    id: string;
    user_id: string;
    email: string;
    full_name: string;
    role: string;
    created_at: string;
    last_login: string | null;
    recipes_count: number;
}

interface Recipe {
    id: string;
    title: string;
    description: string;
    meal_type: string;
    tags: string[];
    created_at: string;
    image_url: string;
}

interface CommunityRecipe {
    recipe_id: string;
    posted_by: string;
    likes: number;
    views: number;
    shares: number;
    comments_count: number;
    is_featured: boolean;
    created_at: string;
}

interface DiffResult<T> {
    added: T[];
    updated: T[];
    removed: T[];
}

/**
 * Compare two arrays of users and return changes
 */
export function diffUsers(
    oldUsers: User[],
    newUsers: User[]
): DiffResult<User> {
    const oldMap = new Map(oldUsers.map(u => [u.user_id, u]));
    const newMap = new Map(newUsers.map(u => [u.user_id, u]));

    const added: User[] = [];
    const updated: User[] = [];
    const removed: User[] = [];

    // Find added and updated
    for (const newUser of newUsers) {
        const oldUser = oldMap.get(newUser.user_id);
        if (!oldUser) {
            added.push(newUser);
        } else if (JSON.stringify(oldUser) !== JSON.stringify(newUser)) {
            updated.push(newUser);
        }
    }

    // Find removed
    for (const oldUser of oldUsers) {
        if (!newMap.has(oldUser.user_id)) {
            removed.push(oldUser);
        }
    }

    return { added, updated, removed };
}

/**
 * Compare two arrays of recipes and return changes
 */
export function diffRecipes(
    oldRecipes: Recipe[],
    newRecipes: Recipe[]
): DiffResult<Recipe> {
    const oldMap = new Map(oldRecipes.map(r => [r.id, r]));
    const newMap = new Map(newRecipes.map(r => [r.id, r]));

    const added: Recipe[] = [];
    const updated: Recipe[] = [];
    const removed: Recipe[] = [];

    // Find added and updated
    for (const newRecipe of newRecipes) {
        const oldRecipe = oldMap.get(newRecipe.id);
        if (!oldRecipe) {
            added.push(newRecipe);
        } else if (JSON.stringify(oldRecipe) !== JSON.stringify(newRecipe)) {
            updated.push(newRecipe);
        }
    }

    // Find removed
    for (const oldRecipe of oldRecipes) {
        if (!newMap.has(oldRecipe.id)) {
            removed.push(oldRecipe);
        }
    }

    return { added, updated, removed };
}

/**
 * Compare two arrays of community recipes and return changes
 */
export function diffCommunityRecipes(
    oldRecipes: CommunityRecipe[],
    newRecipes: CommunityRecipe[]
): DiffResult<CommunityRecipe> {
    const oldMap = new Map(oldRecipes.map(r => [r.recipe_id, r]));
    const newMap = new Map(newRecipes.map(r => [r.recipe_id, r]));

    const added: CommunityRecipe[] = [];
    const updated: CommunityRecipe[] = [];
    const removed: CommunityRecipe[] = [];

    // Find added and updated
    for (const newRecipe of newRecipes) {
        const oldRecipe = oldMap.get(newRecipe.recipe_id);
        if (!oldRecipe) {
            added.push(newRecipe);
        } else if (JSON.stringify(oldRecipe) !== JSON.stringify(newRecipe)) {
            updated.push(newRecipe);
        }
    }

    // Find removed
    for (const oldRecipe of oldRecipes) {
        if (!newMap.has(oldRecipe.recipe_id)) {
            removed.push(oldRecipe);
        }
    }

    return { added, updated, removed };
}

/**
 * Deep comparison of analytics objects
 * Returns true if objects are different
 */
export function diffAnalytics(oldAnalytics: any, newAnalytics: any): boolean {
    if (!oldAnalytics && !newAnalytics) return false;
    if (!oldAnalytics || !newAnalytics) return true;
    
    return JSON.stringify(oldAnalytics) !== JSON.stringify(newAnalytics);
}

/**
 * Merge users list with diff result
 */
export function mergeUsers(
    currentUsers: User[],
    diff: DiffResult<User>
): User[] {
    const userMap = new Map(currentUsers.map(u => [u.user_id, u]));

    // Remove deleted users
    for (const removed of diff.removed) {
        userMap.delete(removed.user_id);
    }

    // Update existing users
    for (const updated of diff.updated) {
        userMap.set(updated.user_id, updated);
    }

    // Add new users
    for (const added of diff.added) {
        userMap.set(added.user_id, added);
    }

    // Sort by created_at descending (most recent first)
    return Array.from(userMap.values()).sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
    });
}

/**
 * Merge recipes list with diff result
 */
export function mergeRecipes(
    currentRecipes: Recipe[],
    diff: DiffResult<Recipe>
): Recipe[] {
    const recipeMap = new Map(currentRecipes.map(r => [r.id, r]));

    // Remove deleted recipes
    for (const removed of diff.removed) {
        recipeMap.delete(removed.id);
    }

    // Update existing recipes
    for (const updated of diff.updated) {
        recipeMap.set(updated.id, updated);
    }

    // Add new recipes
    for (const added of diff.added) {
        recipeMap.set(added.id, added);
    }

    // Sort by created_at descending
    return Array.from(recipeMap.values()).sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
    });
}

/**
 * Merge community recipes list with diff result
 */
export function mergeCommunityRecipes(
    currentRecipes: CommunityRecipe[],
    diff: DiffResult<CommunityRecipe>
): CommunityRecipe[] {
    const recipeMap = new Map(currentRecipes.map(r => [r.recipe_id, r]));

    // Remove deleted recipes
    for (const removed of diff.removed) {
        recipeMap.delete(removed.recipe_id);
    }

    // Update existing recipes
    for (const updated of diff.updated) {
        recipeMap.set(updated.recipe_id, updated);
    }

    // Add new recipes
    for (const added of diff.added) {
        recipeMap.set(added.recipe_id, added);
    }

    // Sort by created_at descending
    return Array.from(recipeMap.values()).sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
    });
}

