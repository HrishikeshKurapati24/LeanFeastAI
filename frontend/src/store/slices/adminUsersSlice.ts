import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { fetchAllUsers, fetchUserAnalytics } from '../thunks/adminThunks';
import type { User, UserAnalytics } from '../types';

// Re-export types for convenience
export type { User, UserAnalytics };

interface AdminUsersState {
    users: User[];
    analytics: UserAnalytics | null;
    loading: {
        users: boolean;
        analytics: boolean;
    };
    error: string | null;
}

const initialState: AdminUsersState = {
    users: [],
    analytics: null,
    loading: {
        users: false,
        analytics: false,
    },
    error: null,
};

const adminUsersSlice = createSlice({
    name: 'adminUsers',
    initialState,
    reducers: {
        setUsersLoading: (state, action: PayloadAction<boolean>) => {
            state.loading.users = action.payload;
        },
        setAnalyticsLoading: (state, action: PayloadAction<boolean>) => {
            state.loading.analytics = action.payload;
        },
        setUsers: (state, action: PayloadAction<User[]>) => {
            state.users = action.payload;
            state.loading.users = false;
            state.error = null;
        },
        setAnalytics: (state, action: PayloadAction<UserAnalytics>) => {
            state.analytics = action.payload;
            state.loading.analytics = false;
            state.error = null;
        },
        addUser: (state, action: PayloadAction<User>) => {
            // Check if user already exists (avoid duplicates)
            const exists = state.users.some(u => u.user_id === action.payload.user_id);
            if (!exists) {
                state.users.unshift(action.payload); // Add to beginning
                if (state.analytics) {
                    const status = action.payload.status;
                    state.analytics = {
                        ...state.analytics,
                        total_users: (state.analytics.total_users || 0) + 1,
                        active_users: state.analytics.active_users + (status === 'user' ? 1 : 0),
                        suspended_users: state.analytics.suspended_users + (status === 'suspended' ? 1 : 0),
                        deleted_users: (state.analytics.deleted_users || 0) + (status === 'deleted' ? 1 : 0),
                        unverified_users: (state.analytics.unverified_users || 0) + (status === 'unverified' ? 1 : 0),
                    };
                }
            }
        },
        updateUser: (state, action: PayloadAction<Partial<User> & { user_id: string }>) => {
            const index = state.users.findIndex(u => u.user_id === action.payload.user_id);
            if (index !== -1) {
                const prev = state.users[index];
                const next = { ...state.users[index], ...action.payload };
                state.users[index] = next;

                // Adjust analytics if status changed
                if (state.analytics && prev.status !== next.status) {
                    const dec = (status?: string) => {
                        if (!status) return;
                        if (status === 'user') state.analytics!.active_users = Math.max(0, state.analytics!.active_users - 1);
                        if (status === 'suspended') state.analytics!.suspended_users = Math.max(0, state.analytics!.suspended_users - 1);
                        if (status === 'deleted') state.analytics!.deleted_users = Math.max(0, (state.analytics!.deleted_users || 0) - 1);
                        if (status === 'unverified') state.analytics!.unverified_users = Math.max(0, (state.analytics!.unverified_users || 0) - 1);
                    };
                    const inc = (status?: string) => {
                        if (!status) return;
                        if (status === 'user') state.analytics!.active_users += 1;
                        if (status === 'suspended') state.analytics!.suspended_users += 1;
                        if (status === 'deleted') state.analytics!.deleted_users = (state.analytics!.deleted_users || 0) + 1;
                        if (status === 'unverified') state.analytics!.unverified_users = (state.analytics!.unverified_users || 0) + 1;
                    };
                    dec(prev.status);
                    inc(next.status);
                    // total_users stays the same on status change
                }
            }
        },
        removeUser: (state, action: PayloadAction<string>) => {
            const toRemove = state.users.find(u => u.user_id === action.payload);
            state.users = state.users.filter(u => u.user_id !== action.payload);
            if (toRemove && state.analytics) {
                const status = toRemove.status;
                const decStatus = (s?: string) => {
                    if (!s) return;
                    if (s === 'user') state.analytics!.active_users = Math.max(0, state.analytics!.active_users - 1);
                    if (s === 'suspended') state.analytics!.suspended_users = Math.max(0, state.analytics!.suspended_users - 1);
                    if (s === 'deleted') state.analytics!.deleted_users = Math.max(0, (state.analytics!.deleted_users || 0) - 1);
                    if (s === 'unverified') state.analytics!.unverified_users = Math.max(0, (state.analytics!.unverified_users || 0) - 1);
                };
                decStatus(status);
                state.analytics = {
                    ...state.analytics,
                    total_users: Math.max(0, (state.analytics.total_users || 0) - 1),
                };
            }
        },
        updateAnalytics: (state, action: PayloadAction<Partial<UserAnalytics>>) => {
            if (state.analytics) {
                state.analytics = { ...state.analytics, ...action.payload };
            }
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
            state.loading.users = false;
            state.loading.analytics = false;
        },
        resetState: () => initialState,
    },
    extraReducers: (builder) => {
        // Fetch all users
        builder
            .addCase(fetchAllUsers.pending, (state) => {
                state.loading.users = true;
                state.error = null;
            })
            .addCase(fetchAllUsers.fulfilled, (state, action) => {
                state.users = action.payload;
                state.loading.users = false;
                state.error = null;
            })
            .addCase(fetchAllUsers.rejected, (state, action) => {
                state.loading.users = false;
                state.error = action.payload as string;
            });

        // Fetch user analytics
        builder
            .addCase(fetchUserAnalytics.pending, (state) => {
                state.loading.analytics = true;
                state.error = null;
            })
            .addCase(fetchUserAnalytics.fulfilled, (state, action) => {
                state.analytics = action.payload;
                state.loading.analytics = false;
                state.error = null;
            })
            .addCase(fetchUserAnalytics.rejected, (state, action) => {
                state.loading.analytics = false;
                state.error = action.payload as string;
            });
    },
});

export const {
    setUsersLoading,
    setAnalyticsLoading,
    setUsers,
    setAnalytics,
    addUser,
    updateUser,
    removeUser,
    updateAnalytics,
    setError,
    resetState: resetUsersState,
} = adminUsersSlice.actions;

export default adminUsersSlice.reducer;

