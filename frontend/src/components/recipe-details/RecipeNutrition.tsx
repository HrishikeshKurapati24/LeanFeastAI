import React from 'react';

interface Nutrition {
    calories?: number;
    protein?: number;
    carbs?: number;
    fats?: number;
}

interface RecipeNutritionProps {
    nutrition?: Nutrition;
}

export default function RecipeNutrition({ nutrition }: RecipeNutritionProps) {
    if (!nutrition || Object.keys(nutrition).length === 0) {
        return null;
    }

    return (
        <div className="mb-3 sm:mb-4 md:mb-6 p-2 sm:p-3 md:p-4 bg-gradient-to-br from-primary/6 to-primary/5 rounded-md sm:rounded-lg md:rounded-xl border border-primary/20">
            <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-neutral-42 mb-1.5 sm:mb-2 md:mb-3">Nutrition Facts</h3>
            <div className="grid grid-cols-4 gap-1 sm:gap-1.5 md:gap-2">
                {nutrition.calories !== undefined && (
                    <div className="text-center p-1 sm:p-1.5 md:p-2 bg-white/50 rounded-md">
                        <div className="text-xs text-neutral-61 mb-0.5">Calories</div>
                        <div className="text-sm sm:text-base md:text-lg font-bold text-primary">{nutrition.calories}</div>
                        <div className="text-xs text-neutral-400">kcal</div>
                    </div>
                )}
                {nutrition.protein !== undefined && (
                    <div className="text-center p-1 sm:p-1.5 md:p-2 bg-white/50 rounded-md">
                        <div className="text-xs text-neutral-61 mb-0.5">Protein</div>
                        <div className="text-sm sm:text-base md:text-lg font-bold text-neutral-42">{nutrition.protein}g</div>
                    </div>
                )}
                {nutrition.carbs !== undefined && (
                    <div className="text-center p-1 sm:p-1.5 md:p-2 bg-white/50 rounded-md">
                        <div className="text-xs text-neutral-61 mb-0.5">Carbs</div>
                        <div className="text-sm sm:text-base md:text-lg font-bold text-neutral-42">{nutrition.carbs}g</div>
                    </div>
                )}
                {nutrition.fats !== undefined && (
                    <div className="text-center p-1 sm:p-1.5 md:p-2 bg-white/50 rounded-md">
                        <div className="text-xs text-neutral-61 mb-0.5">Fats</div>
                        <div className="text-sm sm:text-base md:text-lg font-bold text-neutral-42">{nutrition.fats}g</div>
                    </div>
                )}
            </div>
        </div>
    );
}