import React from 'react';

interface FeastStudioHeroProps {
    userName: string;
    hasSavedData: boolean;
    onStartFeast: () => void;
    onQuickGenerate: () => void;
}

export default function FeastStudioHero({
    userName,
    hasSavedData,
    onStartFeast,
    onQuickGenerate,
}: FeastStudioHeroProps) {
    return (
        <div className="text-center mb-4 sm:mb-6 md:mb-8 lg:mb-12 animate-fade-in">
            <div className="mb-3 sm:mb-4 md:mb-6 lg:mb-8">
                <h1 className="text-3xl sm:text-5xl md:text-5xl lg:text-5xl xl:text-6xl font-bold text-primary mb-1.5 sm:mb-2 md:mb-3 lg:mb-4">
                    👋 Hey {userName}, welcome to Feast Studio!
                </h1>
                <p className="text-md sm:text-base md:text-lg lg:text-xl xl:text-2xl text-neutral-75 mb-3 sm:mb-4 md:mb-5 lg:mb-6 max-w-3xl mx-auto">
                    Turn your ideas into healthy, flavorful meals with AI-powered cooking.
                </p>
            </div>
            <div className="flex flex-row sm:flex-row gap-2 sm:gap-3 md:gap-4 justify-center items-center mb-3 sm:mb-4 md:mb-6 lg:mb-8">
                <button
                    onClick={onStartFeast}
                    className="bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 sm:py-2.5 md:py-3 lg:py-4 px-4 sm:px-5 md:px-6 lg:px-7 xl:px-8 rounded-lg sm:rounded-xl md:rounded-2xl text-xs sm:text-sm md:text-base lg:text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 w-1/2 sm:w-auto"
                >
                    {hasSavedData ? 'Resume My Feast 🍳' : 'Start My Feast 🍳'}
                </button>
                <button
                    onClick={onQuickGenerate}
                    className="bg-white hover:bg-neutral-50 text-primary border-2 border-primary font-semibold py-2 sm:py-2.5 md:py-3 lg:py-4 px-4 sm:px-5 md:px-6 lg:px-7 xl:px-8 rounded-lg sm:rounded-xl md:rounded-2xl text-xs sm:text-sm md:text-base lg:text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 w-1/2 sm:w-auto"
                >
                    Quick Generate 🪄
                </button>
            </div>

            {/* Quick Navigation Hint */}
            <div className="mb-2 sm:mb-3 md:mb-4 lg:mb-6 p-1 sm:p-1.5 md:p-2 lg:p-3 bg-white/50 rounded-md sm:rounded-lg md:rounded-xl border border-primary/20 max-w-xl sm:max-w-2xl mx-auto">
                <p className="text-[10px] sm:text-xs md:text-sm text-neutral-61 mb-1 sm:mb-1.5 md:mb-2">
                    <strong className="text-primary">✨ Feast Studio offers three tools:</strong>
                </p>

                <div className="flex flex-wrap justify-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-4 text-[10px] sm:text-xs text-neutral-61">
                    <span>🧪 Make My Feast Workflow</span>
                    <span>⚡ Optimize Recipe</span>
                    <span>📜 Recent Meals</span>
                </div>

                <p className="text-[10px] sm:text-xs text-neutral-400 mt-1 sm:mt-1.5 md:mt-2">Choose a tool below to get started</p>
            </div>
        </div>
    );
}

