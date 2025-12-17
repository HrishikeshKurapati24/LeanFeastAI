import { useState, useEffect } from 'react';
import EditProfileModal from './EditProfileModal';

interface ProfileOverviewProps {
    profile: {
        full_name?: string;
        avatar_url?: string;
        bio?: string;
        created_at?: string;
    };
    onProfileUpdate: (updatedProfile: { full_name?: string; bio?: string; avatar_url?: string }) => void;
}

export default function ProfileOverview({ profile, onProfileUpdate }: ProfileOverviewProps) {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);


    // Get initials from full_name for avatar fallback
    const getInitials = (name?: string): string => {
        if (!name) return '?';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    // Check if avatar_url is a valid Supabase Storage URL (not base64)
    const isValidStorageUrl = (url?: string): boolean => {
        if (!url) return false;
        // Check if it's a base64 data URL
        if (url.startsWith('data:image/')) {
            return false;
        }
        // Check if it's a valid HTTP/HTTPS URL (Supabase Storage URLs)
        return url.startsWith('http://') || url.startsWith('https://');
    };

    // Get the avatar URL to display (only if it's a valid storage URL, not base64)
    const getAvatarUrl = (): string | null => {
        if (!profile.avatar_url) {
            return null;
        }
        // Clean up URL - remove trailing ? if present
        let cleanUrl = profile.avatar_url.trim();
        if (cleanUrl.endsWith('?')) {
            cleanUrl = cleanUrl.slice(0, -1);
        }
        // Only use if it's a valid storage URL, not a base64 data URL
        if (isValidStorageUrl(cleanUrl)) {
            return cleanUrl;
        }
        // If it's a base64 data URL, return null to show initials instead
        return null;
    };

    // Format member since date
    const getMemberSince = (): string => {
        if (!profile.created_at) return 'Recently';
        const date = new Date(profile.created_at);
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'Recently';
        }
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const monthIndex = date.getMonth();
        const year = date.getFullYear();
        // Validate month and year are valid numbers
        if (isNaN(monthIndex) || isNaN(year)) {
            return 'Recently';
        }
        return `${months[monthIndex]} ${year}`;
    };

    const handleSave = (updatedData: { full_name?: string; bio?: string; avatar_url?: string }) => {
        onProfileUpdate(updatedData);
        setIsEditModalOpen(false);
    };

    return (
        <>
            <div
                className="rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 shadow-md mb-3 sm:mb-4"
                style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                }}
            >
                <div className="flex flex-col md:flex-row items-center md:items-start gap-3 sm:gap-4">
                    {/* Avatar - Always show either image or initials */}
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
                        {(() => {
                            const avatarUrl = getAvatarUrl();

                            if (avatarUrl) {
                                return (
                                    <>
                                        <img
                                            key={avatarUrl} // Force re-render when URL changes
                                            src={avatarUrl}
                                            alt={profile.full_name || 'User'}
                                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 sm:border-3 border-white shadow-md"
                                            onError={(e) => {
                                                // If image fails to load, show initials instead
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                const parent = (e.target as HTMLImageElement).parentElement;
                                                if (parent) {
                                                    const fallback = parent.querySelector('.avatar-fallback') as HTMLElement;
                                                    if (fallback) {
                                                        fallback.style.display = 'flex';
                                                    }
                                                }
                                            }}
                                        />
                                        <div
                                            className="avatar-fallback w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold text-white shadow-md"
                                            style={{
                                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                display: 'none',
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                            }}
                                        >
                                            {getInitials(profile.full_name)}
                                        </div>
                                    </>
                                );
                            } else {
                                return (
                                    <div
                                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold text-white shadow-md flex-shrink-0"
                                        style={{
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        }}
                                    >
                                        {getInitials(profile.full_name)}
                                    </div>
                                );
                            }
                        })()}
                    </div>

                    {/* Profile Info */}
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-1 sm:mb-1.5">
                            {profile.full_name || 'User'}
                        </h1>
                        {profile.bio && (
                            <p className="text-sm sm:text-base text-neutral-61 mb-2 sm:mb-3">
                                {profile.bio}
                            </p>
                        )}
                        <p className="text-xs sm:text-sm text-neutral-61 mb-3 sm:mb-4">
                            Member since {getMemberSince()}
                        </p>
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md text-xs sm:text-sm"
                        >
                            Edit Profile
                        </button>
                    </div>
                </div>
            </div>

            {/* Edit Profile Modal */}
            <EditProfileModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                profile={profile}
                onSave={handleSave}
            />
        </>
    );
}