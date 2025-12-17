import { createSlice } from '@reduxjs/toolkit';

// This slice can be used for cross-cutting analytics concerns if needed
// Currently, analytics are stored in their respective slices (users, recipes, community)

interface AdminAnalyticsState {
    // Reserved for future cross-cutting analytics
}

const initialState: AdminAnalyticsState = {};

const adminAnalyticsSlice = createSlice({
    name: 'adminAnalytics',
    initialState,
    reducers: {
        // Reserved for future use
        resetState: () => initialState,
    },
});

export const {
    resetState: resetAnalyticsState,
} = adminAnalyticsSlice.actions;

export default adminAnalyticsSlice.reducer;

