interface FeastGuideHeaderProps {
    recipeTitle: string;
    servingSize?: number;
    totalTime?: number;
    onEndGuide: () => void;
    onPrevious?: () => void;
    onNext?: () => void;
    canGoPrevious?: boolean;
    canGoNext?: boolean;
    currentStep?: number;
    totalSteps?: number;
    stepType?: string;
    stepTypeEmoji?: string;
}

export default function FeastGuideHeader({
    recipeTitle,
    servingSize,
    totalTime,
    onEndGuide,
    onPrevious,
    onNext,
    canGoPrevious = false,
    canGoNext = false,
    currentStep,
    totalSteps,
    stepType,
    stepTypeEmoji,
}: FeastGuideHeaderProps) {
    return (
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-primary/10 shadow-sm">
            <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4">
                <div className="w-full flex items-center justify-between gap-4">
                    {/* Mobile: Previous Button (Left) */}
                    {onPrevious && (
                        <button
                            onClick={onPrevious}
                            disabled={!canGoPrevious}
                            className="md:hidden flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/80 hover:bg-primary/10 transition-all duration-200 hover:scale-105 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed border border-primary/20"
                            aria-label="Previous step"
                        >
                            <svg
                                className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-primary"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                        </button>
                    )}

                    {/* Recipe Title and Step Info (Center) */}
                    <div className="flex-1 min-w-0 text-center">
                        <h1 className="text-sm sm:text-base md:text-lg lg:text-xl text-light-primary font-medium truncate">
                            {recipeTitle}
                        </h1>
                        {/* Step Number and Type - Show on all screen sizes */}
                        {currentStep !== undefined && totalSteps !== undefined && (
                            <div className="flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2 mt-0.5 sm:mt-1">
                                <span className="text-xs sm:text-sm font-semibold text-neutral-61">
                                    Step {currentStep + 1} of {totalSteps}
                                </span>
                                {stepType && stepTypeEmoji && (
                                    <div className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 bg-primary/10 rounded-full border border-primary/20">
                                        <span className="text-[10px] sm:text-xs font-semibold text-primary">
                                            {stepTypeEmoji} {stepType}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Mobile: Next Button (Right) */}
                    {onNext && (
                        <button
                            onClick={onNext}
                            disabled={!canGoNext}
                            className="md:hidden flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white/80 hover:bg-primary/10 transition-all duration-200 hover:scale-105 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed border border-primary/20"
                            aria-label="Next step"
                        >
                            <svg
                                className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-primary"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M9 5l7 7-7 7"
                                />
                            </svg>
                        </button>
                    )}

                    {/* Desktop: Badges & End Guide Button */}
                    <div className="hidden md:flex items-center gap-2 lg:gap-3">
                        {/* Serving Size Badge */}
                        {servingSize !== undefined && (
                            <div className="flex items-center gap-1 px-2 py-1 md:px-2.5 md:py-1.5 lg:px-3 bg-primary/10 rounded-full border border-primary/20">
                                <span className="text-[10px] md:text-xs font-semibold text-primary">
                                    Serves {servingSize} 🍽️
                                </span>
                            </div>
                        )}

                        {/* Total Time Badge */}
                        {totalTime !== undefined && totalTime > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 md:px-2.5 md:py-1.5 lg:px-3 bg-primary/10 rounded-full border border-primary/20">
                                <span className="text-[10px] md:text-xs font-semibold text-primary">
                                    Total cook time {totalTime}min ⏱️
                                </span>
                            </div>
                        )}

                        {/* Sticky End Guide Button */}
                        <button
                            onClick={onEndGuide}
                            className="px-3 py-1.5 md:px-3.5 md:py-2 lg:px-4 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white font-semibold rounded-full transition-all duration-200 hover:scale-105 shadow-lg text-xs md:text-sm"
                            style={{
                                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                            }}
                            aria-label="End guide"
                        >
                            End Guide
                        </button>
                    </div>

                    {/* Mobile: End Guide Button */}
                    <button
                        onClick={onEndGuide}
                        className="md:hidden flex-shrink-0 px-2 py-1 sm:px-2.5 sm:py-1.5 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white font-semibold rounded-full transition-all duration-200 hover:scale-105 shadow-lg text-[10px] sm:text-xs"
                        style={{
                            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                        }}
                        aria-label="End guide"
                    >
                        End
                    </button>
                </div>
            </div>
        </header>
    );
}