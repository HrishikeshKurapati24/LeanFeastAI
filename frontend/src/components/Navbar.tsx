import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import logo1 from "../assets/logos/logo-1.png";

export default function Navbar() {
    const { user, signOut, loading } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <nav
            className="sticky top-0 z-50"
            style={{
                background: isMobileMenuOpen ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.85)',
                backdropFilter: isMobileMenuOpen ? 'none' : 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: isMobileMenuOpen ? 'none' : 'blur(16px) saturate(180%)',
                borderBottom: '3px solid transparent',
                borderImage: 'linear-gradient(to right, #8ef08a, #6ad67c, #38a169) 1',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08), 0 2px 10px rgba(0, 0, 0, 0.04)'
            }}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-3 sm:py-4 md:py-5">
                    {/* Logo */}
                    <div className="flex items-center">
                        <Link to="/" className="flex items-center group" onClick={() => setIsMobileMenuOpen(false)}>
                            <img
                                src={logo1}
                                alt="LeanFeastAI Logo"
                                className="h-8 sm:h-10 md:h-12 w-auto transition-transform duration-300 group-hover:scale-110"
                                style={{
                                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
                                    WebkitFilter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
                                }}
                            />
                            <span className="ml-2 sm:ml-3 text-lg sm:text-xl md:text-2xl font-bold text-primary group-hover:text-accent transition-colors duration-200">LeanFeastAI</span>
                        </Link>
                    </div>

                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center space-x-8">
                        {user ? (
                            <>
                                <Link
                                    to="/feast-studio"
                                    className="text-neutral-61 hover:text-primary transition-all duration-300 font-medium relative group"
                                    style={{
                                        transform: 'translateY(0)',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.textShadow = '0 2px 4px rgba(34, 197, 94, 0.2)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.textShadow = 'none';
                                    }}
                                >
                                    Feast Studio
                                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                                </Link>
                                <Link
                                    to="/community"
                                    className="text-neutral-61 hover:text-primary transition-all duration-300 font-medium relative group"
                                    style={{
                                        transform: 'translateY(0)',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.textShadow = '0 2px 4px rgba(34, 197, 94, 0.2)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.textShadow = 'none';
                                    }}
                                >
                                    Community
                                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                                </Link>
                            </>
                        ) : (
                            <Link
                                to="/explore-community"
                                className="text-neutral-61 hover:text-primary transition-all duration-300 font-medium relative group"
                                style={{
                                    transform: 'translateY(0)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.textShadow = '0 2px 4px rgba(34, 197, 94, 0.2)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.textShadow = 'none';
                                }}
                            >
                                Explore Community
                                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                            </Link>
                        )}
                    </div>

                    {/* Auth Buttons - Desktop */}
                    <div className="hidden md:flex items-center space-x-4">
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-neutral-189 border-t-primary rounded-full animate-spin"></div>
                        ) : user ? (
                            <>
                                <Link
                                    to="/profile"
                                    className="text-neutral-61 hover:text-primary px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                                >
                                    Profile
                                </Link>
                                <button
                                    onClick={async () => {
                                        await signOut();
                                        navigate("/");
                                    }}
                                    className="text-neutral-61 hover:text-primary px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="text-neutral-61 hover:text-primary px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/signup"
                                    className="bg-primary hover:bg-primary-dark text-neutral-255 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105"
                                    style={{
                                        borderRadius: '0.75rem',
                                        boxShadow: '0 2px 8px rgba(34, 197, 94, 0.2)',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(34, 197, 94, 0.2)';
                                    }}
                                >
                                    Sign Up
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="text-neutral-61 hover:text-primary focus:outline-none p-2"
                            aria-label="Toggle menu"
                        >
                            {isMobileMenuOpen ? (
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <>
                        {/* No backdrop - menu just slides down */}

                        {/* Mobile Menu Panel */}
                        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-t border-primary/20 shadow-lg z-50 transform transition-all duration-300 ease-out">
                            <div className="px-4 py-4 space-y-3">
                                {/* Navigation Links */}
                                <div className="space-y-2">
                                    {user ? (
                                        <>
                                            <Link
                                                to="/feast-studio"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="block text-neutral-61 hover:text-primary transition-colors duration-200 font-medium py-2 px-3 rounded-md hover:bg-secondary-lighter"
                                            >
                                                Feast Studio
                                            </Link>
                                            <Link
                                                to="/community"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="block text-neutral-61 hover:text-primary transition-colors duration-200 font-medium py-2 px-3 rounded-md hover:bg-secondary-lighter"
                                            >
                                                Community
                                            </Link>
                                        </>
                                    ) : (
                                        <Link
                                            to="/explore-community"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="block text-neutral-61 hover:text-primary transition-colors duration-200 font-medium py-2 px-3 rounded-md hover:bg-secondary-lighter"
                                        >
                                            Explore Community
                                        </Link>
                                    )}
                                </div>

                                {/* Divider */}
                                <div className="border-t border-neutral-189 my-3"></div>

                                {/* Auth Buttons */}
                                <div className="space-y-2">
                                    {loading ? (
                                        <div className="flex justify-center py-2">
                                            <div className="w-5 h-5 border-2 border-neutral-189 border-t-primary rounded-full animate-spin"></div>
                                        </div>
                                    ) : user ? (
                                        <>
                                            <Link
                                                to="/profile"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="block text-neutral-61 hover:text-primary px-2 py-1.5 sm:px-3 sm:py-2 rounded-md text-sm font-medium transition-colors duration-200 text-center"
                                            >
                                                Profile
                                            </Link>
                                            <button
                                                onClick={async () => {
                                                    await signOut();
                                                    setIsMobileMenuOpen(false);
                                                    navigate("/");
                                                }}
                                                className="w-full text-neutral-61 hover:text-primary px-2 py-1.5 sm:px-3 sm:py-2 rounded-md text-sm font-medium transition-colors duration-200"
                                            >
                                                Logout
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <Link
                                                to="/login"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="block text-neutral-61 hover:text-primary px-2 py-1.5 sm:px-3 sm:py-2 rounded-md text-sm font-medium transition-colors duration-200 text-center"
                                            >
                                                Login
                                            </Link>
                                            <Link
                                                to="/signup"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className="block bg-primary hover:bg-primary-dark text-neutral-255 px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl text-sm font-medium transition-all duration-300 text-center"
                                                style={{
                                                    borderRadius: '0.75rem',
                                                    boxShadow: '0 2px 8px rgba(34, 197, 94, 0.2)',
                                                }}
                                            >
                                                Sign Up
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </nav>
    );
}