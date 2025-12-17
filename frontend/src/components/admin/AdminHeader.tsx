import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAppDispatch } from '../../store/hooks';
import { clearAllAdminData } from '../../store/actions/adminActions';

interface AdminHeaderProps {
    onMenuClick: () => void;
}

export default function AdminHeader({ onMenuClick }: AdminHeaderProps) {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const dispatch = useAppDispatch();

    const handleLogout = async () => {
        // Clear all admin data from Redux store before logout
        dispatch(clearAllAdminData());
        // Sign out from Supabase
        await signOut();
        // Navigate to home page
        navigate('/');
    };

    return (
        <header
            className="w-full h-16 px-4 md:px-6 flex items-center justify-between"
            style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            }}
        >
            <div className="flex items-center gap-4">
                {/* Hamburger Menu Button - Visible only on mobile/tablet */}
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 rounded-lg hover:bg-neutral-100 text-neutral-61"
                    aria-label="Toggle menu"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <h2 className="text-base md:text-lg font-semibold text-neutral-42">Admin Dashboard</h2>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                {user && (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">
                            {user.email?.charAt(0).toUpperCase() || 'A'}
                        </div>
                        <span className="text-sm text-neutral-61 hidden md:block">
                            {user.email}
                        </span>
                    </div>
                )}
                <button
                    onClick={handleLogout}
                    className="px-3 md:px-4 py-2 rounded-lg text-sm font-medium text-neutral-61 hover:text-neutral-42 hover:bg-neutral-100 transition-colors"
                >
                    Logout
                </button>
            </div>
        </header>
    );
}

