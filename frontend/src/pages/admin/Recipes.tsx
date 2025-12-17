import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import DataTable from '../../components/admin/DataTable';
import FilterPanel from '../../components/admin/FilterPanel';
import Modal from '../../components/admin/Modal';
import AnalyticsChart from '../../components/admin/AnalyticsChart';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { updateRecipe, removeRecipe, addRecipe } from '../../store/slices/adminRecipesSlice';
import { removeRecipe as removeCommunityRecipe } from '../../store/slices/adminCommunitySlice';
import { fetchAllRecipes, fetchRecipeAnalytics } from '../../store/thunks/adminThunks';
import { useSupabaseRealtime } from '../../hooks/useSupabaseRealtime';
import { adminDeleteRecipe, adminRegenerateImage } from '../../utils/adminApi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Recipe {
    id: string;
    title: string;
    description: string;
    meal_type: string;
    tags: string[];
    created_at: string;
    image_url: string;
    performance?: any;
}

export default function Recipes() {
    const { permissions } = useAdminAuth();
    const dispatch = useAppDispatch();

    // Get data from Redux store
    const allRecipes = useAppSelector((state) => state.adminRecipes.recipes);
    const analytics = useAppSelector((state) => state.adminRecipes.analytics);
    const loading = useAppSelector((state) => state.adminRecipes.loading);

    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [showRecipeDetails, setShowRecipeDetails] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showRegenerateModal, setShowRegenerateModal] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({
        search: '',
        meal_type: '',
    });

    // Apply filters using useMemo for performance
    const filteredRecipes = useMemo(() => {
        let filtered = [...allRecipes];

        // Apply search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(
                (recipe) =>
                    recipe.title?.toLowerCase().includes(searchLower) ||
                    recipe.description?.toLowerCase().includes(searchLower)
            );
        }

        // Apply meal_type filter (case-insensitive comparison)
        if (filters.meal_type) {
            const filterMealTypeLower = filters.meal_type.toLowerCase();
            filtered = filtered.filter(
                (recipe) => recipe.meal_type?.toLowerCase() === filterMealTypeLower
            );
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
            dispatch(fetchAllRecipes());
        }
        if (!loading.analytics && !analytics) {
            dispatch(fetchRecipeAnalytics({}));
        }
    }, [loading.recipes, loading.analytics, allRecipes.length, analytics, dispatch]);

    // Setup WebSocket connection for real-time updates
    useSupabaseRealtime('recipes');

    const getPaginatedRecipes = () => {
        const startIndex = (page - 1) * 20;
        const endIndex = startIndex + 20;
        return filteredRecipes.slice(startIndex, endIndex);
    };


    const handleDelete = async () => {
        if (!selectedRecipe) return;

        // Store previous recipe for rollback
        const previousRecipe = { ...selectedRecipe };

        try {
            // Optimistically update Redux store: remove from admin recipes
            dispatch(removeRecipe(selectedRecipe.id));
            // Also remove from admin community state so Community Hub stays in sync
            dispatch(removeCommunityRecipe(selectedRecipe.id));
            setShowDeleteModal(false);
            setSelectedRecipe(null);
            await adminDeleteRecipe(selectedRecipe.id);
            // Analytics for both slices will be updated via WebSocket
        } catch (error) {
            console.error('Error deleting recipe:', error);
            // Revert optimistic update on error - re-add the recipe to admin recipes
            dispatch(addRecipe(previousRecipe));
            // Note: we intentionally do not re-add to adminCommunity here because
            // community recipes are derived from backend community table and will
            // be refreshed via existing admin community flows/WebSocket.
            // Re-open modal and restore state
            setSelectedRecipe(previousRecipe);
            setShowDeleteModal(true);
            alert(error instanceof Error ? error.message : 'Failed to delete recipe');
        }
    };

    const handleRegenerateImage = async () => {
        if (!selectedRecipe) return;

        // Store previous state for rollback
        const previousRecipe = { ...selectedRecipe };
        const previousImageUrl = previousRecipe.image_url;
        let newImageUrl: string | null = null;

        try {
            setRegenerating(true);
            const result = await adminRegenerateImage(selectedRecipe.id);
            // Optimistically update Redux store with new image URL
            if (result.image_url) {
                newImageUrl = result.image_url;
                dispatch(updateRecipe({ id: selectedRecipe.id, image_url: result.image_url }));
            }
            setShowRegenerateModal(false);
            setSelectedRecipe(null);
            alert('Image regenerated successfully!');
        } catch (error) {
            console.error('Error regenerating image:', error);
            // Revert optimistic update on error
            if (newImageUrl) {
                dispatch(updateRecipe({ id: previousRecipe.id, image_url: previousImageUrl }));
            }
            // Re-open modal and restore state
            setSelectedRecipe(previousRecipe);
            setShowRegenerateModal(true);
            alert(error instanceof Error ? error.message : 'Failed to regenerate image');
        } finally {
            setRegenerating(false);
        }
    };

    const columns = [
        {
            key: 'title',
            header: 'Recipe',
            render: (recipe: Recipe) => (
                <div className="flex items-center gap-2 md:gap-3 min-w-0 max-w-full">
                    {recipe.image_url && (
                        <img
                            src={recipe.image_url}
                            alt={recipe.title}
                            className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover flex-shrink-0"
                        />
                    )}
                    <div className="min-w-0 flex-1 max-w-full overflow-hidden">
                        <div className="font-medium text-neutral-42 text-xs md:text-sm truncate max-w-full" title={recipe.title}>{recipe.title}</div>
                        <div className="text-xs text-neutral-61 line-clamp-1 hidden sm:block truncate max-w-full" title={recipe.description}>
                            {recipe.description}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'meal_type',
            header: 'Meal Type',
            render: (recipe: Recipe) => (
                <span className="text-xs md:text-sm capitalize">{recipe.meal_type || 'N/A'}</span>
            ),
        },
        {
            key: 'tags',
            header: 'Tags',
            render: (recipe: Recipe) => (
                <div className="flex flex-wrap gap-1">
                    {recipe.tags?.slice(0, 2).map((tag, idx) => (
                        <span
                            key={idx}
                            className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary"
                        >
                            {tag}
                        </span>
                    ))}
                    {recipe.tags && recipe.tags.length > 2 && (
                        <span className="text-xs text-neutral-61">+{recipe.tags.length - 2}</span>
                    )}
                </div>
            ),
            hiddenOnMobile: true,
        },
        {
            key: 'created_at',
            header: 'Created',
            render: (recipe: Recipe) => (
                <span className="text-xs">
                    {new Date(recipe.created_at).toLocaleDateString()}
                </span>
            ),
            hiddenOnMobile: true,
        },
    ];

    const mealTypeData = analytics?.meal_type_distribution
        ? Object.entries(analytics.meal_type_distribution).map(([name, value]) => ({
            name,
            value,
        }))
        : [];

    // Dynamically calculate meal types from recipes (case-insensitive deduplication)
    const availableMealTypes = useMemo(() => {
        const mealTypesMap = new Map<string, string>(); // lowercase -> original
        allRecipes.forEach((recipe) => {
            if (recipe.meal_type) {
                const lower = recipe.meal_type.toLowerCase();
                // Store the first occurrence's original casing
                if (!mealTypesMap.has(lower)) {
                    mealTypesMap.set(lower, recipe.meal_type);
                }
            }
        });
        return Array.from(mealTypesMap.values()).sort((a, b) =>
            a.toLowerCase().localeCompare(b.toLowerCase())
        );
    }, [allRecipes]);

    return (
        <AdminLayout>
            <div className="space-y-3 md:space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-lg md:text-3xl font-bold text-primary mb-0.5 md:mb-2">Recipes & Analytics</h1>
                    <p className="text-xs md:text-base text-neutral-61">Manage AI-generated recipes and view analytics</p>
                </div>

                {/* Analytics Section */}
                {loading.analytics ? (
                    <div className="rounded-xl p-6 bg-white/85 backdrop-blur-sm border border-white/30">
                        <div className="animate-pulse space-y-4">
                            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                            <div className="h-32 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                ) : analytics ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                        <AnalyticsChart title="Meal Type Distribution" height={150}>
                            <ResponsiveContainer width="100%" height="100%" minHeight={150}>
                                <BarChart data={mealTypeData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip
                                        formatter={(value: number, name: string) => [value, name]}
                                        labelFormatter={(label) => `Meal Type: ${label}`}
                                        contentStyle={{ fontSize: '12px', padding: '8px' }}
                                    />
                                    <Bar dataKey="value" fill="#22c55e" />
                                </BarChart>
                            </ResponsiveContainer>
                        </AnalyticsChart>

                        {/* Single Stats Card for Medium/Large Screens */}
                        <div
                            className="rounded-lg md:rounded-xl p-1.5 md:p-6"
                            style={{
                                background: 'rgba(255, 255, 255, 0.85)',
                                backdropFilter: 'blur(20px) saturate(180%)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                boxShadow: '0 4px 16px rgba(34, 197, 94, 0.1)',
                            }}
                        >
                            <h3 className="text-xs md:text-sm font-medium text-neutral-61 mb-1.5 md:mb-4">Recipe Statistics</h3>
                            <div className="grid grid-cols-2 gap-1.5 md:gap-4">
                                <div>
                                    <p className="text-xs font-medium text-neutral-61 mb-0.5">Total Recipes</p>
                                    <p className="text-base md:text-2xl font-bold text-primary">{analytics.total_recipes}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Filters and Table */}
                <div className="flex flex-col lg:flex-row gap-2 md:gap-6">
                    {/* Filter Panel - top on small/medium, right on large */}
                    <div className="w-full lg:w-64 xl:w-80 flex-shrink-0 order-1 lg:order-2">
                        <FilterPanel title="Filters" defaultOpen={true}>
                            <div>
                                <label className="block text-xs font-medium text-neutral-42 mb-0.5 md:mb-2">
                                    Search
                                </label>
                                <input
                                    type="text"
                                    value={filters.search}
                                    onChange={(e) =>
                                        setFilters({ ...filters, search: e.target.value })
                                    }
                                    placeholder="Recipe title and tags..."
                                    className="w-full px-1.5 py-0.5 md:px-3 md:py-2 rounded-md md:rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary text-xs md:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-neutral-42 mb-0.5 md:mb-2">
                                    Meal Type
                                </label>
                                <select
                                    value={filters.meal_type}
                                    onChange={(e) =>
                                        setFilters({ ...filters, meal_type: e.target.value })
                                    }
                                    className="w-full px-1.5 py-0.5 md:px-3 md:py-2 rounded-md md:rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary text-xs md:text-sm"
                                >
                                    <option value="">All</option>
                                    {availableMealTypes.map((mealType) => (
                                        <option key={mealType} value={mealType}>
                                            {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => setFilters({ search: '', meal_type: '' })}
                                className="w-full px-1.5 py-0.5 md:px-4 md:py-2 rounded-md md:rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-61 text-xs md:text-sm font-medium transition-colors"
                            >
                                Clear Filters
                            </button>
                            <div className="mt-1.5 md:mt-4 pt-1.5 md:pt-4 border-t border-neutral-200">
                                <p className="text-xs text-neutral-61">
                                    Showing {filteredRecipes.length} of {allRecipes.length} recipes
                                </p>
                            </div>
                        </FilterPanel>
                    </div>

                    {/* Table - below filters on small/medium, left on large */}
                    <div className="flex-1 overflow-x-auto order-2 lg:order-1">
                        <DataTable
                            data={getPaginatedRecipes()}
                            columns={columns}
                            loading={loading.recipes}
                            onRowClick={(recipe) => {
                                setSelectedRecipe(recipe);
                                setShowRecipeDetails(true);
                            }}
                            actions={(recipe) => {
                                const canRegenerate = permissions.can_regenerate_images === true;
                                const canDelete = permissions.can_delete_recipes === true;

                                return (
                                    <div className="flex items-center gap-0.5 md:gap-1">
                                        {canRegenerate && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedRecipe(recipe);
                                                    setShowRegenerateModal(true);
                                                }}
                                                title="Regenerate image"
                                                className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                            >
                                                <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedRecipe(recipe);
                                                    setShowDeleteModal(true);
                                                }}
                                                title="Delete recipe"
                                                className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

            {/* Delete Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setSelectedRecipe(null);
                }}
                title="Delete Recipe"
                footer={
                    <>
                        <button
                            onClick={() => {
                                setShowDeleteModal(false);
                                setSelectedRecipe(null);
                            }}
                            className="px-4 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-61"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                        >
                            Delete Recipe
                        </button>
                    </>
                }
            >
                <p className="text-neutral-61">
                    Are you sure you want to delete <strong>{selectedRecipe?.title}</strong>? This
                    action cannot be undone.
                </p>
            </Modal>

            {/* Regenerate Image Modal */}
            <Modal
                isOpen={showRegenerateModal}
                onClose={() => {
                    setShowRegenerateModal(false);
                    setSelectedRecipe(null);
                    setRegenerating(false);
                }}
                title="Regenerate Recipe Image"
                footer={
                    <>
                        <button
                            onClick={() => {
                                setShowRegenerateModal(false);
                                setSelectedRecipe(null);
                                setRegenerating(false);
                            }}
                            disabled={regenerating}
                            className="px-4 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-61 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleRegenerateImage}
                            disabled={regenerating}
                            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                        >
                            {regenerating ? 'Regenerating...' : 'Regenerate Image'}
                        </button>
                    </>
                }
            >
                <p className="text-neutral-61">
                    Regenerate the image for <strong>{selectedRecipe?.title}</strong> using the AI
                    image generation API?
                </p>
            </Modal>
        </AdminLayout>
    );
}