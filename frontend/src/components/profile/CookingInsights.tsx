import { useNavigate } from 'react-router-dom';

interface CookingInsightsProps {
    insights: {
        total_recipes_created: number;
        total_recipes_shared: number;
        total_optimized: number;
        avg_calories: number;
        most_cooked_meal?: {
            id: string;
            title: string;
            count: number;
        };
    };
}

export default function CookingInsights({ insights }: CookingInsightsProps) {
    const navigate = useNavigate();
    const stats = [
        {
            label: 'Recipes Created',
            value: insights.total_recipes_created,
            icon: '🍳',
            color: 'bg-blue-100 text-blue-700',
        },
        {
            label: 'Recipes Shared',
            value: insights.total_recipes_shared,
            icon: '🌍',
            color: 'bg-green-100 text-green-700',
        },
        {
            label: 'Optimized Meals',
            value: insights.total_optimized,
            icon: '⚡',
            color: 'bg-purple-100 text-purple-700',
        },
        {
            label: 'Avg Calories',
            value: Math.round(insights.avg_calories),
            icon: '🔥',
            color: 'bg-orange-100 text-orange-700',
            unit: 'kcal',
        },
    ];

    const hasData = insights.total_recipes_created > 0 || insights.total_recipes_shared > 0;

    if (!hasData) {
        return (
            <div
                className="rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg mb-4 sm:mb-6 md:mb-8"
                style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                }}
            >
                <h2 className="text-xl sm:text-2xl font-bold text-primary mb-3 sm:mb-4">Cooking Insights</h2>
                <div className="text-center py-6 sm:py-8 md:py-12">
                    <div className="text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-4">📊</div>
                    <p className="text-sm sm:text-base text-neutral-61 mb-3 sm:mb-4">
                        No cooking data yet. Start creating recipes to see your insights!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg mb-4 sm:mb-6 md:mb-8"
            style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
            }}
        >
            <h2 className="text-xl sm:text-2xl font-bold text-primary mb-4 sm:mb-5 md:mb-6">Cooking Insights</h2>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-5 md:mb-6">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 shadow-md hover:shadow-lg transition-shadow text-center"
                    >
                        <div className="text-xl sm:text-2xl md:text-3xl mb-1 sm:mb-2">{stat.icon}</div>
                        <div className="text-lg sm:text-xl md:text-2xl font-bold text-primary mb-0.5 sm:mb-1">
                            {stat.value}
                            {stat.unit && <span className="text-sm sm:text-base md:text-lg text-neutral-61"> {stat.unit}</span>}
                        </div>
                        <div className="text-xs font-semibold text-neutral-61">{stat.label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}