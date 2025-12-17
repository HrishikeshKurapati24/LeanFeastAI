import { useNavigate } from 'react-router-dom';

interface RecentMeal {
    id: string;
    title: string;
    image_url?: string;
    description?: string;
    meal_type?: string;
    created_at: string;
}

interface RecentMealsProps {
    meals: RecentMeal[];
    loading?: boolean;
}

export default function RecentMeals({ meals, loading = false }: RecentMealsProps) {
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-4 text-neutral-61">Loading your recent meals...</p>
            </div>
        );
    }

    if (meals.length === 0) {
        return (
            <div className="text-center py-8 sm:py-12">
                <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🍽️</div>
                <h3 className="text-lg sm:text-xl font-semibold text-neutral-42 mb-2">No recent meals yet</h3>
                <p className="text-sm sm:text-base text-neutral-61 mb-4 sm:mb-6">
                    Start creating your first feast and it will appear here!
                </p>
            </div>
        );
    }

    const handleMealClick = (mealId: string) => {
        navigate(`/recipe/${mealId}/FeastGuide`);
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
            {meals.map((meal) => (
                <div
                    key={meal.id}
                    onClick={() => handleMealClick(meal.id)}
                    className="bg-white/60 backdrop-blur-sm rounded-lg sm:rounded-xl md:rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 border border-neutral-200/50"
                >
                    {meal.image_url && (
                        <div className="aspect-video w-full overflow-hidden bg-neutral-100">
                            <img
                                src={meal.image_url}
                                alt={meal.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                    <div className="p-2 sm:p-3 md:p-4 lg:p-5">
                        {meal.meal_type && (
                            <span className="inline-block px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-primary bg-primary/10 rounded-full mb-1 sm:mb-2">
                                {meal.meal_type}
                            </span>
                        )}
                        <h3 className="text-xs sm:text-sm md:text-base lg:text-lg font-bold text-neutral-42 mb-1 sm:mb-2 line-clamp-2">
                            {meal.title}
                        </h3>
                        {meal.description && (
                            <p className="text-[10px] sm:text-xs md:text-sm text-neutral-61 line-clamp-2 mb-1.5 sm:mb-2 md:mb-3">
                                {meal.description}
                            </p>
                        )}
                        <div className="flex items-center justify-between text-[10px] sm:text-xs text-neutral-61">
                            <span>
                                {new Date(meal.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                })}
                            </span>
                            <span className="text-primary font-semibold hidden sm:inline">Cook Now →</span>
                            <span className="text-primary font-semibold sm:hidden">→</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

