import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import DataTable from '../../components/admin/DataTable';
import FilterPanel from '../../components/admin/FilterPanel';
import StatusBadge from '../../components/admin/StatusBadge';
import Modal from '../../components/admin/Modal';
import AnalyticsChart from '../../components/admin/AnalyticsChart';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { updateUser, removeUser, addUser } from '../../store/slices/adminUsersSlice';
import { fetchAllUsers, fetchUserAnalytics } from '../../store/thunks/adminThunks';
import { useSupabaseRealtime } from '../../hooks/useSupabaseRealtime';
import {
    adminUpdateUser,
    adminSuspendUser,
    adminReactivateUser,
    adminDeleteUser,
} from '../../utils/adminApi';
import {
    BarChart,
    Bar,
    Tooltip,
    ResponsiveContainer,
    XAxis,
    YAxis,
    CartesianGrid,
    Cell,
} from 'recharts';

interface User {
    id: string;
    user_id: string;
    email: string;
    full_name: string;
    status: string;
    created_at: string;
    last_login: string | null;
    email_confirmed_at?: string | null;
    recipes_count: number;
    profile: any;
}

export default function Users() {
    const { assignedSections, permissions } = useAdminAuth();
    const hasUsersAccess = assignedSections.includes('users');
    const dispatch = useAppDispatch();

    // Get data from Redux store
    const allUsers = useAppSelector((state) => state.adminUsers.users);
    const analytics = useAppSelector((state) => state.adminUsers.analytics);
    const loading = useAppSelector((state) => state.adminUsers.loading);

    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showUserDetails, setShowUserDetails] = useState(false);
    const [showSuspendModal, setShowSuspendModal] = useState(false);
    const [showReactivateModal, setShowReactivateModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [suspensionReason, setSuspensionReason] = useState('');
    const [deleteReason, setDeleteReason] = useState('');
    const [editFormData, setEditFormData] = useState({
        full_name: '',
        bio: '',
        dietary_preferences: [] as string[],
        goals: [] as string[],
        allergies: [] as string[],
    });
    const [editLoading, setEditLoading] = useState(false);
    const [suspendLoading, setSuspendLoading] = useState(false);
    const [reactivateLoading, setReactivateLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState({
        search: '',
        status: '',
    });

    // Apply filters using useMemo for performance
    const filteredUsers = useMemo(() => {
        let filtered = [...allUsers];

        // Apply search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(
                (user) =>
                    user.email?.toLowerCase().includes(searchLower) ||
                    user.full_name?.toLowerCase().includes(searchLower)
            );
        }

        // Apply status filter
        if (filters.status) {
            if (filters.status === 'active') {
                filtered = filtered.filter((user) => user.status === 'user');
            } else if (filters.status === 'suspended') {
                filtered = filtered.filter((user) => user.status === 'suspended');
            } else if (filters.status === 'inactive') {
                // Inactive: no login in last 30 days
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                filtered = filtered.filter((user) => {
                    if (user.status !== 'user') return false;
                    if (!user.last_login) return true;
                    const lastLogin = new Date(user.last_login);
                    return lastLogin < thirtyDaysAgo;
                });
            } else {
                // Direct status match: 'user', 'suspended', 'deleted', 'unverified'
                filtered = filtered.filter((user) => user.status === filters.status);
            }
        }

        return filtered;
    }, [allUsers, filters]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [filters]);

    // On hard refresh, fetch data if missing
    useEffect(() => {
        if (hasUsersAccess) {
            if (!loading.users && allUsers.length === 0) {
                dispatch(fetchAllUsers());
            }
            if (!loading.analytics && !analytics) {
                dispatch(fetchUserAnalytics({}));
            }
        }
    }, [hasUsersAccess, loading.users, loading.analytics, allUsers.length, analytics, dispatch]);

    // Setup WebSocket connection for real-time updates
    useSupabaseRealtime('users');

    const getPaginatedUsers = () => {
        const startIndex = (page - 1) * 20;
        const endIndex = startIndex + 20;
        return filteredUsers.slice(startIndex, endIndex);
    };


    const handleSuspend = async () => {
        if (!selectedUser || !suspensionReason.trim()) return;

        // Store previous state for rollback
        const previousUser = { ...selectedUser };

        try {
            setSuspendLoading(true);
            // Optimistically update Redux store
            dispatch(updateUser({ user_id: selectedUser.user_id, status: 'suspended' }));
            setShowSuspendModal(false);
            setSuspensionReason('');
            setSelectedUser(null);
            await adminSuspendUser(selectedUser.user_id, suspensionReason);
            // Analytics will be updated via WebSocket
        } catch (error) {
            console.error('Error suspending user:', error);
            // Revert optimistic update on error
            dispatch(updateUser({
                user_id: previousUser.user_id,
                status: previousUser.status,
            }));
            // Re-open modal and restore state
            setSelectedUser(previousUser);
            setSuspensionReason('');
            setShowSuspendModal(true);
            alert(error instanceof Error ? error.message : 'Failed to suspend user');
        } finally {
            setSuspendLoading(false);
        }
    };

    const handleReactivate = async () => {
        if (!selectedUser) return;

        // Store previous state for rollback
        const previousUser = { ...selectedUser };

        try {
            setReactivateLoading(true);
            // Optimistically update Redux store
            dispatch(updateUser({ user_id: selectedUser.user_id, status: 'user' }));
            setShowReactivateModal(false);
            setSelectedUser(null);
            await adminReactivateUser(selectedUser.user_id);

            // Analytics will be updated via WebSocket
        } catch (error) {
            console.error('Error reactivating user:', error);
            // Revert optimistic update on error
            dispatch(updateUser({
                user_id: previousUser.user_id,
                status: previousUser.status,
            }));
            // Re-open modal and restore state
            setSelectedUser(previousUser);
            setShowReactivateModal(true);
            alert(error instanceof Error ? error.message : 'Failed to reactivate user');
        } finally {
            setReactivateLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedUser) return;

        if (!deleteReason.trim()) {
            alert('Please provide a reason for deletion');
            return;
        }

        // Store previous user for rollback (we'll need to re-add it if deletion fails)
        const previousUser = { ...selectedUser };
        const deleteReasonValue = deleteReason.trim();

        try {
            setDeleteLoading(true);
            // Optimistically update Redux store
            dispatch(removeUser(selectedUser.user_id));
            setShowDeleteModal(false);
            setSelectedUser(null);
            setDeleteReason('');
            await adminDeleteUser(selectedUser.user_id, deleteReasonValue);
            // Analytics will be updated via WebSocket
        } catch (error) {
            console.error('Error deleting user:', error);
            // Revert optimistic update on error - re-add the user
            dispatch(addUser(previousUser));
            // Re-open modal and restore state
            setSelectedUser(previousUser);
            setDeleteReason(deleteReasonValue);
            setShowDeleteModal(true);
            alert(error instanceof Error ? error.message : 'Failed to delete user');
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleEditSubmit = async () => {
        if (!selectedUser || !editFormData.full_name?.trim()) return;

        // Store previous state for rollback
        const previousUser = { ...selectedUser };
        const previousEditFormData = { ...editFormData };

        try {
            setEditLoading(true);
            // Optimistically update Redux store
            // Structure the update to match User interface: full_name at top level, others in profile
            dispatch(updateUser({
                user_id: selectedUser.user_id,
                full_name: editFormData.full_name,
                profile: {
                    ...selectedUser.profile,
                    bio: editFormData.bio,
                    dietary_preferences: editFormData.dietary_preferences,
                    goals: editFormData.goals,
                    allergies: editFormData.allergies,
                },
            }));
            await adminUpdateUser(selectedUser.user_id, editFormData);
            setShowEditModal(false);
            setSelectedUser(null);
            setEditFormData({
                full_name: '',
                bio: '',
                dietary_preferences: [],
                goals: [],
                allergies: [],
            });
            alert('User updated successfully!');
        } catch (error) {
            console.error('Error updating user:', error);
            // Revert optimistic update on error
            dispatch(updateUser({
                user_id: previousUser.user_id,
                full_name: previousUser.full_name,
                profile: previousUser.profile,
            }));
            // Re-open modal and restore state
            setSelectedUser(previousUser);
            setEditFormData(previousEditFormData);
            setShowEditModal(true);
            alert(error instanceof Error ? error.message : 'Failed to update user');
        } finally {
            setEditLoading(false);
        }
    };

    const columns = [
        {
            key: 'email',
            header: 'Email',
            render: (user: User) => (
                <div className="min-w-0 max-w-full">
                    <div
                        className="font-medium text-neutral-42 text-xs md:text-sm truncate max-w-full md:whitespace-normal md:overflow-visible"
                        title={user.email}
                    >
                        {user.email}
                    </div>
                    {user.full_name && (
                        <div
                            className="text-xs text-neutral-61 hidden sm:block truncate max-w-full"
                            title={user.full_name}
                        >
                            {user.full_name}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (user: User) => <StatusBadge status={user.status} />,
        },
        {
            key: 'recipes_count',
            header: 'Recipes',
            render: (user: User) => <span>{user.recipes_count || 0}</span>,
            hiddenOnMobile: true,
        },
        {
            key: 'created_at',
            header: 'Joined',
            render: (user: User) => (
                <span className="text-xs">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </span>
            ),
            hiddenOnMobile: true,
        },
        {
            key: 'last_login',
            header: 'Last Sign In',
            render: (user: User) => (
                <span className="text-xs">
                    {user.last_login === 'Waiting for verification' ? (
                        <span className="text-amber-600 font-medium">Waiting for verification</span>
                    ) : user.last_login ? (
                        new Date(user.last_login).toLocaleDateString()
                    ) : (
                        'Never'
                    )}
                </span>
            ),
            hiddenOnMobile: true,
        },
    ];

    const chartData = analytics
        ? [
            { name: 'Active', value: analytics.active_users, color: '#22c55e' },
            { name: 'Inactive', value: analytics.inactive_users, color: '#60a5fa' },
            { name: 'Suspended', value: analytics.suspended_users, color: '#f97316' },
            { name: 'Deleted', value: analytics.deleted_users || 0, color: '#ef4444' },
            { name: 'Unverified', value: analytics.unverified_users || 0, color: '#eab308' },
        ]
        : [];

    return (
        <AdminLayout>
            <div className="space-y-3 md:space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-lg md:text-3xl font-bold text-primary mb-0.5 md:mb-2">Users & Analytics</h1>
                    <p className="text-xs md:text-base text-neutral-61">Manage users and view analytics</p>
                </div>

                {/* Analytics Section */}
                {hasUsersAccess ? (
                    loading.analytics ? (
                        <div className="rounded-xl p-3 bg-white/85 backdrop-blur-sm border border-white/30">
                            <div className="animate-pulse space-y-4">
                                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                <div className="h-32 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    ) : analytics ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 items-start">
                            <AnalyticsChart title="User Distribution" height={170}>
                                <div className="w-full">
                                    <ResponsiveContainer width="100%" height="100%" minHeight={170}>
                                        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                                            <Tooltip
                                                formatter={(value, name) => [value ?? 0, name ?? '']}
                                                contentStyle={{ fontSize: '12px', padding: '8px' }}
                                            />
                                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                {chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </AnalyticsChart>

                            {/* Single Stats Card for Medium/Large Screens */}
                            <div
                                className="rounded-lg md:rounded-xl p-2 md:p-3"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.85)',
                                    backdropFilter: 'blur(20px) saturate(180%)',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    boxShadow: '0 4px 16px rgba(34, 197, 94, 0.1)',
                                }}
                            >
                                <h3 className="text-xs md:text-sm font-medium text-neutral-61 mb-1.5 md:mb-4">User Statistics</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-4">
                                    <div>
                                        <p className="text-xs font-medium text-neutral-61 mb-0.5">Total Users</p>
                                        <p className="text-base md:text-2xl font-bold text-primary">{analytics.total_users}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-neutral-61 mb-0.5">Active</p>
                                        <p className="text-base md:text-2xl font-bold text-green-600">{analytics.active_users}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-neutral-61 mb-0.5">Suspended</p>
                                        <p className="text-base md:text-2xl font-bold text-red-600">{analytics.suspended_users}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-neutral-61 mb-0.5">Unverified</p>
                                        <p className="text-base md:text-2xl font-bold text-amber-500">{analytics.unverified_users || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null
                ) : (
                    <div
                        className="rounded-xl p-2 md:p-6"
                        style={{
                            background: 'rgba(255, 255, 255, 0.85)',
                            backdropFilter: 'blur(20px) saturate(180%)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            boxShadow: '0 4px 16px rgba(251, 191, 36, 0.1)',
                        }}
                    >
                        <p className="text-xs md:text-sm text-neutral-61">
                            You don't have access to view user analytics. Please contact your administrator.
                        </p>
                    </div>
                )}

                {/* Filters and Table */}
                <div className="flex flex-col lg:flex-row gap-2 md:gap-6">
                    {/* Filter Panel - Top on small/medium, right on large */}
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
                                    placeholder="Email or name..."
                                    className="w-full px-1.5 py-0.5 md:px-3 md:py-2 rounded-md md:rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary text-xs md:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-neutral-42 mb-0.5 md:mb-2">
                                    Status
                                </label>
                                <select
                                    value={filters.status}
                                    onChange={(e) =>
                                        setFilters({ ...filters, status: e.target.value })
                                    }
                                    className="w-full px-1.5 py-0.5 md:px-3 md:py-2 rounded-md md:rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary text-xs md:text-sm"
                                >
                                    <option value="">All</option>
                                    <option value="active">Active</option>
                                    <option value="suspended">Suspended</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="deleted">Deleted</option>
                                    <option value="unverified">Unverified</option>
                                </select>
                            </div>
                            <button
                                onClick={() => setFilters({ search: '', status: '' })}
                                className="w-full px-1.5 py-0.5 md:px-4 md:py-2 rounded-md md:rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-61 text-xs md:text-sm font-medium transition-colors"
                            >
                                Clear Filters
                            </button>
                            <div className="mt-1.5 md:mt-4 pt-1.5 md:pt-4 border-t border-neutral-200">
                                <p className="text-xs text-neutral-61">
                                    Showing {filteredUsers.length} of {allUsers.length} users
                                </p>
                            </div>
                        </FilterPanel>
                    </div>

                    {/* Table - Centered */}
                    <div className="w-full max-w-full lg:max-w-none overflow-x-auto md:overflow-visible order-2 lg:order-1">
                        <DataTable
                            data={getPaginatedUsers()}
                            columns={columns}
                            loading={loading.users}
                            onRowClick={(user) => {
                                // Don't open details modal for deleted users
                                if (user.status === 'deleted') return;
                                setSelectedUser(user);
                                setShowUserDetails(true);
                            }}
                            actions={(user) => {
                                const canEdit = permissions.can_edit_users === true;
                                const canSuspend = permissions.can_suspend_users === true;
                                const canDelete = permissions.can_delete_users === true;
                                const isUnverifiedOrDeleted = user.status === 'unverified' || user.status === 'deleted';
                                const isDeleted = user.status === 'deleted';

                                return (
                                    <div className="flex items-center gap-0.5 md:gap-1">
                                        {canEdit && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isDeleted) return;
                                                    setSelectedUser(user);
                                                    setEditFormData({
                                                        full_name: user.full_name || '',
                                                        bio: user.profile?.bio || '',
                                                        dietary_preferences: user.profile?.dietary_preferences || [],
                                                        goals: user.profile?.goals || [],
                                                        allergies: user.profile?.allergies || [],
                                                    });
                                                    setShowEditModal(true);
                                                }}
                                                disabled={isDeleted}
                                                title={isDeleted ? 'Cannot edit deleted users' : 'Edit user'}
                                                className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                        )}
                                        {canSuspend && (
                                            user.status === 'suspended' ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (isDeleted) return;
                                                        setSelectedUser(user);
                                                        setShowReactivateModal(true);
                                                    }}
                                                    disabled={isDeleted}
                                                    title={isDeleted ? 'Cannot reactivate deleted users' : 'Reactivate user'}
                                                    className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-lg text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                    </svg>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (isDeleted) return;
                                                        setSelectedUser(user);
                                                        setShowSuspendModal(true);
                                                    }}
                                                    disabled={isUnverifiedOrDeleted}
                                                    title={isDeleted ? 'Cannot suspend deleted users' : isUnverifiedOrDeleted ? 'Cannot suspend unverified users' : 'Suspend user'}
                                                    className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-lg text-yellow-600 hover:bg-yellow-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </button>
                                            )
                                        )}
                                        {canDelete && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isDeleted) return;
                                                    setSelectedUser(user);
                                                    setShowDeleteModal(true);
                                                }}
                                                disabled={isDeleted}
                                                title={isDeleted ? 'User already deleted' : 'Delete user'}
                                                className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                        {filteredUsers.length > 20 && (
                            <div className="flex items-center justify-between mt-2 md:mt-4">
                                <button
                                    onClick={() => setPage(page - 1)}
                                    disabled={page === 1}
                                    className="px-2 py-1 md:px-4 md:py-2 rounded-lg bg-white border border-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm"
                                >
                                    Previous
                                </button>
                                <span className="text-xs md:text-sm text-neutral-61">
                                    Page {page} of {Math.ceil(filteredUsers.length / 20)} ({filteredUsers.length} users)
                                </span>
                                <button
                                    onClick={() => setPage(page + 1)}
                                    disabled={page >= Math.ceil(filteredUsers.length / 20)}
                                    className="px-2 py-1 md:px-4 md:py-2 rounded-lg bg-white border border-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Suspend Modal */}
            <Modal
                isOpen={showSuspendModal}
                onClose={() => {
                    setShowSuspendModal(false);
                    setSuspensionReason('');
                    setSelectedUser(null);
                }}
                title="Suspend User"
                footer={
                    <>
                        <button
                            onClick={() => {
                                setShowSuspendModal(false);
                                setSuspensionReason('');
                                setSelectedUser(null);
                            }}
                            className="px-4 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-61"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSuspend}
                            disabled={!suspensionReason.trim() || suspendLoading || (selectedUser ? (selectedUser.status === 'unverified' || selectedUser.status === 'deleted') : false)}
                            className="px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            title={selectedUser && (selectedUser.status === 'unverified' || selectedUser.status === 'deleted') ? 'Cannot suspend unverified or deleted users' : ''}
                        >
                            {suspendLoading ? 'Suspending...' : 'Suspend User'}
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    <p className="text-neutral-61">
                        Are you sure you want to suspend{' '}
                        <strong>{selectedUser?.email}</strong>?
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-neutral-42 mb-2">
                            Reason (required)
                        </label>
                        <textarea
                            value={suspensionReason}
                            onChange={(e) => setSuspensionReason(e.target.value)}
                            placeholder="Enter reason for suspension..."
                            rows={4}
                            className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>
            </Modal>

            {/* Reactivate Modal */}
            <Modal
                isOpen={showReactivateModal}
                onClose={() => {
                    setShowReactivateModal(false);
                    setSelectedUser(null);
                }}
                title="Reactivate User"
                footer={
                    <>
                        <button
                            onClick={() => {
                                setShowReactivateModal(false);
                                setSelectedUser(null);
                            }}
                            className="px-4 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-61"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleReactivate}
                            disabled={reactivateLoading}
                            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {reactivateLoading ? 'Reactivating...' : 'Reactivate User'}
                        </button>
                    </>
                }
            >
                <p className="text-neutral-61">
                    Are you sure you want to reactivate{' '}
                    <strong>{selectedUser?.email}</strong>? The user will be able to access the
                    website again.
                </p>
            </Modal>

            {/* Delete Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setSelectedUser(null);
                    setDeleteReason('');
                }}
                title="Delete User"
                footer={
                    <>
                        <button
                            onClick={() => {
                                setShowDeleteModal(false);
                                setSelectedUser(null);
                                setDeleteReason('');
                            }}
                            className="px-4 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-61"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={!deleteReason.trim() || deleteLoading}
                            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {deleteLoading ? 'Deleting...' : 'Delete User'}
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    <p className="text-neutral-61">
                        Are you sure you want to delete{' '}
                        <strong>{selectedUser?.email}</strong>? This will anonymize the user account
                        and cannot be undone.
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-neutral-42 mb-2">
                            Reason (required)
                        </label>
                        <textarea
                            value={deleteReason}
                            onChange={(e) => setDeleteReason(e.target.value)}
                            placeholder="Enter reason for deletion..."
                            rows={4}
                            className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>
            </Modal>

            {/* User Details Modal */}
            <Modal
                isOpen={showUserDetails}
                onClose={() => {
                    setShowUserDetails(false);
                    setSelectedUser(null);
                }}
                title="User Details"
                size="lg"
            >
                {selectedUser && (
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-neutral-42">Email</label>
                            <p className="text-neutral-61">{selectedUser.email}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-neutral-42">Full Name</label>
                            <p className="text-neutral-61">{selectedUser.full_name || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-neutral-42">Status</label>
                            <div className="mt-1">
                                <StatusBadge status={selectedUser.status} />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-neutral-42">Recipes Created</label>
                            <p className="text-neutral-61">{selectedUser.recipes_count || 0}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-neutral-42">Joined</label>
                            <p className="text-neutral-61">
                                {new Date(selectedUser.created_at).toLocaleDateString()}
                            </p>
                        </div>
                        {selectedUser.last_login && (
                            <div>
                                <label className="text-sm font-medium text-neutral-42">Last Login</label>
                                <p className="text-neutral-61">
                                    {new Date(selectedUser.last_login).toLocaleDateString()}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                    setEditFormData({
                        full_name: '',
                        bio: '',
                        dietary_preferences: [],
                        goals: [],
                        allergies: [],
                    });
                }}
                title="Edit User"
                size="lg"
                footer={
                    <>
                        <button
                            onClick={() => {
                                setShowEditModal(false);
                                setSelectedUser(null);
                                setEditFormData({
                                    full_name: '',
                                    bio: '',
                                    dietary_preferences: [],
                                    goals: [],
                                    allergies: [],
                                });
                            }}
                            className="px-4 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-61"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleEditSubmit}
                            disabled={!editFormData.full_name?.trim() || editLoading}
                            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                        >
                            {editLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </>
                }
            >
                {selectedUser && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-42 mb-2">
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={editFormData.full_name}
                                onChange={(e) =>
                                    setEditFormData({ ...editFormData, full_name: e.target.value })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Enter full name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-42 mb-2">
                                Bio
                            </label>
                            <textarea
                                value={editFormData.bio}
                                onChange={(e) =>
                                    setEditFormData({ ...editFormData, bio: e.target.value })
                                }
                                rows={4}
                                className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Enter bio"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-42 mb-2">
                                Dietary Preferences
                            </label>
                            <input
                                type="text"
                                value={editFormData.dietary_preferences.join(', ')}
                                onChange={(e) =>
                                    setEditFormData({
                                        ...editFormData,
                                        dietary_preferences: e.target.value
                                            .split(',')
                                            .map((s) => s.trim())
                                            .filter((s) => s.length > 0),
                                    })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="e.g., vegetarian, vegan, gluten-free (comma-separated)"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-42 mb-2">
                                Goals
                            </label>
                            <input
                                type="text"
                                value={editFormData.goals.join(', ')}
                                onChange={(e) =>
                                    setEditFormData({
                                        ...editFormData,
                                        goals: e.target.value
                                            .split(',')
                                            .map((s) => s.trim())
                                            .filter((s) => s.length > 0),
                                    })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="e.g., weight loss, muscle gain, healthy eating (comma-separated)"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-42 mb-2">
                                Allergies
                            </label>
                            <input
                                type="text"
                                value={editFormData.allergies.join(', ')}
                                onChange={(e) =>
                                    setEditFormData({
                                        ...editFormData,
                                        allergies: e.target.value
                                            .split(',')
                                            .map((s) => s.trim())
                                            .filter((s) => s.length > 0),
                                    })
                                }
                                className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="e.g., peanuts, dairy, shellfish (comma-separated)"
                            />
                        </div>
                    </div>
                )}
            </Modal>
        </AdminLayout>
    );
}

