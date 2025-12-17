const KEY = 'lf_session_mode'; // per-tab via sessionStorage

export type SessionMode = 'admin' | 'user';

export const setSessionMode = (mode: SessionMode) => {
    sessionStorage.setItem(KEY, mode);
};

export const getSessionMode = (): SessionMode | null => {
    const value = sessionStorage.getItem(KEY);
    return value === 'admin' || value === 'user' ? value : null;
};

export const clearSessionMode = () => {
    sessionStorage.removeItem(KEY);
};

