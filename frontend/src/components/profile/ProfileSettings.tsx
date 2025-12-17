import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabaseClient';
import ChangePasswordModal from './ChangePasswordModal';
import DeleteAccountModal from './DeleteAccountModal';
import { changePassword, deleteAccount } from '../../utils/profileApi';

interface ProfileSettingsProps {
    userId: string;
}

export default function ProfileSettings({ userId }: ProfileSettingsProps) {
    const navigate = useNavigate();
    const { signOut, user } = useAuth();
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
    const [isGoogleOnlyUser, setIsGoogleOnlyUser] = useState(false);
    const [checkingProvider, setCheckingProvider] = useState(true);

    // Check if user is Google-only (no email/password provider)
    useEffect(() => {
        const checkUserProvider = async () => {
            try {
                // First try to get from session
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    const identities = session.user.identities || [];
                    const providers = identities.map((id: any) => id.provider || id.identity_data?.provider).filter(Boolean);
                    
                    // Check if user only has Google provider (no email provider)
                    const hasEmailProvider = providers.includes('email') || providers.includes('password');
                    const hasGoogleProvider = providers.includes('google');
                    
                    if (hasGoogleProvider && !hasEmailProvider) {
                        setIsGoogleOnlyUser(true);
                    }
                } else if (user?.email) {
                    // Fallback: Check via API
                    try {
                        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                        const response = await fetch(`${backendUrl}/api/users/providers?email=${encodeURIComponent(user.email)}`);
                        if (response.ok) {
                            const data = await response.json();
                            const providers = data.providers || [];
                            const hasEmailProvider = providers.includes('email');
                            const hasGoogleProvider = providers.includes('google');
                            
                            if (hasGoogleProvider && !hasEmailProvider) {
                                setIsGoogleOnlyUser(true);
                            }
                        }
                    } catch (apiError) {
                        console.error('Failed to check providers via API:', apiError);
                    }
                }
            } catch (error) {
                console.error('Error checking user provider:', error);
            } finally {
                setCheckingProvider(false);
            }
        };

        checkUserProvider();
    }, [user]);

    const handlePasswordChange = async (currentPassword: string, newPassword: string) => {
        try {
            await changePassword(userId, currentPassword, newPassword);
            // Success message will be shown by the modal
        } catch (error) {
            throw error; // Let the modal handle the error display
        }
    };

    const handleDeleteAccount = async () => {
        try {
            await deleteAccount(userId);
            // Sign out user
            await signOut();
            // Redirect to home with success message
            navigate('/', { state: { message: 'Your account has been successfully deleted.' } });
        } catch (error) {
            throw error; // Let the modal handle the error display
        }
    };

    return (
        <>
            <div
                className="rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg mb-4 sm:mb-6 md:mb-8"
                style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                }}
            >
                <h2 className="text-xl sm:text-2xl font-bold text-primary mb-4 sm:mb-5 md:mb-6">Settings</h2>
                
                <div className="space-y-3 sm:space-y-4">
                    {/* Change Password */}
                    <div className={`bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-md ${isGoogleOnlyUser ? 'opacity-60' : ''}`}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                            <div>
                                <h3 className="text-base sm:text-lg font-semibold text-neutral-42 mb-0.5 sm:mb-1">Change Password</h3>
                                <p className="text-xs sm:text-sm text-neutral-61">
                                    {isGoogleOnlyUser 
                                        ? 'Password management is not available for Google accounts'
                                        : 'Update your account password'
                                    }
                                </p>
                            </div>
                            <button
                                onClick={() => setIsChangePasswordOpen(true)}
                                disabled={isGoogleOnlyUser || checkingProvider}
                                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm w-full sm:w-auto"
                            >
                                Change Password
                            </button>
                        </div>
                    </div>

                    {/* Delete Account */}
                    <div className="bg-red-50 border-2 border-red-200 rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-md">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                            <div>
                                <h3 className="text-base sm:text-lg font-semibold text-red-700 mb-0.5 sm:mb-1">Delete Account</h3>
                                <p className="text-xs sm:text-sm text-red-600">Permanently delete your account and all data</p>
                            </div>
                            <button
                                onClick={() => setIsDeleteAccountOpen(true)}
                                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors text-xs sm:text-sm w-full sm:w-auto"
                            >
                                Delete Account
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Change Password Modal */}
            <ChangePasswordModal
                isOpen={isChangePasswordOpen}
                onClose={() => setIsChangePasswordOpen(false)}
                onSave={handlePasswordChange}
            />

            {/* Delete Account Modal */}
            <DeleteAccountModal
                isOpen={isDeleteAccountOpen}
                onClose={() => setIsDeleteAccountOpen(false)}
                onConfirm={handleDeleteAccount}
            />
        </>
    );
}

