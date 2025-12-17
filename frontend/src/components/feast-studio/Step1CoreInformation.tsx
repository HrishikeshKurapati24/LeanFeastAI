import React from 'react';
import type { FormData, FieldErrors } from './types';

interface Step1CoreInformationProps {
    formData: FormData;
    fieldErrors: FieldErrors;
    touched: Record<string, boolean>;
    onFieldChange: (fieldName: keyof FormData, value: string) => void;
    onFieldBlur: (fieldName: keyof FormData) => void;
    isFieldValid: (fieldName: keyof FormData) => boolean;
    onNext: () => void;
    canProceed: boolean;
}

export default function Step1CoreInformation({
    formData,
    fieldErrors,
    touched,
    onFieldChange,
    onFieldBlur,
    isFieldValid,
    onNext,
    canProceed,
}: Step1CoreInformationProps) {
    return (
        <div className="space-y-2 sm:space-y-3 md:space-y-4">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs sm:text-sm md:text-base">
                    1
                </div>
                <h2 className="text-sm sm:text-lg md:text-xl font-bold text-primary">
                    Core Information
                </h2>
            </div>

            {/* Meal Name */}
            <div>
                <label htmlFor="mealName" className="block text-xs font-semibold text-neutral-42 mb-1">
                    What's on your mind? Tell me what you're craving... <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <input
                        type="text"
                        id="mealName"
                        value={formData.mealName}
                        onChange={(e) => onFieldChange('mealName', e.target.value)}
                        onBlur={() => onFieldBlur('mealName')}
                        className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border-2 transition-all pr-7 sm:pr-8 text-xs sm:text-sm ${fieldErrors.mealName && touched.mealName
                            ? 'border-red-500 focus:border-red-500'
                            : isFieldValid('mealName')
                                ? 'border-green-500 focus:border-green-500'
                                : 'border-neutral-200 focus:border-primary'
                            } focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white/50`}
                        placeholder="e.g., Spicy Chicken Curry"
                    />
                    {isFieldValid('mealName') && (
                        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-500 text-base sm:text-lg animate-pulse">
                            ✓
                        </span>
                    )}
                </div>
                {fieldErrors.mealName && touched.mealName && (
                    <p className="mt-0.5 text-xs text-red-600">{fieldErrors.mealName}</p>
                )}
            </div>

            {/* Description */}
            <div>
                <label htmlFor="description" className="block text-xs font-semibold text-neutral-42 mb-1">
                    How would you describe this dish? Any special touches? <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => onFieldChange('description', e.target.value)}
                        onBlur={() => onFieldBlur('description')}
                        rows={2}
                        className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border-2 transition-all pr-7 sm:pr-8 text-xs sm:text-sm ${fieldErrors.description && touched.description
                            ? 'border-red-500 focus:border-red-500'
                            : isFieldValid('description')
                                ? 'border-green-500 focus:border-green-500'
                                : 'border-neutral-200 focus:border-primary'
                            } focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white/50 resize-none`}
                        placeholder="Tell me how you want it... any ingredient preferences, cooking style, etc."
                    />
                    {isFieldValid('description') && (
                        <span className="absolute right-2 top-2 text-green-500 text-sm sm:text-base animate-pulse">
                            ✓
                        </span>
                    )}
                </div>
                {fieldErrors.description && touched.description && (
                    <p className="mt-0.5 text-xs text-red-600">{fieldErrors.description}</p>
                )}
            </div>

            {/* Serving Size */}
            <div>
                <label htmlFor="servingSize" className="block text-xs font-semibold text-neutral-42 mb-1">
                    How many hungry people are we feeding? <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <input
                        type="number"
                        id="servingSize"
                        value={formData.servingSize}
                        onChange={(e) => onFieldChange('servingSize', e.target.value)}
                        onBlur={() => onFieldBlur('servingSize')}
                        min="1"
                        max="50"
                        className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border-2 transition-all pr-7 sm:pr-8 text-xs sm:text-sm ${fieldErrors.servingSize && touched.servingSize
                            ? 'border-red-500 focus:border-red-500'
                            : isFieldValid('servingSize')
                                ? 'border-green-500 focus:border-green-500'
                                : 'border-neutral-200 focus:border-primary'
                            } focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white/50`}
                    />
                    {isFieldValid('servingSize') && (
                        <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-500 text-sm sm:text-base animate-pulse">
                            ✓
                        </span>
                    )}
                </div>
                {fieldErrors.servingSize && touched.servingSize && (
                    <p className="mt-0.5 text-xs text-red-600">{fieldErrors.servingSize}</p>
                )}
            </div>

            <div className="flex justify-end pt-2">
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

