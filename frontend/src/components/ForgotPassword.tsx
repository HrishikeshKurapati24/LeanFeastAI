import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../config/supabaseClient.js';

function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!email.trim()) {
            setError('Please enter your email address');
            setLoading(false);
            return;
        }

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (resetError) {
                throw resetError;
            }

            setSuccess(true);
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
                            🔐 Reset Password
                        </h1>
                        <p className="text-neutral-75 text-base">
                            Enter your email and we'll send you a reset link
                        </p>
                    </div>

                    {success ? (
                        <div
                            className="mb-6 p-4 rounded-xl text-center animate-fade-in"
                            style={{
                                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                color: 'white',
                            }}
                        >
                            <p className="font-semibold">📧 Check your email!</p>
                            <p className="text-sm mt-1 opacity-90">
                                We've sent you a password reset link. Click it to create a new password.
                            </p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div
                                    className="mb-6 p-4 rounded-xl text-red-600 bg-red-50 border border-red-200 animate-fade-in"
                                >
                                    <p className="font-medium text-sm">{error}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-semibold text-neutral-42 mb-2">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            if (error) setError(null);
                                        }}
                                        disabled={loading}
                                        className="w-full px-4 py-3 rounded-xl border border-neutral-189 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.9)',
                                        }}
                                        placeholder="you@example.com"
                                        required
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
                                            Sending...
                                        </span>
                                    ) : (
                                        'Send Reset Link ✨'
                                    )}
                                </button>
                            </form>
                        </>
                    )}

                    <div className="mt-6 text-center">
                        <Link
                            to="/login"
                            className="text-sm font-semibold text-accent hover:text-accent-dark transition-colors duration-200"
                        >
                            ← Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ForgotPassword;

