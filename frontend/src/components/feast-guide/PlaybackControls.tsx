interface PlaybackControlsProps {
    onPrevious: () => void;
    onPlay: () => void;
    onPause: () => void;
    onRepeat: () => void;
    onNext: () => void;
    onResume?: () => void;
    isPlaying: boolean;
    isPaused?: boolean;
    canGoPrevious: boolean;
    canGoNext: boolean;
}

export default function PlaybackControls({
    onPrevious,
    onPlay,
    onPause,
    onRepeat,
    onNext,
    isPlaying,
    isPaused = false,
    onResume,
    canGoPrevious,
    canGoNext,
}: PlaybackControlsProps) {
    const handlePlayPause = () => {
        if (isPlaying) {
            onPause();
            return;
        }

        if (isPaused && onResume) {
            onResume();
            return;
        }

        onPlay();
    };

    return (
        <div className="flex items-center justify-center gap-4 md:gap-5">
            {/* Previous Button - Neumorphic Pill */}
            <button
                onClick={onPrevious}
                disabled={!canGoPrevious}
                className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-full bg-white border-2 border-neutral-200 hover:border-primary hover:bg-primary/5 transition-all duration-200 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-neutral-200 disabled:hover:bg-white disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
                aria-label="Previous step"
            >
                <svg
                    className="w-6 h-6 md:w-7 md:h-7 text-neutral-42"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M15 19l-7-7 7-7"
                    />
                </svg>
            </button>

            {/* Repeat Button - Neumorphic Pill */}
            <button
                onClick={onRepeat}
                className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full bg-white border-2 border-neutral-200 hover:border-primary hover:bg-primary/5 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
                aria-label="Repeat step"
            >
                <svg
                    className="w-5 h-5 md:w-6 md:h-6 text-neutral-42"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                </svg>
            </button>

            {/* Play/Pause Button (Primary) - Giant Round with Gradient */}
            <button
                onClick={handlePlayPause}
                className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary to-primary-dark text-white shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-primary/30"
                style={{
                    boxShadow: '0 8px 24px rgba(34, 197, 94, 0.4)',
                }}
                aria-label={isPlaying ? 'Pause' : isPaused ? 'Resume' : 'Play'}
            >
                {isPlaying ? (
                    <svg
                        className="w-10 h-10 md:w-12 md:h-12"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                ) : (
                    <svg
                        className="w-10 h-10 md:w-12 md:h-12 ml-1"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path d="M8 5v14l11-7z" />
                    </svg>
                )}
            </button>

            {/* Next Button - Neumorphic Pill */}
            <button
                onClick={onNext}
                disabled={!canGoNext}
                className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-full bg-white border-2 border-neutral-200 hover:border-primary hover:bg-primary/5 transition-all duration-200 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-neutral-200 disabled:hover:bg-white disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
                aria-label="Next step"
            >
                <svg
                    className="w-6 h-6 md:w-7 md:h-7 text-neutral-42"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M9 5l7 7-7 7"
                    />
                </svg>
            </button>
        </div>
    );
}
