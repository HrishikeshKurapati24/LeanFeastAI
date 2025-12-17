import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Toast from '../Toast';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (currentPassword: string, newPassword: string) => Promise<void>;
}

export default function ChangePasswordModal({ isOpen, onClose, onSave }: ChangePasswordModalProps) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showToast, setShowToast] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('All fields are required');
            return;
        }

        if (newPassword.length < 6) {
            setError('New password must be at least 6 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        if (currentPassword === newPassword) {
            setError('New password must be different from current password');
            return;
        }

        try {
            setLoading(true);
            await onSave(currentPassword, newPassword);
            // Reset form and close modal on success
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setError(null);
            // Show success toast
            setShowToast(true);
            onClose();
        } catch (err) {
            console.error('Failed to change password:', err);
            setError(err instanceof Error ? err.message : 'Failed to change password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setError(null);
            onClose();
        }
    };

    return (
        <>
            {/* Toast Notification */}
            <Toast
                message="Password has been successfully updated."
                type="success"
                isVisible={showToast}
                onClose={() => setShowToast(false)}
                duration={5000}
            />
            
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleClose}
                            className="fixed inset-0 bg-black/50 z-40"
                        />

                    {/* Modal */}
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                handleClose();
                            }
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto my-8"
                        >
                            <div className="p-6">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold text-primary">Change Password</h2>
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        disabled={loading}
                                        className="text-neutral-61 hover:text-neutral-42 transition-colors disabled:opacity-50"
                                        aria-label="Close modal"
                                    >
                                        <span className="text-3xl">&times;</span>
                                    </button>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* Current Password */}
                                    <div>
                                        <label htmlFor="currentPassword" className="block text-sm font-semibold text-neutral-42 mb-2">
                                            Current Password
                                        </label>
                                        <input
                                            type="password"
                                            id="currentPassword"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            disabled={loading}
                                            className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                            placeholder="Enter current password"
                                            required
                                        />
                                    </div>

                                    {/* New Password */}
                                    <div>
                                        <label htmlFor="newPassword" className="block text-sm font-semibold text-neutral-42 mb-2">
                                            New Password
                                        </label>
                                        <input
                                            type="password"
                                            id="newPassword"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            disabled={loading}
                                            className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                            placeholder="Enter new password (min. 6 characters)"
                                            required
                                            minLength={6}
                                        />
                                    </div>

                                    {/* Confirm Password */}
                                    <div>
                                        <label htmlFor="confirmPassword" className="block text-sm font-semibold text-neutral-42 mb-2">
                                            Confirm New Password
                                        </label>
                                        <input
                                            type="password"
                                            id="confirmPassword"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            disabled={loading}
                                            className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                            placeholder="Confirm new password"
                                            required
                                        />
                                    </div>

                                    {/* Error Message */}
                                    {error && (
                                        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl">
                                            {error}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-4 pt-4">
                                        <button
                                            type="button"
                                            onClick={handleClose}
                                            disabled={loading}
                                            className="flex-1 px-6 py-3 border-2 border-neutral-200 hover:border-neutral-300 text-neutral-42 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loading ? 'Changing...' : 'Change Password'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
        </>
    );
}

