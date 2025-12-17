import React from 'react';

interface QuickGenerateFormProps {
    description: string;
    onDescriptionChange: (value: string) => void;
    onSubmit: () => void;
    loading: boolean;
    error: string | null;
}

export default function QuickGenerateForm({
    description,
    onDescriptionChange,
    onSubmit,
    loading,
    error,
}: QuickGenerateFormProps) {
    return (
        <div className="space-y-3 sm:space-y-4 md:space-y-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-base sm:text-lg">
                    ⚡
                </div>
                <h2 className="text-sm sm:text-md md:text-lg font-bold text-primary">
                    Quick Generate
                </h2>
            </div>

            {error && (
                <div className="mb-3 sm:mb-4 md:mb-6 p-3 sm:p-4 rounded-xl text-red-600 bg-red-50 border border-red-200">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                        <p className="font-medium text-xs sm:text-sm">{error}</p>
                        <button
                            onClick={onSubmit}
                            disabled={loading}
                            className="w-full sm:w-auto ml-0 sm:ml-4 px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                        >
                            {loading ? 'Retrying...' : 'Retry'}
                        </button>
                    </div>
                </div>
            )}

            <div>
                <label htmlFor="quickDescription" className="block text-xs sm:text-sm font-semibold text-neutral-42 mb-1.5 sm:mb-2">
                    What would you like me to cook? <span className="text-red-500">*</span>
                </label>
                <textarea
                    id="quickDescription"
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    rows={4}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 border-neutral-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white/50 resize-none text-sm sm:text-base"
                    placeholder="e.g., A spicy chicken curry with vegetables, served with rice. Make it healthy and ready in 30 minutes."
                />
                <p className="mt-1.5 sm:mt-2 text-xs text-neutral-500">
                    Describe your meal in detail (at least 10 characters). I'll use smart defaults for the rest!
                </p>
            </div>

            {loading && (
                <div className="mb-3 sm:mb-4 md:mb-6 p-3 sm:p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <p className="text-primary font-semibold text-center animate-pulse text-xs sm:text-sm">
                        👨‍🍳 Chef thinking...
                    </p>
                </div>
            )}

            <div className="flex justify-end pt-2 sm:pt-3 md:pt-4">
                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={loading || !description || description.trim().length < 10}
                    className="bg-primary hover:bg-primary-dark text-white font-semibold py-2 sm:py-2.5 md:py-3 px-4 sm:px-6 md:px-8 rounded-lg sm:rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-xs sm:text-sm md:text-base"
                >
                    {loading ? 'Generating Recipe...' : 'Generate Recipe 🪄'}
                </button>
            </div>
        </div>
    );
}

