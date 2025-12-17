import React from 'react';
import type { FormData, FieldErrors } from './types';

interface Step3AdditionalPreferencesProps {
    formData: FormData;
    fieldErrors: FieldErrors;
    onFieldChange: (fieldName: keyof FormData, value: string) => void;
    onFieldBlur: (fieldName: keyof FormData) => void;
    onPrevious: () => void;
    onNext: () => void;
}

export default function Step3AdditionalPreferences({
    formData,
    fieldErrors,
    onFieldChange,
    onFieldBlur,
    onPrevious,
    onNext,
}: Step3AdditionalPreferencesProps) {
    return (
        <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs sm:text-sm md:text-base">
                    3
                </div>
                <h2 className="text-sm sm:text-lg md:text-xl font-bold text-primary">
                    Additional Preferences
                </h2>
            </div>

            {/* Time Constraints */}
            <div>
                <label htmlFor="timeConstraints" className="block text-xs font-semibold text-neutral-42 mb-1">
                    Time Constraints ⏱️ <span className="text-neutral-400 text-xs">(Optional)</span>
                </label>
                <input
                    type="text"
                    id="timeConstraints"
                    value={formData.timeConstraints}
                    onChange={(e) => onFieldChange('timeConstraints', e.target.value)}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border-2 border-neutral-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white/50 text-xs sm:text-sm"
                    placeholder="e.g., 30 minutes, 1 hour"
                />
            </div>

            {/* Calorie Range */}
            <div>
                <label htmlFor="calorieRange" className="block text-xs font-semibold text-neutral-42 mb-1">
                    Calorie Range 🔥 <span className="text-neutral-400 text-xs">(Optional)</span>
                </label>
                <input
                    type="text"
                    id="calorieRange"
                    value={formData.calorieRange}
                    onChange={(e) => onFieldChange('calorieRange', e.target.value)}
                    onBlur={() => onFieldBlur('calorieRange')}
                    className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border-2 transition-colors text-xs sm:text-sm ${fieldErrors.calorieRange
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-neutral-200 focus:border-primary'
                        } focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white/50`}
                    placeholder="e.g., 200-500"
                />
                {fieldErrors.calorieRange && (
                    <p className="mt-0.5 text-xs text-red-600">{fieldErrors.calorieRange}</p>
                )}
                <p className="mt-0.5 text-xs text-neutral-500">Format: min-max (e.g., 200-500)</p>
            </div>

            {/* Target Protein Per Serving */}
            <div>
                <label htmlFor="proteinTargetPerServing" className="block text-xs font-semibold text-neutral-42 mb-1">
                    Target Protein per Serving 💪 <span className="text-neutral-400 text-xs">(Optional)</span>
                </label>
                <input
                    type="text"
                    id="proteinTargetPerServing"
                    value={formData.proteinTargetPerServing}
                    onChange={(e) => onFieldChange('proteinTargetPerServing', e.target.value)}
                    onBlur={() => onFieldBlur('proteinTargetPerServing')}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border-2 border-neutral-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white/50 text-xs sm:text-sm"
                    placeholder="e.g., 30 (grams of protein per serving)"
                />
                <p className="mt-0.5 text-xs text-neutral-500">
                    Optional hint for how protein-forward you want this meal to be.
                </p>
            </div>

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
                    className="bg-primary hover:bg-primary-dark text-white font-semibold py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-1.5 text-xs sm:text-sm"
                >
                    Next →
                </button>
            </div>
        </div>
    );
}

