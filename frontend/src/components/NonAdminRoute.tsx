import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getSessionMode } from '../utils/sessionMode';

export default function NonAdminRoute({ children }: { children: ReactNode }) {
    const mode = getSessionMode();

    if (mode === 'admin') {
        return <Navigate to="/admin/users" replace />;
    }

    return <>{children}</>;
}

