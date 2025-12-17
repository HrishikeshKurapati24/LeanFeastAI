import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient.ts';
import { useAuth } from '../contexts/AuthContext';
import { setSessionMode } from '../utils/sessionMode';

function Login() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSuspension, setCheckingSuspension] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    password: '',
  });
  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });

  // Redirect if already logged in (but not if we're checking suspension)
  useEffect(() => {
    if (!authLoading && user && !checkingSuspension) {
      // Always redirect to home if already logged in - profile completion is optional
      navigate('/feast-studio');
    }
  }, [user, authLoading, navigate, checkingSuspension]);


  // Don't clear error when user changes (e.g., after sign out) if we're showing a suspension error
  useEffect(() => {
    // Never clear suspension errors automatically
    if (error && (error.includes('suspended') || error.includes('Suspended'))) {
      return; // Keep suspension errors
    }

    // Only clear error if user becomes null AND we're not checking suspension
    // This prevents clearing errors when user signs out during suspension check
    if (!user && !checkingSuspension && error) {
      // Only clear non-suspension errors when user logs out
      setError(null);
    }
  }, [user, checkingSuspension, error]);

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

    // Clear general error when user starts typing (but not suspension errors)
    if (error && !error.includes('suspended') && !error.includes('Suspended')) {
      setError(null);
    }
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

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Don't clear error if it's a suspension error - keep it visible
    if (!error || (!error.includes('suspended') && !error.includes('Suspended'))) {
      setError(null);
    }

    // Mark all fields as touched
    setTouched({
      email: true,
      password: true,
    });

    // Validate all fields
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);

    setFieldErrors({
      email: emailError,
      password: passwordError,
    });

    // If any validation errors, stop submission
    if (emailError || passwordError) {
      setLoading(false);
      return;
    }

    try {
      // Provider-aware pre-check: if this email is Google-only, advise to use Google
      try {
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${backendUrl}/api/users/providers?email=${encodeURIComponent(formData.email.trim())}`);
        if (res.ok) {
          const json = await res.json();
          if (json.exists && Array.isArray(json.providers)) {
            const providers: string[] = json.providers;
            const hasGoogle = providers.includes('google');
            const hasEmail = providers.includes('email');
            if (hasGoogle && !hasEmail) {
              setError('This email is registered with Google. Please sign in using Google.');
              setLoading(false);
              return;
            }
          }
        }
      } catch (checkErr) {
        console.warn('Provider check failed:', checkErr);
      }

      // Set checking flag before login to prevent premature redirects
      setCheckingSuspension(true);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        setCheckingSuspension(false);
        throw signInError;
      }

      if (data.user) {
        setSessionMode('user');
        // Check if profile is complete and redirect accordingly
        try {
          const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const session = await supabase.auth.getSession();

          if (!session.data.session?.access_token) {
            setCheckingSuspension(false);
            setLoading(false);
            setError('Session error. Please try again.');
            return;
          }

          const profileRes = await fetch(`${backendUrl}/api/users/${data.user.id}`, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.data.session.access_token}`,
            },
          });

          // Check if user is suspended (403 Forbidden)
          if (profileRes.status === 403) {
            let suspensionReason = 'Your account has been suspended.';
            try {
              const errorData = await profileRes.json();
              if (errorData.detail) {
                suspensionReason = errorData.detail;
              }
            } catch (jsonError) {
              // If JSON parsing fails, use default message
              console.warn('Failed to parse error response:', jsonError);
            }

            // Sign out the user immediately
            try {
              await supabase.auth.signOut();
            } catch (signOutError) {
              console.warn('Error signing out:', signOutError);
            }

            setCheckingSuspension(false);
            setLoading(false);

            // Show alert with suspension message
            alert(`Reason for suspension: ${suspensionReason}\n\nYou have been notified via email regarding this suspension. Please contact support if you believe this is an error.`);

            // Don't navigate - stay on login page
            return;
          }

          setCheckingSuspension(false);

          if (profileRes.ok) {
            // Profile exists - redirect to make-my-feast (even if incomplete)
            // User can complete profile later if they want
            navigate('/feast-studio');
          } else if (profileRes.status === 404) {
            // Profile doesn't exist (first sign in) - create minimal profile first
            try {
              const createRes = await fetch(`${backendUrl}/api/users/register`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.data.session?.access_token || ''}`,
                },
                body: JSON.stringify({
                  user_id: data.user.id,
                  email: data.user.email || '',
                  full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || '',
                  dietary_preferences: [],
                  goals: [],
                  allergies: [],
                }),
              });

              // Even if profile creation fails, redirect to complete-profile
              // The user can complete it there
              if (!createRes.ok) {
                console.warn('Failed to create minimal profile, redirecting to complete-profile anyway');
              }
            } catch (createError) {
              console.warn('Error creating minimal profile:', createError);
            }

            // Redirect to complete-profile for first-time users
            navigate('/complete-profile');
          } else {
            // Other error - redirect to make-my-feast as safe default
            navigate('/feast-studio');
          }
        } catch (profileError) {
          // If profile check fails, redirect to make-my-feast as safe default
          setCheckingSuspension(false);
          navigate('/feast-studio');
        }
      }
    } catch (err: unknown) {
      setCheckingSuspension(false);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // If user typed an email, check if account is email-only and advise accordingly
      if (formData.email.trim()) {
        try {
          const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const res = await fetch(`${backendUrl}/api/users/providers?email=${encodeURIComponent(formData.email.trim())}`);
          if (res.ok) {
            const json = await res.json();
            if (json.exists && Array.isArray(json.providers)) {
              const providers: string[] = json.providers;
              const hasGoogle = providers.includes('google');
              const hasEmail = providers.includes('email');
              if (hasEmail && !hasGoogle) {
                setError('This email is registered with email/password. Please sign in using your password.');
                setLoading(false);
                return;
              }
            }
          }
        } catch (checkErr) {
          console.warn('Provider check failed:', checkErr);
        }
      }

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth-callback`,
        },
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An error occurred with Google login. Please try again.');
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
              👋 Welcome Back!
            </h1>
            <p className="text-neutral-75 text-base">
              Sign in to continue your nutrition journey ✨
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="mb-6 p-4 rounded-xl text-red-600 bg-red-50 border-2 border-red-300 animate-fade-in"
              role="alert"
              style={{ display: 'block' }}
            >
              <div className="flex items-start gap-2">
                <span className="text-xl">⚠️</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm mb-1">
                    {error.includes('suspended') || error.includes('Suspended')
                      ? 'Account Suspended'
                      : 'Error'}
                  </p>
                  <p className="font-medium text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Debug: Show error state (remove in production) */}
          {process.env.NODE_ENV === 'development' && error && (
            <div className="mb-2 text-xs text-gray-500">
              Debug: Error state = {error ? 'SET' : 'NULL'}
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-5">
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
                disabled={loading}
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
                disabled={loading}
                className={`w-full px-4 py-3 rounded-xl border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 ${touched.password && fieldErrors.password
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-neutral-189 focus:ring-accent focus:border-transparent'
                  }`}
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                }}
                placeholder="Enter your password"
              />
              {touched.password && fieldErrors.password && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
              )}
            </div>

            {/* Submit Button */}
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
                  Signing in...
                </span>
              ) : (
                'Sign In ✨'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-189"></div>
            </div>
            <div className="relative flex justify-center">
              <span
                className="px-6 py-2 text-sm font-medium text-neutral-75 rounded-full"
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(229, 231, 235, 0.5)',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                }}
              >
                or
              </span>
            </div>
          </div>


          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full mb-6 py-4 px-6 rounded-xl font-semibold text-base transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] hover:shadow-lg"
            style={{
              background: 'white',
              border: '2px solid #e5e7eb',
              color: '#374151',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
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

          {/* Password Reset Link */}
          <div className="mt-4 text-center">
            <Link
              to="/forgot-password"
              className="text-sm font-semibold text-accent hover:text-accent-dark transition-colors duration-200"
            >
              Forgot password?
            </Link>
          </div>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-75">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="font-semibold text-accent hover:text-accent-dark transition-colors duration-200"
              >
                Sign up here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;