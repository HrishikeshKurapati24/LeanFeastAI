import React from 'react';
import type { FormData, FieldErrors } from './types';
import { mealTypeOptions, flavorControls, getFieldLabel } from './constants';

interface Step2PersonalizationProps {
    formData: FormData;
    fieldErrors: FieldErrors;
    touched: Record<string, boolean>;
    onFieldChange: (fieldName: keyof FormData, value: string | Record<string, string>) => void;
    onFieldBlur: (fieldName: keyof FormData) => void;
    onFlavorControlChange: (fieldName: string, value: string) => void;
    onPrevious: () => void;
    onNext: () => void;
    canProceed: boolean;
}

export default function Step2Personalization({
    formData,
    fieldErrors,
    touched,
    onFieldChange,
    onFieldBlur,
    onFlavorControlChange,
    onPrevious,
    onNext,
    canProceed,
}: Step2PersonalizationProps) {
    const currentFlavorFields = formData.mealType && flavorControls[formData.mealType as keyof typeof flavorControls]
        ? flavorControls[formData.mealType as keyof typeof flavorControls].fields
        : null;

    return (
        <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs sm:text-sm md:text-base">
                    2
                </div>
                <h2 className="text-sm sm:text-lg md:text-xl font-bold text-primary">
                    Personalization
                </h2>
            </div>

            {/* Meal Type */}
            <div>
                <label htmlFor="mealType" className="block text-xs font-semibold text-neutral-42 mb-1.5 sm:mb-2">
                    What meal is this for? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {mealTypeOptions.map((option) => (
                        <button
                            key={option}
                            type="button"
                            onClick={() => onFieldChange('mealType', option)}
                            onBlur={() => onFieldBlur('mealType')}
                            className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border-2 transition-all text-xs sm:text-sm ${formData.mealType === option
                                ? 'border-primary bg-primary/10 text-primary font-semibold'
                                : 'border-neutral-200 bg-white/50 text-neutral-700 hover:border-primary/50'
                                }`}
                        >
                            {option}
                        </button>
                    ))}
                </div>
                {fieldErrors.mealType && touched.mealType && (
                    <p className="mt-0.5 text-xs text-red-600">{fieldErrors.mealType}</p>
                )}
            </div>

            {/* Dynamic Flavor Controls */}
            {currentFlavorFields && (
                <div className="space-y-2 sm:space-y-3">
                    {Object.entries(currentFlavorFields).map(([fieldName, options]: [string, string[]]) => {
                        const isOptional = fieldName === 'flavor';
                        return (
                            <div key={fieldName}>
                                <label className="block text-xs font-semibold text-neutral-42 mb-1">
                                    {getFieldLabel(fieldName)}
                                    {!isOptional && <span className="text-red-500">*</span>}
                                    {isOptional && <span className="text-neutral-400 text-xs ml-1">(Optional)</span>}
                                </label>
                                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                    {options.map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => onFlavorControlChange(fieldName, option)}
                                            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border-2 transition-all text-xs sm:text-sm ${formData.flavorControls[fieldName] === option
                                                ? 'border-primary bg-primary/10 text-primary font-semibold'
                                                : 'border-neutral-200 bg-white/50 text-neutral-700 hover:border-primary/50'
                                                }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="flex justify-between pt-2">
                <button
                    type="button"
                    onClick={onPrevious}
                    className="text-neutral-61 hover:text-neutral-42 font-semibold py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg transition-colors border-2 border-neutral-200 hover:border-neutral-300 text-xs sm:text-sm"
                >
                    ← Previous
                </button>
                <button
                    type="button"
                    onClick={onNext}
                    disabled={!canProceed}
                    className="bg-primary hover:bg-primary-dark text-white font-semibold py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs sm:text-sm"
                >
                    Next →
                </button>
            </div>
        </div>
    );
}

