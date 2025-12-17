import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';
import { checkAdminStatus } from '../../utils/adminAuth';
import { useAppDispatch } from '../../store/hooks';
import {
    fetchAllUsers,
    fetchUserAnalytics,
    fetchAllRecipes,
    fetchRecipeAnalytics,
    fetchAllCommunity,
    fetchCommunityAnalytics,
} from '../../store/thunks/adminThunks';
import { clearAllAdminData } from '../../store/actions/adminActions';
import { setSessionMode } from '../../utils/sessionMode';

function AdminLogin() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState({
        email: '',
        password: '',
    });
    const [touched, setTouched] = useState({
        email: false,
        password: false,
    });

    // Check if already logged in and is admin
    useEffect(() => {
        const checkExistingSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const adminStatus = await checkAdminStatus();
                    if (adminStatus.isAdmin) {
                        navigate('/admin/users');
                    }
                }
            } catch (error) {
                // Ignore errors, user needs to login
            }
        };
        checkExistingSession();
    }, [navigate]);

    // Validation functions
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
        return '';
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError(null);

        // Validate on change if field has been touched
        if (touched[name as keyof typeof touched]) {
            if (name === 'email') {
                setFieldErrors((prev) => ({
                    ...prev,
                    email: validateEmail(value),
                }));
            } else if (name === 'password') {
                setFieldErrors((prev) => ({
                    ...prev,
                    password: validatePassword(value),
                }));
            }
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setTouched((prev) => ({ ...prev, [name]: true }));

        if (name === 'email') {
            setFieldErrors((prev) => ({
                ...prev,
                email: validateEmail(value),
            }));
        } else if (name === 'password') {
            setFieldErrors((prev) => ({
                ...prev,
                password: validatePassword(value),
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validate all fields
        const emailError = validateEmail(formData.email);
        const passwordError = validatePassword(formData.password);

        setFieldErrors({
            email: emailError,
            password: passwordError,
        });

        setTouched({
            email: true,
            password: true,
        });

        if (emailError || passwordError) {
            return;
        }

        setLoading(true);

        try {
            // Sign in with Supabase
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (signInError) {
                throw signInError;
            }

            if (!data.user) {
                throw new Error('Login failed. Please try again.');
            }

            // Check if user is admin
            const adminStatus = await checkAdminStatus();

            if (!adminStatus.isAdmin) {
                // Clear any existing admin data before signing out
                dispatch(clearAllAdminData());
                // Sign out if not admin
                await supabase.auth.signOut();
                setError('Access denied. This account does not have admin privileges.');
                setLoading(false);
                return;
            }

            setSessionMode('admin');

            // Trigger parallel data fetching in the background (do not block navigation)
            Promise.all([
                dispatch(fetchAllUsers()),
                dispatch(fetchUserAnalytics({})),
                dispatch(fetchAllRecipes()),
                dispatch(fetchRecipeAnalytics({})),
                dispatch(fetchAllCommunity()),
                dispatch(fetchCommunityAnalytics({})),
            ]).catch((err) => console.error('Admin prefetch error:', err));

            // Redirect to admin dashboard immediately
            navigate('/admin/users');
        } catch (err: any) {
            console.error('Admin login error:', err);
            setError(
                err.message ||
                'Invalid email or password. Please check your credentials and try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center px-3 py-4 sm:px-4 sm:py-6 bg-gradient-to-br from-emerald-50 via-emerald-100 to-white"
        >
            <div
                className="w-full max-w-sm sm:max-w-md rounded-xl sm:rounded-2xl p-5 sm:p-7 md:p-8 bg-white/95 backdrop-blur-xl backdrop-saturate-150 border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]"
            >
                {/* Header */}
                <div className="text-center mb-6 sm:mb-8">
                    <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🔐</div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-1.5 sm:mb-2">
                        Admin Login
                    </h1>
                    <p className="text-neutral-61 text-xs sm:text-sm">
                        Sign in to access the admin panel
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div
                        className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg text-xs sm:text-sm bg-red-50 border border-red-200 text-red-600"
                    >
                        {error}
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                    {/* Email Field */}
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-medium text-neutral-42 mb-2"
                        >
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="admin@example.com"
                            className={`w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border text-sm sm:text-base transition-all ${fieldErrors.email && touched.email
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                                : 'border-neutral-200 focus:border-primary focus:ring-primary'
                                } focus:outline-none focus:ring-2`}
                            disabled={loading}
                        />
                        {fieldErrors.email && touched.email && (
                            <p className="mt-1 text-xs sm:text-sm text-red-600">
                                {fieldErrors.email}
                            </p>
                        )}
                    </div>

                    {/* Password Field */}
                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-neutral-42 mb-2"
                        >
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder="Enter your password"
                            className={`w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border text-sm sm:text-base transition-all ${fieldErrors.password && touched.password
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                                : 'border-neutral-200 focus:border-primary focus:ring-primary'
                                } focus:outline-none focus:ring-2`}
                            disabled={loading}
                        />
                        {fieldErrors.password && touched.password && (
                            <p className="mt-1 text-xs sm:text-sm text-red-600">
                                {fieldErrors.password}
                            </p>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 sm:py-3 rounded-xl text-sm sm:text-base text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-[0_4px_16px_rgba(34,197,94,0.3)]"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="animate-spin">⏳</span>
                                Signing in...
                            </span>
                        ) : (
                            'Sign In to Admin Panel'
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-5 sm:mt-6 text-center">
                    <p className="text-xs sm:text-sm text-neutral-61">
                        Not an admin?{' '}
                        <a
                            href="/login"
                            className="text-primary font-medium hover:underline"
                        >
                            Go to regular login
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default AdminLogin;