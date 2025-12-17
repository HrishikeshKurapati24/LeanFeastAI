import { useState } from 'react';
import EditPreferencesModal from './EditPreferencesModal';

interface PreferencesGoalsProps {
    profile: {
        dietary_preferences?: string[];
        goals?: string[];
        allergies?: string[];
    };
    onPreferencesUpdate: (preferences: {
        dietary_preferences: string[];
        goals: string[];
        allergies: string[];
    }) => void;
}

export default function PreferencesGoals({ profile, onPreferencesUpdate }: PreferencesGoalsProps) {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const hasPreferences =
        (profile.dietary_preferences && profile.dietary_preferences.length > 0) ||
        (profile.goals && profile.goals.length > 0) ||
        (profile.allergies && profile.allergies.length > 0);

    return (
        <>
            <div
                className="rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 shadow-md mb-3 sm:mb-4"
                style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                }}
            >
                <div className="flex flex-row items-center justify-between gap-2 mb-2 sm:mb-3">
                    <h2 className="text-base sm:text-lg md:text-xl font-bold text-primary">Preferences & Goals</h2>
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="px-2 sm:px-3 py-0.5 sm:py-1 bg-primary/10 hover:bg-primary/20 text-primary font-semibold rounded-lg transition-colors text-[10px] sm:text-xs"
                    >
                        Update Preferences
                    </button>
                </div>

                {!hasPreferences ? (
                    <div className="text-center py-3 sm:py-4">
                        <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">🥗</div>
                        <p className="text-xs sm:text-sm text-neutral-61 mb-2 sm:mb-3">
                            No preferences set yet. Update your preferences to get personalized recipe recommendations!
                        </p>
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md text-xs sm:text-sm"
                        >
                            Set Preferences
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2 sm:space-y-3">
                        {/* Dietary Preferences */}
                        {profile.dietary_preferences && profile.dietary_preferences.length > 0 && (
                            <div>
                                <h3 className="text-sm sm:text-base font-semibold text-neutral-42 mb-1.5 sm:mb-2">Dietary Preferences</h3>
                                <div className="flex flex-wrap gap-1 sm:gap-1.5">
                                    {profile.dietary_preferences.map((pref) => (
                                        <span
                                            key={pref}
                                            className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold"
                                        >
                                            {pref}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Health Goals */}
                        {profile.goals && profile.goals.length > 0 && (
                            <div>
                                <h3 className="text-sm sm:text-base font-semibold text-neutral-42 mb-1.5 sm:mb-2">Health Goals</h3>
                                <div className="flex flex-wrap gap-1 sm:gap-1.5">
                                    {profile.goals.map((goal) => (
                                        <span
                                            key={goal}
                                            className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold"
                                        >
                                            {goal}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Allergies */}
                        {profile.allergies && profile.allergies.length > 0 && (
                            <div>
                                <h3 className="text-sm sm:text-base font-semibold text-neutral-42 mb-1.5 sm:mb-2">Allergies & Intolerances</h3>
                                <div className="flex flex-wrap gap-1 sm:gap-1.5">
                                    {profile.allergies.map((allergy) => (
                                        <span
                                            key={allergy}
                                            className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold"
                                        >
                                            {allergy}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Edit Preferences Modal */}
            <EditPreferencesModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                profile={profile}
                onSave={(preferences) => {
                    if (typeof onPreferencesUpdate === 'function') {
                        try {
                            onPreferencesUpdate(preferences);
                            setIsEditModalOpen(false);
                        } catch (error) {
                            console.error('Error calling onPreferencesUpdate:', error);
                            alert('Failed to save preferences. Please try again.');
                        }
                    } else {
                        alert('Error: Unable to save preferences. Please refresh the page.');
                    }
                }}
            />
        </>
    );
}