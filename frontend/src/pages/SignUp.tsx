import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../config/supabaseClient.ts';

function SignUp() {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({
        fullName: '',
        email: '',
        password: '',
    });
    const [touched, setTouched] = useState({
        fullName: false,
        email: false,
        password: false,
    });

    // Validation functions
    const validateFullName = (value: string): string => {
        if (!value.trim()) {
            return 'Please enter your full name';
        }
        return '';
    };

    const validateEmail = (value: string): string => {
        if (!value.trim()) {
            return 'Please enter your email';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            return 'Please enter a valid email address';
        }
        return '';
    };

    const validatePassword = (value: string): string => {
        if (!value) {
            return 'Please enter your password';
        }
        if (value.length < 6) {
            return 'Password must be at least 6 characters';
        }
        return '';
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });

        // Clear field error when user starts typing
        if (fieldErrors[name as keyof typeof fieldErrors]) {
            setFieldErrors({
                ...fieldErrors,
                [name]: '',
            });
        }

        // Clear general error when user starts typing
        if (error) setError(null);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setTouched({
            ...touched,
            [name]: true,
        });

        // Validate the field
        let errorMessage = '';
        switch (name) {
            case 'fullName':
                errorMessage = validateFullName(value);
                break;
            case 'email':
                errorMessage = validateEmail(value);
                break;
            case 'password':
                errorMessage = validatePassword(value);
                break;
        }

        setFieldErrors({
            ...fieldErrors,
            [name]: errorMessage,
        });
    };

    const handleEmailSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Mark all fields as touched
        setTouched({
            fullName: true,
            email: true,
            password: true,
        });

        // Validate all fields
        const fullNameError = validateFullName(formData.fullName);
        const emailError = validateEmail(formData.email);
        const passwordError = validatePassword(formData.password);

        setFieldErrors({
            fullName: fullNameError,
            email: emailError,
            password: passwordError,
        });

        // If any validation errors, stop submission
        if (fullNameError || emailError || passwordError) {
            setLoading(false);
            return;
        }

        try {
            // Pre-check if user already exists by email (via backend admin API)
            try {
                const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                const res = await fetch(`${backendUrl}/api/users/exists?email=${encodeURIComponent(formData.email)}`);
                if (res.ok) {
                    const json = await res.json();
                    if (json.exists) {
                        setError('ACCOUNT_EXISTS');
                        setLoading(false);
                        return;
                    }
                }
            } catch (checkErr) {
                // Fail-open: if check fails, proceed with signup
                console.warn('User existence check failed:', checkErr);
            }

            // Sign up with Supabase
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                    },
                    emailRedirectTo: `${window.location.origin}/login`,
                },
            });

            if (signUpError) {
                throw signUpError;
            }

            if (data.user) {
                // Email verification required - show success message
                // User will be redirected to login after clicking verification link in email
                setSuccess(true);
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An error occurred during sign up. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignUp = async () => {
        setLoading(true);
        setError(null);

        try {
            // If user typed an email, attempt pre-check
            if (formData.email.trim()) {
                try {
                    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                    const res = await fetch(`${backendUrl}/api/users/exists?email=${encodeURIComponent(formData.email.trim())}`);
                    if (res.ok) {
                        const json = await res.json();
                        if (json.exists) {
                            setError('ACCOUNT_EXISTS');
                            setLoading(false);
                            return;
                        }
                    }
                } catch (checkErr) {
                    console.warn('User existence check failed:', checkErr);
                }
            }

            const { error: oauthError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/complete-profile`,
                },
            });

            if (oauthError) {
                throw oauthError;
            }
            // Note: With OAuth, the redirect happens automatically
            // The auth state listener in AuthContext will handle the redirect
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An error occurred with Google sign up. Please try again.');
            }
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
                {/* Glassmorphism Card */}
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
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold text-primary mb-2">
                            👋 Welcome to LeanFeastAI
                        </h1>
                        <p className="text-neutral-75 text-base">
                            Start your personalized nutrition journey today ✨
                        </p>
                    </div>

                    {/* Success Message */}
                    {success && (
                        <div
                            className="mb-6 p-6 rounded-xl animate-fade-in border-2"
                            style={{
                                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                borderColor: '#f59e0b',
                                color: '#92400e',
                            }}
                        >
                            <div className="text-center">
                                <div className="text-4xl mb-3">📧</div>
                                <p className="font-bold text-lg mb-2">Verify Your Email to Continue</p>
                                <p className="text-sm mb-3 leading-relaxed">
                                    We've sent a verification link to <strong>{formData.email}</strong>
                                </p>
                                <div className="bg-white/60 rounded-lg p-3 mb-3">
                                    <p className="text-xs font-semibold mb-1">⚠️ Important:</p>
                                    <p className="text-xs">
                                        You <strong>must verify your email</strong> before you can sign in.
                                        Please check your inbox and click the verification link. After verification, you'll be redirected to sign in.
                                    </p>
                                </div>
                                <p className="text-xs opacity-80">
                                    Didn't receive the email? Check your spam folder or try signing up again.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        error === 'ACCOUNT_EXISTS' ? (
                            <div className="mb-6 p-5 rounded-xl animate-fade-in border-2" style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', borderColor: '#60a5fa', color: '#1e3a8a' }}>
                                <p className="font-semibold mb-2">📧 Account Already Exists</p>
                                <p className="text-sm mb-3">An account with this email is already registered. Please sign in instead.</p>
                                <Link to="/login" className="inline-block px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: '#3b82f6' }}>
                                    Go to Sign In →
                                </Link>
                            </div>
                        ) : (
                            <div className="mb-6 p-4 rounded-xl text-red-600 bg-red-50 border border-red-200 animate-fade-in">
                                <p className="font-medium text-sm">{error}</p>
                            </div>
                        )
                    )}

                    {/* Email/Password Form */}
                    <form onSubmit={handleEmailSignUp} className="space-y-5">
                        {/* Full Name Input */}
                        <div>
                            <label htmlFor="fullName" className="block text-sm font-semibold text-neutral-42 mb-2">
                                Full Name
                            </label>
                            <input
                                type="text"
                                id="fullName"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                disabled={loading || success}
                                className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 ${touched.fullName && fieldErrors.fullName
                                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                    : 'border-neutral-189 focus:ring-accent focus:border-transparent'
                                    }`}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.9)',
                                }}
                                placeholder="Your Full Name"
                            />
                            {touched.fullName && fieldErrors.fullName && (
                                <p className="mt-1 text-sm text-red-600">{fieldErrors.fullName}</p>
                            )}
                        </div>

                        {/* Email Input */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-neutral-42 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                disabled={loading || success}
                                className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 ${touched.email && fieldErrors.email
                                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                    : 'border-neutral-189 focus:ring-accent focus:border-transparent'
                                    }`}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.9)',
                                }}
                                placeholder="you@example.com"
                            />
                            {touched.email && fieldErrors.email && (
                                <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                            )}
                        </div>

                        {/* Password Input */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-neutral-42 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                disabled={loading || success}
                                className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 ${touched.password && fieldErrors.password
                                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                    : 'border-neutral-189 focus:ring-accent focus:border-transparent'
                                    }`}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.9)',
                                }}
                                placeholder="At least 6 characters"
                            />
                            {touched.password && fieldErrors.password && (
                                <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || success}
                            className="w-full py-4 px-6 rounded-xl font-semibold text-lg text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] hover:shadow-lg"
                            style={{
                                background: 'linear-gradient(135deg, #ff7b5c 0%, #ff5a5f 100%)',
                                boxShadow: '0 4px 12px rgba(255, 123, 92, 0.3)',
                            }}
                            onMouseEnter={(e) => {
                                if (!loading && !success) {
                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 123, 92, 0.4)';
                                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!loading && !success) {
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 123, 92, 0.3)';
                                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                }
                            }}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Creating your account...
                                </span>
                            ) : (
                                'Create Account ✨'
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-neutral-189"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-neutral-75" style={{ background: 'rgba(255, 255, 255, 0.85)' }}>
                                or
                            </span>
                        </div>
                    </div>

                    {/* Google Sign Up Button */}
                    <button
                        onClick={handleGoogleSignUp}
                        disabled={loading || success}
                        className="w-full mb-6 py-4 px-6 rounded-xl font-semibold text-base transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] hover:shadow-lg"
                        style={{
                            background: 'white',
                            border: '2px solid #e5e7eb',
                            color: '#374151',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                        }}
                        onMouseEnter={(e) => {
                            if (!loading && !success) {
                                e.currentTarget.style.borderColor = '#d1d5db';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!loading && !success) {
                                e.currentTarget.style.borderColor = '#e5e7eb';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                            }
                        }}
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-neutral-189 border-t-neutral-42 rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                Continue with Google
                            </>
                        )}
                    </button>

                    {/* Trust Message */}
                    <p className="text-center text-sm text-neutral-75 mt-6">
                        Your data stays safe with us 💚
                    </p>

                    {/* Login Link */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-neutral-75">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="font-semibold text-accent hover:text-accent-dark transition-colors duration-200"
                            >
                                Sign in here
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SignUp;