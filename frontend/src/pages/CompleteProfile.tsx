import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabaseClient.js';

interface ProfileData {
    dietaryPreferences: string[];
    fitnessGoals: string[];
    allergies: string[];
    customAllergies: string;
}

function CompleteProfile() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [profileData, setProfileData] = useState<ProfileData>({
        dietaryPreferences: [],
        fitnessGoals: [],
        allergies: [],
        customAllergies: '',
    });

    // Redirect if not logged in
    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        }
        // Note: We allow users to access this page even if profile is already completed
        // They might want to update their preferences
    }, [user, authLoading, navigate]);

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

    const toggleOption = (
        category: 'dietaryPreferences' | 'fitnessGoals' | 'allergies',
        option: string
    ) => {
        setProfileData((prev) => {
            const current = prev[category];
            const updated = current.includes(option)
                ? current.filter((item) => item !== option)
                : [...current, option];
            return { ...prev, [category]: updated };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!user) {
            setError('You must be logged in to complete your profile');
            setLoading(false);
            return;
        }

        try {
            // Save profile data to Supabase user metadata
            const { error: updateError } = await supabase.auth.updateUser({
                data: {
                    ...user.user_metadata,
                    dietary_preferences: profileData.dietaryPreferences,
                    fitness_goals: profileData.fitnessGoals,
                    allergies: [
                        ...profileData.allergies,
                        ...(profileData.customAllergies.trim()
                            ? [profileData.customAllergies.trim()]
                            : []),
                    ],
                    profile_completed: true,
                },
            });

            if (updateError) {
                throw updateError;
            }

            // Send user data to FastAPI backend to create/update profile
            const session = await supabase.auth.getSession();
            const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const backendRes = await fetch(`${backendUrl}/api/users/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.data.session?.access_token || ''}`,
                },
                body: JSON.stringify({
                    user_id: user.id,
                    email: user.email,
                    full_name: user.user_metadata?.full_name || '',
                    dietary_preferences: profileData.dietaryPreferences,
                    goals: profileData.fitnessGoals, // Changed from fitness_goals to goals
                    allergies: [
                        ...profileData.allergies,
                        ...(profileData.customAllergies.trim()
                            ? [profileData.customAllergies.trim()]
                            : []),
                    ],
                }),
            });

            if (!backendRes.ok) {
                const errorData = await backendRes.json().catch(() => ({ detail: 'Unknown error' }));
                throw new Error(`Failed to save profile: ${errorData.detail || 'Backend error'}`);
            }

            // Verify profile was created/updated by checking it exists
            const verifyRes = await fetch(`${backendUrl}/api/users/${user.id}`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.data.session?.access_token || ''}`,
                },
            });

            if (!verifyRes.ok) {
                throw new Error('Profile was not created successfully. Please try again.');
            }

            // Redirect to create recipe form
            navigate('/feast-studio');
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An error occurred. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12"
            style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #ffffff 100%)',
            }}
        >
            <div className="w-full max-w-3xl">
                <div
                    className="rounded-3xl p-8 md:p-10 shadow-2xl"
                    style={{
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05)',
                    }}
                >
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold text-primary mb-2">
                            ✨ Complete Your Profile
                        </h1>
                        <p className="text-neutral-75 text-base">
                            Help us personalize your experience 🎯
                        </p>
                        <div className="text-neutral-75 text-sm">Note: Add preferences only if you want every recipe to be adjusted according to your preferences.</div>
                    </div>

                    {error && (
                        <div
                            className="mb-6 p-4 rounded-xl text-red-600 bg-red-50 border border-red-200 animate-fade-in"
                        >
                            <p className="font-medium text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Dietary Preferences */}
                        <div>
                            <label className="block text-lg font-semibold text-neutral-42 mb-4">
                                🥗 Dietary Preferences
                            </label>
                            <div className="flex flex-wrap gap-3">
                                {dietaryOptions.map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => toggleOption('dietaryPreferences', option)}
                                        className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${profileData.dietaryPreferences.includes(option)
                                            ? 'text-white'
                                            : 'text-neutral-61 bg-neutral-245 border border-neutral-189'
                                            }`}
                                        style={
                                            profileData.dietaryPreferences.includes(option)
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
                            <label className="block text-lg font-semibold text-neutral-42 mb-4">
                                💪 Fitness Goals
                            </label>
                            <div className="flex flex-wrap gap-3">
                                {fitnessOptions.map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => toggleOption('fitnessGoals', option)}
                                        className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${profileData.fitnessGoals.includes(option)
                                            ? 'text-white'
                                            : 'text-neutral-61 bg-neutral-245 border border-neutral-189'
                                            }`}
                                        style={
                                            profileData.fitnessGoals.includes(option)
                                                ? {
                                                    background: 'linear-gradient(135deg, #ff7b5c 0%, #ff5a5f 100%)',
                                                    boxShadow: '0 2px 8px rgba(255, 123, 92, 0.3)',
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
                            <label className="block text-lg font-semibold text-neutral-42 mb-4">
                                ⚠️ Allergies & Restrictions
                            </label>
                            <div className="flex flex-wrap gap-3 mb-4">
                                {allergyOptions.map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => toggleOption('allergies', option)}
                                        className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${profileData.allergies.includes(option)
                                            ? 'text-white'
                                            : 'text-neutral-61 bg-neutral-245 border border-neutral-189'
                                            }`}
                                        style={
                                            profileData.allergies.includes(option)
                                                ? {
                                                    background: 'linear-gradient(135deg, #ff9f43 0%, #ff7b5c 100%)',
                                                    boxShadow: '0 2px 8px rgba(255, 159, 67, 0.3)',
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
                                value={profileData.customAllergies}
                                onChange={(e) =>
                                    setProfileData({ ...profileData, customAllergies: e.target.value })
                                }
                                placeholder="Other allergies (comma separated)"
                                className="w-full px-4 py-3 rounded-xl border border-neutral-189 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.9)',
                                }}
                            />
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                className="flex-1 py-4 px-6 rounded-xl font-semibold text-base text-neutral-61 bg-neutral-245 border border-neutral-189 transition-all duration-200 hover:bg-neutral-224"
                            >
                                Skip for Now
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-4 px-6 rounded-xl font-semibold text-lg text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] hover:shadow-lg"
                                style={{
                                    background: 'linear-gradient(135deg, #ff7b5c 0%, #ff5a5f 100%)',
                                    boxShadow: '0 4px 12px rgba(255, 123, 92, 0.3)',
                                }}
                                onMouseEnter={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 123, 92, 0.4)';
                                        e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 123, 92, 0.3)';
                                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                    }
                                }}
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Saving...
                                    </span>
                                ) : (
                                    'Complete Profile ✨'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default CompleteProfile;