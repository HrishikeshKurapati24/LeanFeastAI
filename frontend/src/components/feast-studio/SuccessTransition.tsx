import { useEffect } from 'react';

interface SuccessTransitionProps {
    onComplete: () => void;
}

export default function SuccessTransition({ onComplete }: SuccessTransitionProps) {
    useEffect(() => {
        // Auto-complete after animation (1.5 seconds)
        const timer = setTimeout(() => {
            onComplete();
        }, 1500);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-md animate-fadeIn">
            <div className="bg-white rounded-3xl p-12 shadow-2xl max-w-md w-full mx-4 text-center animate-fadeInUp">
                {/* Success checkmark animation */}
                <div className="relative w-24 h-24 mx-auto mb-6">
                    {/* Pulsing background circle */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 animate-pulse" />
                    {/* Checkmark circle */}
                    <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/10 to-primary/5" />
                    {/* Animated checkmark */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <svg
                            className="w-16 h-16 text-primary"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            style={{
                                strokeDasharray: 24,
                                strokeDashoffset: 24,
                                animation: 'drawCheck 0.6s ease-out 0.3s forwards',
                            }}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    </div>
                </div>

                {/* Text with gradient */}
                <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent mb-2">
                    Recipe Ready! 🎉
                </h3>
                <p className="text-neutral-61 text-sm">
                    Your personalized feast is ready to explore
                </p>
            </div>
        </div>
    );
}

