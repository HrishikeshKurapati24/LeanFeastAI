import { createSlice, createEntityAdapter, type PayloadAction, type EntityState } from '@reduxjs/toolkit';
import type { Profile } from '../../types/profileTypes';

const profileAdapter = createEntityAdapter<Profile, string>({
    selectId: (profile) => profile.user_id,
});

interface UserProfileMeta {
    loaded: boolean;
    isLoading: boolean;
    error: string | null;
}

interface UserProfileState extends EntityState<Profile, string> {
    meta: UserProfileMeta;
}

const initialState: UserProfileState = profileAdapter.getInitialState({
    meta: {
        loaded: false,
        isLoading: false,
        error: null,
    },
});

const userProfileSlice = createSlice({
    name: 'userProfile',
    initialState,
    reducers: {
        setProfile: (state, action: PayloadAction<Profile>) => {
            profileAdapter.setOne(state, action.payload);
            state.meta.loaded = true;
            state.meta.isLoading = false;
            state.meta.error = null;
        },
        updateProfile: (state, action: PayloadAction<Partial<Profile> & { user_id: string }>) => {
            profileAdapter.updateOne(state, {
                id: action.payload.user_id,
                changes: action.payload,
            });
        },
        clearProfile: (state) => {
            profileAdapter.removeAll(state);
            state.meta.loaded = false;
            state.meta.isLoading = false;
            state.meta.error = null;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.meta.isLoading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.meta.error = action.payload;
            state.meta.isLoading = false;
        },
    },
});

export const { setProfile, updateProfile, clearProfile, setLoading, setError } = userProfileSlice.actions;
export default userProfileSlice.reducer;


