import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../config/supabaseClient";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
    updateCommunityRecipe,
    setComments,
    appendComments,
    addComment,
    type Comment
} from "../../store/slices/communitySlice";

interface CommentsModalProps {
    recipeId: string;
    isOpen: boolean;
    onClose: () => void;
    onCommentAdded?: () => void;
}

export default function CommentsModal({
    recipeId,
    isOpen,
    onClose,
    onCommentAdded,
}: CommentsModalProps) {
    const { user } = useAuth();
    const dispatch = useAppDispatch();

    // Get cached comments from Redux
    const cachedCommentsData = useAppSelector((state) => state.community.comments[recipeId]);
    const cachedComments = cachedCommentsData?.comments || [];
    const cachedPage = cachedCommentsData?.page || 0;
    const cachedHasMore = cachedCommentsData?.hasMore ?? true;

    type ModeratedComment = Comment & { hidden?: boolean };

    const [comments, setLocalComments] = useState<ModeratedComment[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [commentText, setCommentText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const commentsEndRef = useRef<HTMLDivElement>(null);
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

            const session = await supabase.auth.getSession();
            if (!session.data.session?.access_token) {
                throw new Error('Not authenticated');
            }

            const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(
                `${backendUrl}/api/recipes/${recipeId}/comments?page=${pageNum}&limit=20`,
                {
                    headers: {
                        'Authorization': `Bearer ${session.data.session.access_token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch comments: ${response.statusText}`);
            }

            const result = await response.json();
            const newComments: ModeratedComment[] = result.comments || [];

            // Update Redux cache
            if (append) {
                dispatch(appendComments({
                    recipeId,
                    comments: newComments,
                    page: pageNum,
                    hasMore: newComments.length === 20,
                }));
                setLocalComments((prev) => [...prev, ...newComments]);
            } else {
                dispatch(setComments({
                    recipeId,
                    comments: newComments,
                    page: pageNum,
                    hasMore: newComments.length === 20,
                }));
                setLocalComments(newComments);
            }

            setHasMore(newComments.length === 20);
        } catch (err) {
            console.error('Error fetching comments:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch comments');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [recipeId, dispatch]);

    // Fetch comments when modal opens - only run when modal opens/closes or recipeId changes
    useEffect(() => {
        if (isOpen && recipeId) {
            // If we have cached comments, use them immediately
            if (cachedCommentsData?.loaded && cachedComments.length > 0) {
                setLocalComments(cachedComments);
                setHasMore(cachedHasMore);
                setPage(cachedPage);
                setLoading(false);
            } else {
                setPage(1);
                setHasMore(true);
                fetchComments(1, false);
            }
        }
        // Only depend on isOpen and recipeId to prevent infinite loops
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, recipeId]);

    // Separate effect to update local state when cache changes (but don't trigger fetch)
    // Only update when modal first opens with cached data, not on every cache change
    const hasInitializedRef = useRef(false);
    useEffect(() => {
        if (isOpen && recipeId && !hasInitializedRef.current && cachedCommentsData?.loaded && cachedComments.length > 0) {
            setLocalComments(cachedComments);
            setHasMore(cachedHasMore);
            setPage(cachedPage);
            hasInitializedRef.current = true;
        }
        if (!isOpen) {
            hasInitializedRef.current = false;
        }
    }, [isOpen, recipeId, cachedCommentsData?.loaded, cachedComments.length]);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || submitting) return;

        setSubmitting(true);
        try {
            const session = await supabase.auth.getSession();
            if (!session.data.session?.access_token) {
                throw new Error('Not authenticated');
            }

            const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(
                `${backendUrl}/api/recipes/${recipeId}/comments`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.data.session.access_token}`,
                    },
                    body: JSON.stringify({
                        comment_text: commentText.trim(),
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
                throw new Error(errorData.detail || `Failed to add comment: ${response.statusText}`);
            }

            const result = await response.json();
            const newComment = result.comment;

            // Update Redux cache with new comment
            dispatch(addComment({
                recipeId,
                comment: newComment,
            }));

            // Update local state
            setLocalComments((prev) => [newComment, ...prev]);
            setCommentText("");

            // Update comments_count in Redux store
            dispatch(updateCommunityRecipe({
                id: recipeId,
                comments_count: comments.length + 1,
            }));

            if (onCommentAdded) {
                onCommentAdded();
            }
        } catch (err) {
            console.error('Error adding comment:', err);
            alert(err instanceof Error ? err.message : 'Failed to add comment. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

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
                        <div className="sticky top-0 bg-white border-b border-neutral-200 px-4 py-2 sm:px-5 sm:py-3 md:px-6 md:py-4 flex items-center justify-between rounded-t-2xl z-10">
                            <h3 className="text-lg sm:text-xl font-bold text-neutral-42">
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
                        <div className="flex-1 overflow-y-auto px-4 py-2 sm:px-5 sm:py-3 md:px-6 md:py-4 space-y-3 sm:space-y-4">
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

                        {/* Comment Form */}
                        {user && (
                            <div className="sticky bottom-0 bg-white border-t border-neutral-200 px-4 py-2 sm:px-5 sm:py-3 md:px-6 md:py-4 rounded-b-2xl">
                                <form onSubmit={handleSubmit} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        placeholder="Add a comment..."
                                        className="flex-1 px-4 py-2 border-2 border-neutral-200 rounded-xl focus:outline-none focus:border-primary"
                                        aria-label="Comment input"
                                        disabled={submitting}
                                    />
                                    <button
                                        type="submit"
                                        disabled={submitting || !commentText.trim()}
                                        className="px-6 py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors min-w-[44px] min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label="Submit comment"
                                    >
                                        {submitting ? "..." : "Post"}
                                    </button>
                                </form>
                            </div>
                        )}
                        {!user && (
                            <div className="sticky bottom-0 bg-neutral-50 border-t border-neutral-200 px-4 py-2 sm:px-5 sm:py-3 md:px-6 md:py-4 rounded-b-2xl text-center">
                                <p className="text-neutral-61">
                                    Please log in to comment
                                </p>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}