import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../config/supabaseClient.js';

function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Check and establish session from URL hash parameters
        const checkSession = async () => {
            setCheckingSession(true);
            setError(null);

            try {
                // Check if we have hash parameters in the URL (Supabase reset link format)
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const type = hashParams.get('type');
                const accessToken = hashParams.get('access_token');

                // If we have hash parameters, Supabase should automatically process them
                // when we call getSession()
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    throw sessionError;
                }

                // Verify we have a valid recovery session
                if (!session) {
                    // Check if we have recovery parameters but no session
                    if (type === 'recovery' && accessToken) {
                        // Try to get the session again - Supabase might need a moment to process
                        await new Promise(resolve => setTimeout(resolve, 500));
                        const { data: { session: retrySession }, error: retryError } = await supabase.auth.getSession();
                        
                        if (retryError || !retrySession) {
                            throw new Error('Invalid or expired reset link. Please request a new password reset.');
                        }
                    } else {
                        throw new Error('Invalid or expired reset link. Please request a new password reset.');
                    }
                } else {
                    // Verify this is a recovery session (password reset)
                    // Recovery sessions typically have specific metadata
                    if (type !== 'recovery' && !window.location.hash.includes('type=recovery')) {
                        // If we have a session but it's not from a recovery link, that's okay
                        // The user might be logged in and changing password
                    }
                }
            } catch (err: unknown) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError('Invalid or expired reset link. Please request a new password reset.');
                }
            } finally {
                setCheckingSession(false);
            }
        };

        checkSession();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        try {
            // Verify we have a valid session before updating password
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !session) {
                throw new Error('Session expired. Please request a new password reset link.');
            }

            // Update the password
            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) {
                throw updateError;
            }

            setSuccess(true);
            
            // Sign out the user after password reset (security best practice)
            await supabase.auth.signOut();
            
            setTimeout(() => {
                navigate('/login');
            }, 2000);
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
            <div className="w-full max-w-md">
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
                            🔑 New Password
                        </h1>
                        <p className="text-neutral-75 text-base">
                            Enter your new password below
                        </p>
                    </div>

                    {checkingSession ? (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-neutral-75 text-sm">Verifying reset link...</p>
                        </div>
                    ) : success ? (
                        <div
                            className="mb-6 p-4 rounded-xl text-center animate-fade-in"
                            style={{
                                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                color: 'white',
                            }}
                        >
                            <p className="font-semibold">✅ Password updated successfully!</p>
                            <p className="text-sm mt-1 opacity-90">Redirecting to login...</p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div
                                    className="mb-6 p-4 rounded-xl text-red-600 bg-red-50 border border-red-200 animate-fade-in"
                                >
                                    <p className="font-medium text-sm">{error}</p>
                                    {error.includes('Invalid or expired') && (
                                        <Link
                                            to="/forgot-password"
                                            className="block mt-2 text-sm font-semibold text-red-700 hover:text-red-800 underline"
                                        >
                                            Request a new reset link
                                        </Link>
                                    )}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label htmlFor="password" className="block text-sm font-semibold text-neutral-42 mb-2">
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        id="password"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            if (error) setError(null);
                                        }}
                                        disabled={loading}
                                        className="w-full px-4 py-3 rounded-xl border border-neutral-189 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.9)',
                                        }}
                                        placeholder="At least 6 characters"
                                        required
                                        minLength={6}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-neutral-42 mb-2">
                                        Confirm Password
                                    </label>
                                    <input
                                        type="password"
                                        id="confirmPassword"
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            if (error) setError(null);
                                        }}
                                        disabled={loading}
                                        className="w-full px-4 py-3 rounded-xl border border-neutral-189 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.9)',
                                        }}
                                        placeholder="Re-enter your password"
                                        required
                                        minLength={6}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 px-6 rounded-xl font-semibold text-lg text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] hover:shadow-lg"
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
                                            Updating...
                                        </span>
                                    ) : (
                                        'Update Password ✨'
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ResetPassword;

