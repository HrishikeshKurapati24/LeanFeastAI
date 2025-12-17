import React from 'react';
import type { Step } from './types';

interface ProgressIndicatorProps {
    currentStep: number;
    steps: Step[];
    stepComplete: Record<number, boolean>;
    onStepClick: (step: number) => void;
    onReset: () => void;
}

export default function ProgressIndicator({
    currentStep,
    steps,
    stepComplete,
    onStepClick,
    onReset,
}: ProgressIndicatorProps) {
    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-61">
                        Step {currentStep} of 4
                    </span>
                </div>
                <button
                    type="button"
                    onClick={onReset}
                    className="text-neutral-61 hover:text-red-600 font-semibold py-2 px-4 rounded-xl border-2 border-neutral-200 hover:border-red-300 transition-all duration-200 bg-white/50 hover:bg-red-50/80"
                    title="Reset form to start over"
                >
                    🔄 Reset
                </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-neutral-200 rounded-full h-2 mb-4">
                <div
                    className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${(currentStep / 4) * 100}%` }}
                />
            </div>

            {/* Step Indicators */}
            <div className="flex justify-between items-center">
                {steps.map((step) => {
                    const isCompleted = stepComplete[step.number] || step.number < currentStep;
                    const isCurrent = step.number === currentStep;

                    return (
                        <div
                            key={step.number}
                            className="flex flex-col items-center flex-1"
                        >
                            <button
                                onClick={() => onStepClick(step.number)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${isCompleted
                                    ? 'bg-green-500 text-white'
                                    : isCurrent
                                        ? 'bg-primary text-white ring-4 ring-primary/20'
                                        : 'bg-neutral-200 text-neutral-61'
                                    }`}
                            >
                                {isCompleted ? '✓' : step.number}
                            </button>
                            <span className={`text-xs mt-2 text-center ${isCurrent ? 'font-semibold text-primary' : 'text-neutral-61'}`}>
                                {step.name}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

