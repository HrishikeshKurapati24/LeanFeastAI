import { ReactNode, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

interface AdminLayoutProps {
    children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    // Determine current page from pathname
    let currentPage: 'users' | 'recipes' | 'community' = 'users';
    if (location.pathname.includes('/recipes')) {
        currentPage = 'recipes';
    } else if (location.pathname.includes('/community')) {
        currentPage = 'community';
    }

    return (
        <div
            className="min-h-screen flex w-full relative"
            style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #ffffff 100%)',
            }}
        >
            {/* Mobile Sidebar Overlay (click-capture only, no darkening) */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 lg:hidden bg-transparent"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Left Sidebar */}
            <AdminSidebar 
                currentPage={currentPage} 
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative z-10 lg:z-auto">
                {/* Header */}
                <AdminHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

                {/* Content */}
                <main className="flex-1 p-2 md:p-6 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}

