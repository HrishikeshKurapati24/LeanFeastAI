import { memo } from 'react';

interface RecipeStep {
    text?: string;
    image_url?: string;
}

interface StepsListProps {
    steps: RecipeStep[];
    currentIndex: number;
    completedSteps: Set<number>;
    onStepClick: (index: number) => void;
    isExpanded: boolean;
    onToggleExpand: () => void;
}

function StepsList({
    steps,
    currentIndex,
    completedSteps,
    onStepClick,
    isExpanded,
    onToggleExpand,
}: StepsListProps) {
    const getStepTitle = (step: RecipeStep, index: number): string => {
        return step.text || `Step ${index + 1}`;
    };

    // Show 2-3 steps when collapsed
    const collapsedSteps = steps.slice(0, 3);

    return (
        <div className="w-full bg-white/80 backdrop-blur-sm rounded-[16px] sm:rounded-[20px] md:rounded-[24px] border border-white/50 shadow-[0px_8px_24px_rgba(0,0,0,0.06)] p-3 sm:p-3.5 md:p-4 lg:p-5">
            {/* Header with Expand/Collapse */}
            <button
                onClick={onToggleExpand}
                className="w-full flex items-center justify-between p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-[16px] sm:rounded-[18px] md:rounded-[20px] border border-primary/20 mb-2 sm:mb-2.5 md:mb-3 hover:from-primary/15 hover:to-primary/10 transition-all duration-200 hover:scale-[1.02]"
                aria-expanded={isExpanded}
                aria-label={isExpanded ? 'Collapse steps list' : 'Expand steps list'}
            >
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-neutral-42 flex items-center gap-1.5 sm:gap-2">
                    📋 Steps
                </h3>
                <svg
                    className={`w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-neutral-42 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            </button>

            {/* Steps List */}
            {isExpanded ? (
                <div className="space-y-1.5 sm:space-y-2 max-h-[400px] sm:max-h-[500px] md:max-h-[600px] overflow-y-auto scrollbar-hide">
                    {steps.map((step, index) => {
                        const isCurrent = index === currentIndex;
                        const isCompleted = completedSteps.has(index);

                        return (
                            <button
                                key={index}
                                onClick={() => onStepClick(index)}
                                className={`relative w-full text-left p-2.5 sm:p-3 md:p-4 rounded-[14px] sm:rounded-[16px] md:rounded-[18px] transition-all duration-200 hover:scale-[1.02] ${
                                    isCurrent
                                        ? 'bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary shadow-lg'
                                        : isCompleted
                                        ? 'bg-white/60 opacity-70 hover:opacity-90'
                                        : 'bg-white/50 hover:bg-white/80'
                                }`}
                            >
                                {/* Current Step Accent Bar - Colored Left Border */}
                                {isCurrent && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 sm:w-1.5 bg-gradient-to-b from-primary to-primary-dark rounded-l-[14px] sm:rounded-l-[16px] md:rounded-l-[18px]" />
                                )}
                                
                                <div className="flex items-start gap-2 sm:gap-2.5 md:gap-3">
                                    {/* Step Index Badge */}
                                    <div
                                        className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shadow-sm ${
                                            isCurrent
                                                ? 'bg-gradient-to-br from-primary via-primary to-primary-dark text-white'
                                                : isCompleted
                                                ? 'bg-primary/20 text-primary'
                                                : 'bg-neutral-100 text-neutral-42'
                                        }`}
                                    >
                                        {isCompleted ? '✓' : index + 1}
                                    </div>

                                    {/* Step Content */}
                                    <div className="flex-1 min-w-0">
                                        <p
                                            className={`text-xs sm:text-sm font-semibold ${
                                                isCurrent ? 'text-neutral-42' : 'text-neutral-61'
                                            }`}
                                        >
                                            {getStepTitle(step, index)}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="space-y-1.5 sm:space-y-2">
                    {collapsedSteps.map((step, index) => {
                        const isCurrent = index === currentIndex;
                        const isCompleted = completedSteps.has(index);

                        return (
                            <button
                                key={index}
                                onClick={() => onStepClick(index)}
                                className={`w-full text-left p-2 sm:p-2.5 md:p-3 rounded-[12px] sm:rounded-[14px] md:rounded-[16px] transition-all duration-200 hover:scale-[1.02] ${
                                    isCurrent
                                        ? 'bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary'
                                        : isCompleted
                                        ? 'bg-white/60 opacity-70'
                                        : 'bg-white/50'
                                }`}
                            >
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                    <div
                                        className={`flex-shrink-0 w-6 h-6 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold ${
                                            isCurrent
                                                ? 'bg-gradient-to-br from-primary to-primary-dark text-white'
                                                : isCompleted
                                                ? 'bg-primary/20 text-primary'
                                                : 'bg-neutral-100 text-neutral-42'
                                        }`}
                                    >
                                        {isCompleted ? '✓' : index + 1}
                                    </div>
                                    <p className="text-[10px] sm:text-xs font-semibold text-neutral-42 truncate flex-1">
                                        {getStepTitle(step, index)}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default memo(StepsList);
