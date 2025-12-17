import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EditPreferencesModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: {
        dietary_preferences?: string[];
        goals?: string[];
        allergies?: string[];
    };
    onSave: (preferences: {
        dietary_preferences: string[];
        goals: string[];
        allergies: string[];
    }) => void;
}

const dietaryOptions = [
    'Vegetarian',
    'Vegan',
    'Gluten-Free',
    'Keto',
    'Paleo',
    'Mediterranean',
    'Low-Carb',
    'Dairy-Free',
];

const fitnessOptions = [
    'Weight Loss',
    'Muscle Gain',
    'Maintenance',
    'Athletic Performance',
    'General Health',
];

const allergyOptions = [
    'Nuts',
    'Shellfish',
    'Eggs',
    'Soy',
    'Fish',
    'Dairy',
    'Wheat',
];

export default function EditPreferencesModal({ isOpen, onClose, profile, onSave }: EditPreferencesModalProps) {
    const [dietaryPreferences, setDietaryPreferences] = useState<string[]>(profile.dietary_preferences || []);
    const [fitnessGoals, setFitnessGoals] = useState<string[]>(profile.goals || []);
    const [allergies, setAllergies] = useState<string[]>(profile.allergies || []);
    const [customAllergies, setCustomAllergies] = useState<string>('');

    // Update state when profile changes or modal opens
    useEffect(() => {
        if (isOpen) {
            setDietaryPreferences(profile.dietary_preferences || []);
            setFitnessGoals(profile.goals || []);

            // Separate predefined allergies from custom ones
            const profileAllergies = profile.allergies || [];
            const predefinedAllergies = profileAllergies.filter(allergy => allergyOptions.includes(allergy));
            const customAllergiesList = profileAllergies.filter(allergy => !allergyOptions.includes(allergy));

            setAllergies(predefinedAllergies);
            // Show custom allergies as comma-separated in the input field
            setCustomAllergies(customAllergiesList.join(', '));
        }
    }, [profile, isOpen]);

    const toggleOption = (
        category: 'dietary' | 'fitness' | 'allergies',
        option: string
    ) => {
        switch (category) {
            case 'dietary':
                setDietaryPreferences((prev) =>
                    prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]
                );
                break;
            case 'fitness':
                setFitnessGoals((prev) =>
                    prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]
                );
                break;
            case 'allergies':
                setAllergies((prev) =>
                    prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]
                );
                break;
        }
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            // Combine allergies with custom allergies (split by comma and trim)
            const customAllergiesArray = customAllergies
                .split(',')
                .map(allergy => allergy.trim())
                .filter(allergy => allergy.length > 0);

            const allAllergies = [
                ...allergies,
                ...customAllergiesArray,
            ];

            const preferencesData = {
                dietary_preferences: dietaryPreferences,
                goals: fitnessGoals,
                allergies: allAllergies,
            };

            // Call onSave callback
            if (typeof onSave === 'function') {
                onSave(preferencesData);
            } else {
                console.error('onSave is not a function:', typeof onSave);
                alert('Error: Unable to save preferences. Please refresh the page.');
                return;
            }

            // Close modal
            onClose();
        } catch (error) {
            console.error('Error in handleSubmit:', error);
            alert('Failed to save preferences. Please try again.');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-40"
                    />

                    {/* Modal Container - closes on backdrop click */}
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 overflow-y-auto"
                        onClick={(e) => {
                            // Close modal only if clicking directly on the backdrop container
                            if (e.target === e.currentTarget) {
                                onClose();
                            }
                        }}
                    >
                        {/* Modal Content - stops propagation to prevent backdrop close */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => {
                                // Stop all clicks from bubbling to container
                                e.stopPropagation();
                            }}
                            className="bg-white rounded-lg sm:rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto my-4"
                        >
                            <div
                                className="p-3 sm:p-4 md:p-5"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between mb-3 sm:mb-4">
                                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-primary">Update Preferences & Goals</h2>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="text-neutral-61 hover:text-neutral-42 transition-colors"
                                        aria-label="Close modal"
                                    >
                                        <span className="text-2xl sm:text-3xl">&times;</span>
                                    </button>
                                </div>

                                {/* Form */}
                                <form
                                    onSubmit={handleSubmit}
                                    className="space-y-4 sm:space-y-5 md:space-y-6"
                                    noValidate
                                >
                                    {/* Dietary Preferences */}
                                    <div>
                                        <label className="block text-sm sm:text-base font-semibold text-neutral-42 mb-2 sm:mb-3">
                                            🥗 Dietary Preferences
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {dietaryOptions.map((option) => (
                                                <button
                                                    key={option}
                                                    type="button"
                                                    onClick={() => toggleOption('dietary', option)}
                                                    className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${dietaryPreferences.includes(option)
                                                        ? 'text-white'
                                                        : 'text-neutral-61 bg-neutral-245 border border-neutral-189'
                                                        }`}
                                                    style={
                                                        dietaryPreferences.includes(option)
                                                            ? {
                                                                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                                                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
                                                            }
                                                            : {}
                                                    }
                                                >
                                                    {option}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Fitness Goals */}
                                    <div>
                                        <label className="block text-sm sm:text-base font-semibold text-neutral-42 mb-2 sm:mb-3">
                                            💪 Fitness Goals
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {fitnessOptions.map((option) => (
                                                <button
                                                    key={option}
                                                    type="button"
                                                    onClick={() => toggleOption('fitness', option)}
                                                    className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${fitnessGoals.includes(option)
                                                        ? 'text-white'
                                                        : 'text-neutral-61 bg-neutral-245 border border-neutral-189'
                                                        }`}
                                                    style={
                                                        fitnessGoals.includes(option)
                                                            ? {
                                                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                                                            }
                                                            : {}
                                                    }
                                                >
                                                    {option}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Allergies */}
                                    <div>
                                        <label className="block text-sm sm:text-base font-semibold text-neutral-42 mb-2 sm:mb-3">
                                            ⚠️ Allergies & Intolerances
                                        </label>
                                        <div className="flex flex-wrap gap-2 mb-2 sm:mb-3">
                                            {allergyOptions.map((option) => (
                                                <button
                                                    key={option}
                                                    type="button"
                                                    onClick={() => toggleOption('allergies', option)}
                                                    className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${allergies.includes(option)
                                                        ? 'text-white'
                                                        : 'text-neutral-61 bg-neutral-245 border border-neutral-189'
                                                        }`}
                                                    style={
                                                        allergies.includes(option)
                                                            ? {
                                                                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                                                            }
                                                            : {}
                                                    }
                                                >
                                                    {option}
                                                </button>
                                            ))}
                                        </div>
                                        <input
                                            type="text"
                                            value={customAllergies}
                                            onChange={(e) => setCustomAllergies(e.target.value)}
                                            placeholder="Add custom allergies (comma separated)"
                                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border-2 border-neutral-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm"
                                        />
                                        <p className="text-xs text-neutral-61 mt-1">
                                            Type custom allergies separated by commas
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex justify-end gap-2 sm:gap-3 pt-2 sm:pt-3">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-3 sm:px-4 py-2 border-2 border-neutral-200 hover:border-neutral-300 text-neutral-42 font-semibold rounded-lg transition-colors text-xs sm:text-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-3 sm:px-4 py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                                        >
                                            Save Preferences
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}