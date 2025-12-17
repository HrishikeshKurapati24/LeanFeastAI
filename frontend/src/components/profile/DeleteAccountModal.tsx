import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DeleteAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}

export default function DeleteAccountModal({ isOpen, onClose, onConfirm }: DeleteAccountModalProps) {
    const [confirmText, setConfirmText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const confirmationText = 'DELETE';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (confirmText !== confirmationText) {
            setError(`Please type "${confirmationText}" to confirm`);
            return;
        }

        try {
            setLoading(true);
            await onConfirm();
            // Close modal on success
            setConfirmText('');
            setError(null);
            onClose();
        } catch (err) {
            console.error('Failed to delete account:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete account. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setConfirmText('');
            setError(null);
            onClose();
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
                                    <h2 className="text-2xl font-bold text-red-600">Delete Account</h2>
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

                                {/* Warning Message */}
                                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">⚠️</span>
                                        <div>
                                            <h3 className="font-semibold text-red-700 mb-2">This action cannot be undone</h3>
                                            <p className="text-sm text-red-600">
                                                This will permanently delete your account and all associated data, including:
                                            </p>
                                            <ul className="list-disc list-inside text-sm text-red-600 mt-2 space-y-1">
                                                <li>Your profile information</li>
                                                <li>All saved recipes</li>
                                                <li>Your cooking history</li>
                                                <li>All preferences and settings</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* Confirmation Input */}
                                    <div>
                                        <label htmlFor="confirmText" className="block text-sm font-semibold text-neutral-42 mb-2">
                                            Type <span className="font-mono text-red-600">{confirmationText}</span> to confirm:
                                        </label>
                                        <input
                                            type="text"
                                            id="confirmText"
                                            value={confirmText}
                                            onChange={(e) => setConfirmText(e.target.value)}
                                            disabled={loading}
                                            className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                            placeholder={confirmationText}
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
                                            disabled={loading || confirmText !== confirmationText}
                                            className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loading ? 'Deleting...' : 'Delete Account'}
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