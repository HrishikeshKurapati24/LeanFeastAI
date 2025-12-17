import { Link } from 'react-router-dom';

export default function NotFound() {
    return (
        <div
            className="min-h-screen flex items-center justify-center px-4 py-12"
            style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #ffffff 100%)',
            }}
        >
            <div className="w-full max-w-2xl text-center">
                {/* Glassmorphism Card */}
                <div
                    className="rounded-3xl p-8 md:p-12 shadow-2xl animate-fade-in"
                    style={{
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05)',
                    }}
                >
                    {/* 404 Number */}
                    <div className="mb-6">
                        <h1
                            className="text-8xl md:text-9xl font-bold mb-4"
                            style={{
                                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}
                        >
                            404
                        </h1>
                    </div>

                    {/* Icon */}
                    <div className="mb-6 text-6xl md:text-7xl animate-float">
                        🍳
                    </div>

                    {/* Title */}
                    <h2 className="text-3xl md:text-4xl font-bold text-neutral-42 mb-4">
                        Oops! Recipe Not Found
                    </h2>

                    {/* Description */}
                    <p className="text-lg md:text-xl text-neutral-75 mb-8 max-w-md mx-auto">
                        Looks like this page has wandered off the menu! The recipe you're looking for doesn't exist or may have been moved.
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link
                            to="/"
                            className="px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg"
                            style={{
                                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(34, 197, 94, 0.4)';
                                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                            }}
                        >
                            🏠 Go Home
                        </Link>

                        <Link
                            to="/feast-studio"
                            className="px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg"
                            style={{
                                background: 'linear-gradient(135deg, #ff7b5c 0%, #ff5a5f 100%)',
                                boxShadow: '0 4px 12px rgba(255, 123, 92, 0.3)',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 123, 92, 0.4)';
                                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 123, 92, 0.3)';
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                            }}
                        >
                            🍽️ Make my feast
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

