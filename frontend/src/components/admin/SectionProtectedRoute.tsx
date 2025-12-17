import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

interface SectionProtectedRouteProps {
    children: ReactNode;
    requiredSection: 'users' | 'recipes' | 'community';
}

export default function SectionProtectedRoute({ children, requiredSection }: SectionProtectedRouteProps) {
    const { assignedSections, loading } = useAdminAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center"
                style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #ffffff 100%)',
                }}
            >
                <div className="text-center">
                    <div className="text-5xl mb-4 animate-pulse">🔐</div>
                    <p className="text-lg text-neutral-61">Checking access...</p>
                </div>
            </div>
        );
    }

    // Check if user has access to this section
    const hasAccess = Array.isArray(assignedSections) && assignedSections.includes(requiredSection);
    
    if (!hasAccess) {
        // Redirect to first available section
        const sectionOrder = ['users', 'recipes', 'community'];
        const firstAvailableSection = sectionOrder.find(section => 
            assignedSections.includes(section)
        );
        
        if (firstAvailableSection) {
            return <Navigate to={`/admin/${firstAvailableSection}`} replace />;
        }
        
        // If no sections available, show a message
        return (
            <div className="min-h-screen flex items-center justify-center"
                style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #ffffff 100%)',
                }}
            >
                <div className="text-center">
                    <p className="text-lg text-neutral-61">You don't have access to this section. Please contact your administrator.</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

