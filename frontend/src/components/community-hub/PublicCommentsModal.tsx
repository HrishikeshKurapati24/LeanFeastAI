import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface Comment {
    id: string;
    user_name: string;
    user_avatar?: string;
    text: string;
    created_at: string;
    hidden?: boolean;
}

interface PublicCommentsModalProps {
    recipeId: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function PublicCommentsModal({
    recipeId,
    isOpen,
    onClose,
}: PublicCommentsModalProps) {
    const navigate = useNavigate();
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadingTriggerRef = useRef<HTMLDivElement>(null);

    const fetchComments = useCallback(async (pageNum: number = 1, append: boolean = false) => {
        if (!recipeId) return;

        try {
            if (pageNum === 1) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }
            setError(null);

            const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(
                `${backendUrl}/api/recipes/${recipeId}/comments/public?page=${pageNum}&limit=20`
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch comments: ${response.statusText}`);
            }

            const result = await response.json();
            const newComments: Comment[] = result.comments || [];

            if (append) {
                setComments((prev) => [...prev, ...newComments]);
            } else {
                setComments(newComments);
            }

            setHasMore(newComments.length === 20);
        } catch (err) {
            console.error('Error fetching comments:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch comments');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [recipeId]);

    // Fetch comments when modal opens
    useEffect(() => {
        if (isOpen && recipeId) {
            setPage(1);
            setHasMore(true);
            fetchComments(1, false);
        }
    }, [isOpen, recipeId, fetchComments]);

    // Infinite scroll observer
    useEffect(() => {
        if (!isOpen || !hasMore || loadingMore) return;

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    fetchComments(nextPage, true);
                }
            },
            { threshold: 0.1 }
        );

        if (loadingTriggerRef.current) {
            observerRef.current.observe(loadingTriggerRef.current);
        }

        return () => {
            if (observerRef.current && loadingTriggerRef.current) {
                observerRef.current.unobserve(loadingTriggerRef.current);
            }
        };
    }, [isOpen, hasMore, loadingMore, page, fetchComments]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) {
            return 'just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 604800) {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    const handleLoginPrompt = () => {
        navigate('/login', { state: { message: 'Please log in to comment on recipes' } });
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
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10001]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-x-0 bottom-0 z-[10002] bg-white rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                            <h3 className="text-xl font-bold text-neutral-42">
                                Comments
                            </h3>
                            <button
                                onClick={onClose}
                                className="text-neutral-61 hover:text-neutral-42 text-2xl font-bold transition-colors"
                                aria-label="Close comments"
                            >
                                ×
                            </button>
                        </div>

                        {/* Comments List */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 sm:space-y-4">
                            {comments.some((comment) => comment.hidden) && !loading && !error && (
                                <p className="text-xs sm:text-sm text-neutral-500 italic">
                                    Some comments on this recipe are hidden by moderators.
                                </p>
                            )}
                            {loading ? (
                                <div className="text-center py-8">
                                    <div className="text-5xl mb-4 animate-pulse">💬</div>
                                    <p className="text-neutral-61">Loading comments...</p>
                                </div>
                            ) : error ? (
                                <div className="text-center py-8">
                                    <div className="text-5xl mb-4">⚠️</div>
                                    <p className="text-neutral-61">{error}</p>
                                </div>
                            ) : comments.filter((comment) => !comment.hidden).length > 0 ? (
                                <>
                                    {comments
                                        .filter((comment) => !comment.hidden)
                                        .map((comment) => (
                                        <div key={comment.id} className="p-4 bg-neutral-50 rounded-xl">
                                            <div className="flex items-start gap-3">
                                                {comment.user_avatar ? (
                                                    <img
                                                        src={comment.user_avatar}
                                                        alt={comment.user_name}
                                                        className="w-10 h-10 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                                                        {comment.user_name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-semibold text-neutral-42">
                                                            {comment.user_name}
                                                        </span>
                                                        <span className="text-xs text-neutral-400">
                                                            {formatDate(comment.created_at)}
                                                        </span>
                                                    </div>
                                                    <p className="text-neutral-61">{comment.text}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {/* Infinite scroll trigger */}
                                    <div ref={loadingTriggerRef} className="h-4" />
                                    {loadingMore && (
                                        <div className="text-center py-4">
                                            <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-neutral-400 text-center py-8">
                                    No comments yet. Be the first to comment!
                                </p>
                            )}
                        </div>

                        {/* Login Prompt */}
                        <div className="sticky bottom-0 bg-gradient-to-r from-primary/10 to-primary/5 border-t border-neutral-200 px-6 py-4 rounded-b-2xl text-center">
                            <p className="text-neutral-61 mb-3">
                                Want to join the conversation?
                            </p>
                            <button
                                onClick={handleLoginPrompt}
                                className="px-6 py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors"
                            >
                                Log In to Comment
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}