import React from 'react';
import type { FormData } from './types';

interface Step4PreviewConfirmProps {
    formData: FormData;
    loading: boolean;
    onPrevious: () => void;
    onSubmit: () => void;
}

export default function Step4PreviewConfirm({
    formData,
    loading,
    onPrevious,
    onSubmit,
}: Step4PreviewConfirmProps) {
    return (
        <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs sm:text-sm md:text-base">
                    4
                </div>
                <h2 className="text-sm sm:text-lg md:text-xl font-bold text-primary">
                    Preview & Confirm
                </h2>
            </div>

            <div className="space-y-2 sm:space-y-3 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-neutral-50 border-2 border-neutral-200">
                <div className="flex items-start gap-2">
                    <span className="text-lg sm:text-xl">✅</span>
                    <div>
                        <p className="text-xs font-semibold text-neutral-42 mb-0.5">You're creating</p>
                        <p className="text-sm sm:text-base font-bold text-primary">{formData.mealName}</p>
                    </div>
                </div>

                <div className="flex items-start gap-2">
                    <span className="text-lg sm:text-xl">🍽️</span>
                    <div>
                        <p className="text-xs font-semibold text-neutral-42 mb-0.5">Meal Type</p>
                        <p className="text-sm sm:text-base text-neutral-61">{formData.mealType} for {formData.servingSize} {parseInt(formData.servingSize) === 1 ? 'person' : 'people'}</p>
                    </div>
                </div>

                {formData.flavorControls && formData.flavorControls.flavor && formData.flavorControls.flavor.trim() !== '' && (
                    <div className="flex items-start gap-2">
                        <span className="text-lg sm:text-xl">🌶️</span>
                        <div>
                            <p className="text-xs font-semibold text-neutral-42 mb-0.5">Flavor Profile</p>
                            <p className="text-sm sm:text-base text-neutral-61">
                                {formData.flavorControls.flavor}
                            </p>
                        </div>
                    </div>
                )}

                {formData.timeConstraints && (
                    <div className="flex items-start gap-2">
                        <span className="text-lg sm:text-xl">⏱️</span>
                        <div>
                            <p className="text-xs font-semibold text-neutral-42 mb-0.5">Time Constraints</p>
                            <p className="text-sm sm:text-base text-neutral-61">{formData.timeConstraints}</p>
                        </div>
                    </div>
                )}

                {formData.calorieRange && (
                    <div className="flex items-start gap-2">
                        <span className="text-lg sm:text-xl">🔥</span>
                        <div>
                            <p className="text-xs font-semibold text-neutral-42 mb-0.5">Calorie Range</p>
                            <p className="text-sm sm:text-base text-neutral-61">{formData.calorieRange}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-between pt-2">
                <button
                    type="button"
                    onClick={onPrevious}
                    className="text-neutral-61 hover:text-neutral-42 font-semibold py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg transition-colors border-2 border-neutral-200 hover:border-neutral-300 text-xs sm:text-sm"
                >
                    ← Edit Details
                </button>
                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={loading}
                    className="bg-primary hover:bg-primary-dark text-white font-semibold py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs sm:text-sm"
                >
                    {loading ? 'Creating Recipe...' : 'Confirm & Create 🎉'}
                </button>
            </div>
        </div>
    );
}

