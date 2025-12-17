import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../config/supabaseClient';

interface RecipeActionsProps {
    recipeId: string;
    recipeTitle: string;
    recipeDescription: string;
    isSaved: boolean;
    isLiked: boolean;
    isPublic?: boolean;
    onSave: (recipeId: string) => void;
    onLike: (recipeId: string) => void;
    onShare: (recipeId: string) => void;
    onPostToCommunity: () => void;
}

export default function RecipeActions({
    recipeId,
    recipeTitle,
    recipeDescription,
    isSaved,
    isLiked,
    isPublic: initialIsPublic = false,
    onSave,
    onLike,
    onShare,
    onPostToCommunity,
}: RecipeActionsProps) {
    const [isLiking, setIsLiking] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [isPublic, setIsPublic] = useState(initialIsPublic);
    const shareMenuRef = useRef<HTMLDivElement>(null);

    // Update isPublic state when prop changes
    useEffect(() => {
        setIsPublic(initialIsPublic);
    }, [initialIsPublic]);

    const handleLike = () => {
        if (isLiking) return;
        setIsLiking(true);
        onLike(recipeId);
        setTimeout(() => setIsLiking(false), 300);
    };

    const handleSave = () => {
        if (isSaving) return;
        setIsSaving(true);
        onSave(recipeId);
        setTimeout(() => setIsSaving(false), 300);
    };

    const handleShare = () => {
        // Open share menu immediately
        setShowShareMenu(!showShareMenu);

        // Make recipe public in the background (fire-and-forget) only if not already public
        if (!isPublic) {
            (async () => {
                try {
                    const session = await supabase.auth.getSession();
                    if (session.data.session?.access_token) {
                        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                        const response = await fetch(`${backendUrl}/api/recipes/${recipeId}/make-public`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${session.data.session.access_token}`,
                            },
                        });

                        if (!response.ok) {
                            console.error('Failed to make recipe public:', response.statusText);
                        } else {
                            setIsPublic(true);
                        }
                    }
                } catch (error) {
                    console.error('Error making recipe public:', error);
                }
            })();
        }
    };

    const shareViaEmail = () => {
        const recipeUrl = `${window.location.origin}/recipe/${recipeId}`;
        const subject = encodeURIComponent(`Check out this recipe: ${recipeTitle}`);
        const body = encodeURIComponent(`${recipeDescription}\n\nView the full recipe here: ${recipeUrl}`);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
        onShare(recipeId);
        setShowShareMenu(false);
    };

    const shareViaWhatsApp = () => {
        const recipeUrl = `${window.location.origin}/recipe/${recipeId}`;
        const text = encodeURIComponent(`Check out this recipe: ${recipeTitle}\n\n${recipeDescription}\n\n${recipeUrl}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
        onShare(recipeId);
        setShowShareMenu(false);
    };

    const shareViaNative = async () => {
        const shareData = {
            title: recipeTitle,
            text: recipeDescription,
            url: `${window.location.origin}/recipe/${recipeId}`,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
                onShare(recipeId);
            } else {
                await copyToClipboard(shareData.url);
                onShare(recipeId);
            }
        } catch (error) {
            if ((error as Error).name !== 'AbortError') {
                await copyToClipboard(shareData.url);
                onShare(recipeId);
            }
        }
        setShowShareMenu(false);
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            alert('Recipe link copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy:', error);
            alert('Failed to copy link. Please try again.');
        }
    };

    // Close share menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
                setShowShareMenu(false);
            }
        };

        if (showShareMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showShareMenu]);

    return (
        <div className="mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-primary/6 to-primary/5 rounded-lg sm:rounded-xl border border-primary/20">
                <h3 className="text-sm sm:text-base font-semibold text-neutral-42 mb-2">Action Bar</h3>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        className={`flex-1 min-w-[80px] sm:min-w-[100px] flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all duration-200 text-xs ${isSaving ? 'scale-105' : ''
                            } ${isSaved
                                ? 'bg-primary/20 text-primary border-2 border-primary'
                                : 'bg-white/50 hover:bg-white/70 text-neutral-61 border-2 border-transparent'
                            }`}
                        aria-label={isSaved ? 'Unsave recipe' : 'Save recipe'}
                    >
                        <span className="text-base sm:text-lg">{isSaved ? '🔖' : '📌'}</span>
                        <span className="font-semibold">{isSaved ? 'Saved' : 'Save'}</span>
                    </button>

                    {/* Like Button */}
                    <button
                        onClick={handleLike}
                        className={`flex-1 min-w-[80px] sm:min-w-[100px] flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all duration-200 text-xs ${isLiking ? 'scale-105' : ''
                            } ${isLiked
                                ? 'bg-red-50 text-red-500 border-2 border-red-200'
                                : 'bg-white/50 hover:bg-white/70 text-neutral-61 border-2 border-transparent'
                            }`}
                        aria-label={isLiked ? 'Unlike recipe' : 'Like recipe'}
                    >
                        <span className="text-base sm:text-lg">{isLiked ? '❤️' : '🤍'}</span>
                    </button>

                    {/* Share Button with Menu */}
                    <div className="relative flex-1 min-w-[80px] sm:min-w-[100px]" ref={shareMenuRef}>
                        <button
                            onClick={handleShare}
                            className="w-full flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white/50 hover:bg-white/70 text-neutral-61 border-2 border-transparent transition-all duration-200 text-xs"
                            aria-label="Share recipe"
                            aria-expanded={showShareMenu}
                        >
                            <span className="text-base sm:text-lg">🔗</span>
                            <span className="font-semibold">Share</span>
                        </button>
                        {showShareMenu && (
                            <div className="absolute top-full left-0 mt-1 sm:mt-2 w-40 sm:w-48 bg-white rounded-lg sm:rounded-xl shadow-lg border border-neutral-200 z-[100] py-1 sm:py-2">
                                <button
                                    onClick={shareViaNative}
                                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-left hover:bg-neutral-50 flex items-center gap-2 transition-colors text-xs sm:text-sm"
                                    aria-label="Share via native share"
                                >
                                    <span className="text-base sm:text-lg">📱</span>
                                    <span className="text-neutral-42">Share</span>
                                </button>
                                <button
                                    onClick={shareViaEmail}
                                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-left hover:bg-neutral-50 flex items-center gap-2 transition-colors text-xs sm:text-sm"
                                    aria-label="Share via email"
                                >
                                    <span className="text-base sm:text-lg">📧</span>
                                    <span className="text-neutral-42">Email</span>
                                </button>
                                <button
                                    onClick={shareViaWhatsApp}
                                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-left hover:bg-neutral-50 flex items-center gap-2 transition-colors text-xs sm:text-sm"
                                    aria-label="Share via WhatsApp"
                                >
                                    <span className="text-base sm:text-lg">💬</span>
                                    <span className="text-neutral-42">WhatsApp</span>
                                </button>
                                <button
                                    onClick={() => {
                                        copyToClipboard(`${window.location.origin}/recipe/${recipeId}`);
                                        onShare(recipeId);
                                        setShowShareMenu(false);
                                    }}
                                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-left hover:bg-neutral-50 flex items-center gap-2 transition-colors text-xs sm:text-sm"
                                    aria-label="Copy link"
                                >
                                    <span className="text-base sm:text-lg">📋</span>
                                    <span className="text-neutral-42">Copy Link</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Post to Community Button */}
                    <button
                        onClick={onPostToCommunity}
                        className="flex-1 min-w-[80px] sm:min-w-[100px] flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-primary hover:bg-primary-dark text-white border-2 border-transparent transition-all duration-200 font-semibold text-xs"
                        aria-label="Post to community hub"
                    >
                        <span className="text-base sm:text-lg">🌍</span>
                        <span>Post</span>
                    </button>
                </div>
            </div>
        </div>
    );
}