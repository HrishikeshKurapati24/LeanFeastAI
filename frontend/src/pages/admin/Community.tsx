import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import DataTable from '../../components/admin/DataTable';
import FilterPanel from '../../components/admin/FilterPanel';
import StatusBadge from '../../components/admin/StatusBadge';
import Modal from '../../components/admin/Modal';
import AnalyticsChart from '../../components/admin/AnalyticsChart';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { updateRecipe, removeRecipe, addRecipe } from '../../store/slices/adminCommunitySlice';
import { fetchAllCommunity, fetchCommunityAnalytics } from '../../store/thunks/adminThunks';
import { useSupabaseRealtime } from '../../hooks/useSupabaseRealtime';
import {
    adminGetComments,
    adminModerateComment,
    adminRemoveFromCommunity,
    adminUpdateCommunityMetadata,
} from '../../utils/adminApi';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

interface CommunityRecipe {
    recipe_id: string;
    posted_by: string;
    likes: number;
    views: number;
    shares: number;
    comments_count: number;
    is_featured: boolean;
    created_at: string;
    recipes?: {
        title: string;
        description: string;
        image_url: string;
        user_id?: string;
    };
}

export default function Community() {
    const { permissions } = useAdminAuth();
    const dispatch = useAppDispatch();

    // Get data from Redux store
    const allRecipes = useAppSelector((state) => state.adminCommunity.recipes);
    const analytics = useAppSelector((state) => state.adminCommunity.analytics);
    const loading = useAppSelector((state) => state.adminCommunity.loading);

    const [selectedRecipe, setSelectedRecipe] = useState<CommunityRecipe | null>(null);
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [showCommentsModal, setShowCommentsModal] = useState(false);
    const [comments, setComments] = useState<any[]>([]);
    const [removalReason, setRemovalReason] = useState('');
    const [page, setPage] = useState(1);
    const [isModeratingComment, setIsModeratingComment] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        featured: undefined as boolean | undefined,
    });

    // Apply filters using useMemo for performance
    const filteredRecipes = useMemo(() => {
        let filtered = [...allRecipes];

        // Apply search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(
                (recipe) =>
                    recipe.recipes?.title?.toLowerCase().includes(searchLower) ||
                    recipe.recipes?.description?.toLowerCase().includes(searchLower)
            );
        }

        // Apply featured filter
        if (filters.featured !== undefined) {
            filtered = filtered.filter((recipe) => recipe.is_featured === filters.featured);
        }

        return filtered;
    }, [allRecipes, filters]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [filters]);

    // On hard refresh, fetch data if missing
    useEffect(() => {
        if (!loading.recipes && allRecipes.length === 0) {
            dispatch(fetchAllCommunity());
        }
        if (!loading.analytics && !analytics) {
            dispatch(fetchCommunityAnalytics({}));
        }
    }, [loading.recipes, loading.analytics, allRecipes.length, analytics, dispatch]);

    // Setup WebSocket connection for real-time updates
    useSupabaseRealtime('community');

    const getPaginatedRecipes = () => {
        const startIndex = (page - 1) * 20;
        const endIndex = startIndex + 20;
        return filteredRecipes.slice(startIndex, endIndex).map(recipe => ({
            ...recipe,
            id: recipe.recipe_id
        }));
    };


    const loadComments = async (recipeId: string) => {
        try {
            const result = await adminGetComments(recipeId);
            setComments(result.comments || []);
        } catch (error) {
            console.error('Error loading comments:', error);
        }
    };

    const handleRemove = async () => {
        if (!selectedRecipe || !removalReason.trim()) return;

        // Check if already deleted
        if (selectedRecipe.posted_by?.startsWith('deleted_')) {
            alert('This recipe is already deleted. Actions are disabled.');
            setShowRemoveModal(false);
            setSelectedRecipe(null);
            setRemovalReason('');
            return;
        }

        // Store previous recipe for rollback
        const previousRecipe = { ...selectedRecipe };
        const removalReasonValue = removalReason.trim();

        try {
            // Optimistically update Redux store
            dispatch(removeRecipe(selectedRecipe.recipe_id));
            setShowRemoveModal(false);
            setRemovalReason('');
            setSelectedRecipe(null);
            await adminRemoveFromCommunity(selectedRecipe.recipe_id, removalReasonValue);
            // Analytics will be updated via WebSocket
        } catch (error) {
            console.error('Error removing recipe:', error);
            // Revert optimistic update on error - re-add the recipe
            dispatch(addRecipe(previousRecipe));
            // Re-open modal and restore state
            setSelectedRecipe(previousRecipe);
            setRemovalReason(removalReasonValue);
            setShowRemoveModal(true);
            alert(error instanceof Error ? error.message : 'Failed to remove recipe');
        }
    };

    const handleModerateComment = async (
        commentId: string,
        action: 'hide' | 'show' | 'delete'
    ) => {
        if (!selectedRecipe) return;

        try {
            setIsModeratingComment(true);
            await adminModerateComment(selectedRecipe.recipe_id, commentId, action);
            loadComments(selectedRecipe.recipe_id);
        } catch (error) {
            console.error('Error moderating comment:', error);
            alert(error instanceof Error ? error.message : 'Failed to moderate comment');
        } finally {
            setIsModeratingComment(false);
        }
    };

    const handleToggleFeatured = async (recipe: CommunityRecipe) => {
        // Check if already deleted
        if (recipe.posted_by?.startsWith('deleted_')) {
            alert('This recipe is already deleted. Actions are disabled.');
            return;
        }

        // Store previous state for rollback
        const previousIsFeatured = recipe.is_featured;
        const newIsFeatured = !recipe.is_featured;

        try {
            // Optimistically update Redux store
            dispatch(updateRecipe({ recipe_id: recipe.recipe_id, is_featured: newIsFeatured }));
            await adminUpdateCommunityMetadata(recipe.recipe_id, {
                is_featured: newIsFeatured,
            });
            // Analytics will be updated via WebSocket
        } catch (error) {
            console.error('Error updating featured status:', error);
            // Revert optimistic update on error
            dispatch(updateRecipe({ recipe_id: recipe.recipe_id, is_featured: previousIsFeatured }));
            alert(error instanceof Error ? error.message : 'Failed to update featured status');
        }
    };

    const columns = [
        {
            key: 'title',
            header: 'Recipe',
            render: (recipe: CommunityRecipe) => (
                <div className="flex items-center gap-2 md:gap-3 min-w-0 max-w-full">
                    {recipe.recipes?.image_url && (
                        <img
                            src={recipe.recipes.image_url}
                            alt={recipe.recipes.title}
                            className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover flex-shrink-0"
                        />
                    )}
                    <div className="min-w-0 flex-1 max-w-full overflow-hidden">
                        <div className="font-medium text-neutral-42 text-xs md:text-sm truncate max-w-full" title={recipe.recipes?.title || 'Unknown'}>
                            {recipe.recipes?.title || 'Unknown'}
                        </div>
                        <div className="text-xs text-neutral-61 line-clamp-1 hidden sm:block truncate max-w-full" title={recipe.recipes?.description}>
                            {recipe.recipes?.description}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'is_featured',
            header: 'Status',
            render: (recipe: CommunityRecipe) => {
                const isDeleted = recipe.posted_by?.startsWith('deleted_');
                const status = isDeleted ? 'deleted' : (recipe.is_featured ? 'featured' : 'active');
                const label = isDeleted ? 'Deleted' : (recipe.is_featured ? 'Featured' : 'Active');

                return (
                    <StatusBadge
                        status={status}
                        label={label}
                    />
                );
            },
        },
        {
            key: 'engagement',
            header: 'Engagement',
            render: (recipe: CommunityRecipe) => (
                <div className="text-xs space-y-1">
                    <div>👍 {recipe.likes}</div>
                    <div>👁️ {recipe.views}</div>
                    <div>💬 {recipe.comments_count}</div>
                    <div>📤 {recipe.shares}</div>
                </div>
            ),
            hiddenOnMobile: true,
        },
        {
            key: 'created_at',
            header: 'Posted',
            render: (recipe: CommunityRecipe) => (
                <span className="text-xs">
                    {new Date(recipe.created_at).toLocaleDateString()}
                </span>
            ),
            hiddenOnMobile: true,
        },
    ];

    const engagementData = analytics
        ? [
            { name: 'Likes', value: analytics.total_likes },
            { name: 'Views', value: analytics.total_views },
            { name: 'Shares', value: analytics.total_shares },
            { name: 'Comments', value: analytics.total_comments },
        ]
        : [];

    return (
        <AdminLayout>
            <div className="space-y-2 sm:space-y-3 md:space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-1 sm:mb-1.5 md:mb-2">
                        Community & Analytics
                    </h1>
                    <p className="text-xs sm:text-sm md:text-base text-neutral-61">Manage community recipes and moderation</p>
                </div>

                {/* Analytics Section */}
                {loading.analytics ? (
                    <div className="rounded-lg sm:rounded-xl p-4 sm:p-6 bg-white/85 backdrop-blur-sm border border-white/30">
                        <div className="animate-pulse space-y-3 sm:space-y-4">
                            <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/4"></div>
                            <div className="h-24 sm:h-32 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                ) : analytics ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                        <AnalyticsChart title="Community Engagement" height={150}>
                            <ResponsiveContainer width="100%" height="100%" minHeight={150}>
                                <BarChart data={engagementData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip
                                        formatter={(value, name) => [value ?? 0, name ?? '']}
                                        labelFormatter={(label) => `Metric: ${label}`}
                                        contentStyle={{ fontSize: '12px', padding: '8px' }}
                                    />
                                    <Bar dataKey="value" fill="#22c55e" />
                                </BarChart>
                            </ResponsiveContainer>
                        </AnalyticsChart>

                        {/* Single Stats Card for Medium/Large Screens */}
                        <div
                            className="rounded-lg md:rounded-xl p-3 sm:p-4 md:p-6"
                            style={{
                                background: 'rgba(255, 255, 255, 0.85)',
                                backdropFilter: 'blur(20px) saturate(180%)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                boxShadow: '0 4px 16px rgba(34, 197, 94, 0.1)',
                            }}
                        >
                            <h3 className="text-xs sm:text-sm md:text-base font-medium text-neutral-61 mb-2 sm:mb-3 md:mb-4">Community Statistics</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                                <div>
                                    <p className="text-xs font-medium text-neutral-61 mb-1">Total Recipes</p>
                                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-primary">{analytics.total_community_recipes}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-neutral-61 mb-1">Featured</p>
                                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">{analytics.featured_count}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-neutral-61 mb-1">Total Likes</p>
                                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">{analytics.total_likes}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-neutral-61 mb-1">Total Views</p>
                                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600">{analytics.total_views}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Filters and Table */}
                <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 md:gap-6">
                    {/* Filter Panel - Top on small/medium, right on large */}
                    <div className="w-full lg:w-64 xl:w-80 flex-shrink-0 order-1 lg:order-2">
                        <FilterPanel title="Filters" defaultOpen={true}>
                            <div>
                                <label className="block text-xs font-medium text-neutral-42 mb-1 sm:mb-1.5 md:mb-2">
                                    Search
                                </label>
                                <input
                                    type="text"
                                    value={filters.search}
                                    onChange={(e) =>
                                        setFilters({ ...filters, search: e.target.value })
                                    }
                                    placeholder="Recipe title..."
                                    className="w-full px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 md:py-2 rounded-md md:rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary text-xs sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-neutral-42 mb-1 sm:mb-1.5 md:mb-2">
                                    Featured
                                </label>
                                <select
                                    value={
                                        filters.featured === undefined
                                            ? ''
                                            : filters.featured.toString()
                                    }
                                    onChange={(e) =>
                                        setFilters({
                                            ...filters,
                                            featured:
                                                e.target.value === ''
                                                    ? undefined
                                                    : e.target.value === 'true',
                                        })
                                    }
                                    className="w-full px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 md:py-2 rounded-md md:rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary text-xs sm:text-sm"
                                >
                                    <option value="">All</option>
                                    <option value="true">Featured</option>
                                    <option value="false">Not Featured</option>
                                </select>
                            </div>
                            <button
                                onClick={() =>
                                    setFilters({ search: '', featured: undefined })
                                }
                                className="w-full px-3 sm:px-3.5 md:px-4 py-1.5 sm:py-2 md:py-2 rounded-md md:rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-61 text-xs sm:text-sm font-medium transition-colors"
                            >
                                Clear Filters
                            </button>
                            <div className="mt-2 sm:mt-3 md:mt-4 pt-2 sm:pt-3 md:pt-4 border-t border-neutral-200">
                                <p className="text-xs text-neutral-61">
                                    Showing {filteredRecipes.length} of {allRecipes.length} recipes
                                </p>
                            </div>
                        </FilterPanel>
                    </div>

                    {/* Table - Centered */}
                    <div className="flex-1 overflow-x-auto order-2 lg:order-1">
                        <DataTable
                            data={getPaginatedRecipes()}
                            columns={columns}
                            loading={loading.recipes}
                            actions={(recipe) => {
                                const canModerate = permissions.can_moderate_comments === true;
                                const canFeature = permissions.can_feature_recipes === true;
                                const canRemove = permissions.can_remove_from_community === true;
                                const isDeleted = recipe.posted_by?.startsWith('deleted_');

                                return (
                                    <div className="flex items-center gap-0.5 md:gap-1">
                                        {canModerate && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedRecipe(recipe);
                                                    loadComments(recipe.recipe_id);
                                                    setShowCommentsModal(true);
                                                }}
                                                title="View comments"
                                                disabled={isDeleted}
                                                className={`w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-lg transition-colors ${isDeleted
                                                    ? 'text-gray-400 cursor-not-allowed opacity-50'
                                                    : 'text-blue-600 hover:bg-blue-50'
                                                    }`}
                                            >
                                                <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                </svg>
                                            </button>
                                        )}
                                        {canFeature && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleFeatured(recipe);
                                                }}
                                                title={isDeleted ? 'Actions disabled for deleted recipes' : (recipe.is_featured ? 'Unfeature recipe' : 'Feature recipe')}
                                                disabled={isDeleted}
                                                className={`w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-lg transition-colors ${isDeleted
                                                    ? 'text-gray-400 cursor-not-allowed opacity-50'
                                                    : 'text-purple-600 hover:bg-purple-50'
                                                    }`}
                                            >
                                                {recipe.is_featured ? (
                                                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                    </svg>
                                                )}
                                            </button>
                                        )}
                                        {canRemove && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedRecipe(recipe);
                                                    setShowRemoveModal(true);
                                                }}
                                                title={isDeleted ? 'Actions disabled for deleted recipes' : 'Remove from community'}
                                                disabled={isDeleted}
                                                className={`w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-lg transition-colors ${isDeleted
                                                    ? 'text-gray-400 cursor-not-allowed opacity-50'
                                                    : 'text-red-600 hover:bg-red-50'
                                                    }`}
                                            >
                                                <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                );
                            }}
                        />

                        {/* Pagination */}
                        {filteredRecipes.length > 20 && (
                            <div className="flex items-center justify-between mt-2 md:mt-4">
                                <button
                                    onClick={() => setPage(page - 1)}
                                    disabled={page === 1}
                                    className="px-2 py-1 md:px-4 md:py-2 rounded-lg bg-white border border-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm"
                                >
                                    Previous
                                </button>
                                <span className="text-xs md:text-sm text-neutral-61">
                                    Page {page} of {Math.ceil(filteredRecipes.length / 20)} ({filteredRecipes.length} recipes)
                                </span>
                                <button
                                    onClick={() => setPage(page + 1)}
                                    disabled={page >= Math.ceil(filteredRecipes.length / 20)}
                                    className="px-2 py-1 md:px-4 md:py-2 rounded-lg bg-white border border-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Remove Modal */}
            <Modal
                isOpen={showRemoveModal}
                onClose={() => {
                    setShowRemoveModal(false);
                    setRemovalReason('');
                    setSelectedRecipe(null);
                }}
                title="Remove from Community"
                footer={
                    <>
                        <button
                            onClick={() => {
                                setShowRemoveModal(false);
                                setRemovalReason('');
                                setSelectedRecipe(null);
                            }}
                            className="px-4 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-61"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleRemove}
                            disabled={!removalReason.trim()}
                            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                        >
                            Remove Recipe
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    <p className="text-neutral-61">
                        Remove <strong>{selectedRecipe?.recipes?.title}</strong> from the community?
                        The original recipe will be kept.
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-neutral-42 mb-2">
                            Reason (required)
                        </label>
                        <textarea
                            value={removalReason}
                            onChange={(e) => setRemovalReason(e.target.value)}
                            placeholder="Enter reason for removal..."
                            rows={4}
                            className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>
            </Modal>

            {/* Comments Modal */}
            <Modal
                isOpen={showCommentsModal}
                onClose={() => {
                    setShowCommentsModal(false);
                    setSelectedRecipe(null);
                    setComments([]);
                }}
                title={`Comments - ${selectedRecipe?.recipes?.title}`}
                size="lg"
            >
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {comments.length === 0 ? (
                        <p className="text-neutral-61 text-center py-8">No comments yet</p>
                    ) : (
                        comments.map((comment: any, index: number) => (
                            <div
                                key={comment.id || index}
                                className="p-4 rounded-lg bg-neutral-50"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-neutral-42">
                                                {comment.user_name || 'Anonymous'}
                                            </span>
                                            <span className="text-xs text-neutral-61">
                                                {comment.created_at
                                                    ? new Date(comment.created_at).toLocaleDateString()
                                                    : ''}
                                            </span>
                                        </div>
                                        <p className="text-sm text-neutral-61">{comment.text}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {comment.hidden ? (
                                            <button
                                                onClick={() =>
                                                    handleModerateComment(comment.id, 'show')
                                                }
                                                disabled={isModeratingComment}
                                                className="px-2 py-1 rounded text-xs bg-green-100 text-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Show
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() =>
                                                    handleModerateComment(comment.id, 'hide')
                                                }
                                                disabled={isModeratingComment}
                                                className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Hide
                                            </button>
                                        )}
                                        <button
                                            onClick={() =>
                                                handleModerateComment(comment.id, 'delete')
                                            }
                                            disabled={isModeratingComment}
                                            className="px-2 py-1 rounded text-xs bg-red-100 text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Modal>
        </AdminLayout>
    );
}