import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useAuth } from '../../contexts/AuthContext';

interface AdminRouteProps {
    children: ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
    const { isAdmin, loading } = useAdminAuth();
    const { user } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center"
                style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #ffffff 100%)',
                }}
            >
                <div className="text-center">
                    <div className="text-5xl mb-4 animate-pulse">🔐</div>
                    <p className="text-lg text-neutral-61">Checking admin access...</p>
                </div>
            </div>
        );
    }

    // If not logged in, redirect to admin login
    if (!user) {
        return <Navigate to="/admin/login" replace />;
    }

    // If logged in but not admin, redirect to admin login
    if (!isAdmin) {
        return <Navigate to="/admin/login" replace />;
    }

    return <>{children}</>;
}

