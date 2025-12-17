import { NavLink } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

interface AdminSidebarProps {
    currentPage: 'users' | 'recipes' | 'community';
    isOpen: boolean;
    onClose: () => void;
}

export default function AdminSidebar({ currentPage, isOpen, onClose }: AdminSidebarProps) {
    const { assignedSections } = useAdminAuth();
    
    const allNavItems = [
        {
            id: 'users',
            label: 'Users & Analytics',
            icon: '👥',
            path: '/admin/users',
            requiredSection: 'users',
        },
        {
            id: 'recipes',
            label: 'Recipes & Analytics',
            icon: '🍳',
            path: '/admin/recipes',
            requiredSection: 'recipes',
        },
        {
            id: 'community',
            label: 'Community & Analytics',
            icon: '🌍',
            path: '/admin/community',
            requiredSection: 'community',
        },
    ];
    
    // Filter nav items based on assigned sections
    const navItems = allNavItems.filter((item) =>
        assignedSections.includes(item.requiredSection)
    );

    return (
        <>
            {/* Desktop Sidebar - Always visible on lg+ */}
            <div
                className="hidden lg:block w-64 min-h-screen p-6"
                style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                    borderRight: '1px solid rgba(0, 0, 0, 0.05)',
                    boxShadow: '2px 0 8px rgba(0, 0, 0, 0.05)',
                }}
            >
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-primary">Admin Panel</h1>
                    <p className="text-sm text-neutral-61 mt-1">LeanFeast AI</p>
                </div>

                <nav className="space-y-2">
                    {navItems.map((item) => {
                        const isActive = currentPage === item.id;
                        return (
                            <NavLink
                                key={item.id}
                                to={item.path}
                                className={({ isActive: navIsActive }) =>
                                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                                        navIsActive || isActive
                                            ? 'text-primary font-semibold'
                                            : 'text-neutral-61 hover:text-neutral-42'
                                    }`
                                }
                                style={({ isActive: navIsActive }) => ({
                                    background:
                                        navIsActive || isActive
                                            ? 'rgba(34, 197, 94, 0.1)'
                                            : 'transparent',
                                    boxShadow:
                                        navIsActive || isActive
                                            ? '0 2px 8px rgba(34, 197, 94, 0.15)'
                                            : 'none',
                                })}
                            >
                                <span className="text-xl">{item.icon}</span>
                                <span className="text-sm">{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>
            </div>

            {/* Mobile Sidebar - Slide in overlay */}
            <div
                className={`fixed top-0 left-0 h-full w-64 z-50 lg:hidden transform transition-transform duration-300 ease-in-out ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
                style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)',
                    borderRight: '1px solid rgba(0, 0, 0, 0.05)',
                    boxShadow: '2px 0 16px rgba(0, 0, 0, 0.1)',
                }}
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-primary">Admin Panel</h1>
                            <p className="text-sm text-neutral-61 mt-1">LeanFeast AI</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="lg:hidden p-2 rounded-lg hover:bg-neutral-100 text-neutral-61"
                            aria-label="Close menu"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <nav className="space-y-2">
                        {navItems.map((item) => {
                            const isActive = currentPage === item.id;
                            return (
                                <NavLink
                                    key={item.id}
                                    to={item.path}
                                    onClick={onClose}
                                    className={({ isActive: navIsActive }) =>
                                        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                                            navIsActive || isActive
                                                ? 'text-primary font-semibold'
                                                : 'text-neutral-61 hover:text-neutral-42'
                                        }`
                                    }
                                    style={({ isActive: navIsActive }) => ({
                                        background:
                                            navIsActive || isActive
                                                ? 'rgba(34, 197, 94, 0.1)'
                                                : 'transparent',
                                        boxShadow:
                                            navIsActive || isActive
                                                ? '0 2px 8px rgba(34, 197, 94, 0.15)'
                                                : 'none',
                                    })}
                                >
                                    <span className="text-xl">{item.icon}</span>
                                    <span className="text-sm">{item.label}</span>
                                </NavLink>
                            );
                        })}
                    </nav>
                </div>
            </div>
        </>
    );
}

