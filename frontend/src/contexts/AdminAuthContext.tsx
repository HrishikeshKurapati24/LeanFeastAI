import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { checkAdminStatus } from '../utils/adminAuth';
import { useAppDispatch } from '../store/hooks';
import { clearAllAdminData } from '../store/actions/adminActions';
import { clearSessionMode, setSessionMode } from '../utils/sessionMode';

interface AdminAuthContextType {
    isAdmin: boolean;
    assignedSections: string[];
    permissions: Record<string, boolean>;
    loading: boolean;
    checkAdmin: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const dispatch = useAppDispatch();
    const [isAdmin, setIsAdmin] = useState(false);
    const [assignedSections, setAssignedSections] = useState<string[]>([]);
    const [permissions, setPermissions] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const checkAdmin = useCallback(async () => {
        if (!user) {
            // Clear admin data when user logs out
            dispatch(clearAllAdminData());
            setIsAdmin(false);
            setAssignedSections([]);
            setPermissions({});
            setLoading(false);
            clearSessionMode();
            return;
        }

        try {
            setLoading(true);
            const adminStatus = await checkAdminStatus();
            
            setIsAdmin(adminStatus.isAdmin);
            const sections = adminStatus.assignedSections || [];
            const perms = adminStatus.permissions || {};
            setAssignedSections(sections);
            setPermissions(perms);
            if (adminStatus.isAdmin) {
                setSessionMode('admin');
            } else {
                clearSessionMode();
            }
            
            // Don't redirect here - let AdminRoute handle it
        } catch (error) {
            console.error('[DEBUG] AdminAuthContext: Error checking admin status:', error);
            setIsAdmin(false);
            setAssignedSections([]);
            setPermissions({});
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading) {
            checkAdmin();
        }
    }, [authLoading, checkAdmin]);

    return (
        <AdminAuthContext.Provider value={{ isAdmin, assignedSections, permissions, loading, checkAdmin }}>
            {children}
        </AdminAuthContext.Provider>
    );
}

export function useAdminAuth() {
    const context = useContext(AdminAuthContext);
    if (context === undefined) {
        throw new Error('useAdminAuth must be used within an AdminAuthProvider');
    }
    return context;
}

