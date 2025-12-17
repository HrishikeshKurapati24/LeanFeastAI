import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ImageUpload from '../ImageUpload';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: {
        full_name?: string;
        bio?: string;
        avatar_url?: string;
    };
    onSave: (data: { full_name?: string; bio?: string; avatar_url?: string }) => void;
}

export default function EditProfileModal({ isOpen, onClose, profile, onSave }: EditProfileModalProps) {
    const { user } = useAuth();
    const [fullName, setFullName] = useState(profile.full_name || '');
    const [bio, setBio] = useState(profile.bio || '');
    const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(profile.avatar_url || null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Update form when profile changes
    useEffect(() => {
        setFullName(profile.full_name || '');
        setBio(profile.bio || '');
        setAvatarUrl(profile.avatar_url || '');
        setImagePreview(profile.avatar_url || null);
    }, [profile]);

    const handleImageSelect = (file: File | null) => {
        setImageFile(file);
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setImagePreview(result); // Use data URL only for preview
                // Don't update avatarUrl here - it will be set after upload
            };
            reader.readAsDataURL(file);
        } else {
            setImagePreview(null);
            // Reset to original avatar URL if no file selected
            setAvatarUrl(profile.avatar_url || '');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        // Validation
        const newErrors: Record<string, string> = {};
        if (!fullName.trim()) {
            newErrors.fullName = 'Full name is required';
        }
        if (fullName.trim().length < 2) {
            newErrors.fullName = 'Full name must be at least 2 characters';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);

        try {
            let finalAvatarUrl = avatarUrl;

            // Upload image to storage if imageFile exists
            if (imageFile && user?.id) {
                try {
                    const session = await supabase.auth.getSession();
                    if (!session.data.session?.access_token) {
                        throw new Error('Not authenticated');
                    }

                    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                    const formData = new FormData();
                    formData.append('image', imageFile);

                    const uploadResponse = await fetch(`${backendUrl}/api/users/${user.id}/profile/avatar`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${session.data.session.access_token}`,
                        },
                        body: formData,
                    });

                    if (!uploadResponse.ok) {
                        const errorData = await uploadResponse.json().catch(() => ({ detail: 'Unknown error' }));
                        throw new Error(errorData.detail || 'Failed to upload avatar');
                    }

                    const uploadResult = await uploadResponse.json();
                    finalAvatarUrl = uploadResult.avatar_url;
                    // Remove trailing ? if present
                    if (finalAvatarUrl && finalAvatarUrl.endsWith('?')) {
                        finalAvatarUrl = finalAvatarUrl.slice(0, -1);
                    }
                } catch (uploadError) {
                    setErrors({ submit: uploadError instanceof Error ? uploadError.message : 'Failed to upload avatar. Please try again.' });
                    setLoading(false);
                    return;
                }
            }

            // Call onSave with updated data
            onSave({
                full_name: fullName.trim(),
                bio: bio.trim(),
                avatar_url: finalAvatarUrl || undefined,
            });
        } catch (err) {
            setErrors({ submit: 'Failed to update profile. Please try again.' });
        } finally {
            setLoading(false);
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
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-50"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-2">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-md sm:rounded-lg shadow-2xl w-full max-w-sm sm:max-w-md md:max-w-xl lg:max-w-2xl max-h-[85vh] overflow-y-auto"
                        >
                            <div className="p-2 sm:p-3">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-2 sm:mb-2.5">
                                    <h2 className="text-base sm:text-lg font-bold text-primary">Edit Profile</h2>
                                    <button
                                        onClick={onClose}
                                        className="text-neutral-61 hover:text-neutral-42 transition-colors"
                                        aria-label="Close modal"
                                    >
                                        <span className="text-xl sm:text-2xl">&times;</span>
                                    </button>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-2.5">
                                    {/* Avatar Upload */}
                                    <div>
                                        <label className="block text-xs font-semibold text-neutral-42 mb-1">
                                            Profile Photo
                                        </label>
                                        <div 
                                            className="[&>div]:space-y-1 [&>div>div]:p-1.5 [&>div>div]:rounded-md [&>div>div>div]:min-h-[80px] md:[&>div>div>div]:min-h-[120px] lg:[&>div>div>div]:min-h-[160px] [&>div>div>div]:p-1 [&>div>div>div>img]:max-h-24 md:[&>div>div>div>img]:max-h-32 lg:[&>div>div>div>img]:max-h-40 [&>div>div>div>img]:max-w-full [&>div>div>div>button]:w-4 [&>div>div>div>button]:h-4 [&>div>div>div>button]:text-xs [&>div>div>div>button]:top-0.5 [&>div>div>div>button]:right-0.5 [&>div>div>div>div]:text-xl [&>div>div>div>div]:mb-0.5 [&>div>div>div>p]:text-xs [&>div>div>div>p]:leading-tight"
                                            style={{
                                                fontSize: '0.75rem'
                                            }}
                                        >
                                            <ImageUpload
                                                onImageSelect={handleImageSelect}
                                                preview={imagePreview}
                                                label=""
                                            />
                                        </div>
                                    </div>

                                    {/* Full Name */}
                                    <div>
                                        <label htmlFor="full-name" className="block text-xs font-semibold text-neutral-42 mb-1">
                                            Full Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="full-name"
                                            value={fullName}
                                            onChange={(e) => {
                                                setFullName(e.target.value);
                                                if (errors.fullName) {
                                                    setErrors((prev) => ({ ...prev, fullName: '' }));
                                                }
                                            }}
                                            className={`w-full px-2 py-1 rounded-md border-2 transition-colors text-xs ${errors.fullName
                                                ? 'border-red-500 focus:border-red-500'
                                                : 'border-neutral-200 focus:border-primary'
                                                } focus:outline-none focus:ring-1 focus:ring-primary/20`}
                                            placeholder="Enter your full name"
                                        />
                                        {errors.fullName && (
                                            <p className="mt-0.5 text-xs text-red-600">{errors.fullName}</p>
                                        )}
                                    </div>

                                    {/* Bio */}
                                    <div>
                                        <label htmlFor="bio" className="block text-xs font-semibold text-neutral-42 mb-1">
                                            Bio
                                        </label>
                                        <textarea
                                            id="bio"
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            rows={2}
                                            className="w-full px-2 py-1 rounded-md border-2 border-neutral-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 resize-none text-xs"
                                            placeholder="Tell us about yourself..."
                                        />
                                        <p className="mt-0.5 text-xs text-neutral-61">
                                            {bio.length}/200 characters
                                        </p>
                                    </div>

                                    {/* Error Message */}
                                    {errors.submit && (
                                        <div className="p-1.5 sm:p-2 rounded-md bg-red-50 border border-red-200">
                                            <p className="text-xs text-red-600">{errors.submit}</p>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-1.5 sm:gap-2 pt-1.5 sm:pt-2">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="flex-1 px-2 sm:px-3 py-1.5 border-2 border-neutral-200 hover:border-neutral-300 text-neutral-42 font-semibold rounded-md transition-colors text-xs"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1 px-2 sm:px-3 py-1.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-md transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                                        >
                                            {loading ? 'Saving...' : 'Save Changes'}
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