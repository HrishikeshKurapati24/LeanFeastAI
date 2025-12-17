import { useEffect, useState } from 'react';
import { useTimer, formatTimer } from '../../hooks/useTimer';

interface TimerCircleProps {
    durationSeconds: number;
    onComplete?: () => void;
}

export default function TimerCircle({ durationSeconds, onComplete }: TimerCircleProps) {
    const { remainingSeconds, isRunning, isPaused, start, pause, resume, reset, setTime } = useTimer({
        initialSeconds: durationSeconds,
        onComplete: () => {
            if (onComplete) {
                onComplete();
            }
        },
    });

    // Update timer when duration changes
    useEffect(() => {
        setTime(durationSeconds);
    }, [durationSeconds, setTime]);

    const [isPulsing, setIsPulsing] = useState(false);
    const [isShaking, setIsShaking] = useState(false);

    // Pulse animation on completion
    useEffect(() => {
        if (remainingSeconds === 0 && !isRunning) {
            setIsPulsing(true);
            setIsShaking(true);
            const timer = setTimeout(() => {
                setIsPulsing(false);
                setIsShaking(false);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [remainingSeconds, isRunning]);

    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const progress = (durationSeconds - remainingSeconds) / durationSeconds;
    const strokeDashoffset = circumference * (1 - progress);

    const handleToggle = () => {
        if (isRunning) {
            pause();
        } else if (isPaused) {
            resume();
        } else {
            start(durationSeconds);
        }
    };

    return (
        <div className="flex flex-col items-center gap-6">
            {/* Circular Progress Ring with Pulsing Glow */}
            <div className="relative">
                {/* Glow Effect when running */}
                {isRunning && (
                    <div 
                        className="absolute inset-0 rounded-full blur-xl opacity-50 animate-pulse"
                        style={{
                            background: 'radial-gradient(circle, rgba(34, 197, 94, 0.4) 0%, transparent 70%)',
                        }}
                    />
                )}
                
                <svg
                    className={`transform transition-all duration-300 ${
                        isPulsing ? 'scale-110' : 'scale-100'
                    } ${isShaking ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
                    width="160"
                    height="160"
                    viewBox="0 0 160 160"
                >
                    {/* Background Circle */}
                    <circle
                        cx="80"
                        cy="80"
                        r={radius}
                        fill="none"
                        stroke="#E2E8F0"
                        strokeWidth="10"
                    />
                    {/* Progress Circle with Thick Ring */}
                    <circle
                        cx="80"
                        cy="80"
                        r={radius}
                        fill="none"
                        stroke="url(#timerGradient)"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        transform="rotate(-90 80 80)"
                        className="transition-all duration-300"
                        style={{
                            filter: isRunning ? 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.5))' : 'none',
                        }}
                    />
                    <defs>
                        <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#22c55e" />
                            <stop offset="100%" stopColor="#16a34a" />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Time Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-4xl font-bold text-neutral-42 tracking-tight">
                        {formatTimer(remainingSeconds)}
                    </div>
                    {isRunning && (
                        <div className="text-xs text-primary font-semibold mt-1 animate-pulse">
                            Running
                        </div>
                    )}
                </div>
            </div>

            {/* Timer Controls */}
            <div className="flex items-center gap-3">
                <button
                    onClick={handleToggle}
                    className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white font-semibold rounded-full transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl text-sm"
                    style={{
                        boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                    }}
                    aria-label={isRunning ? 'Pause timer' : isPaused ? 'Resume timer' : 'Start timer'}
                >
                    {isRunning ? '⏸️ Pause' : isPaused ? '▶️ Resume' : '▶️ Start'}
                </button>
                <button
                    onClick={reset}
                    className="px-4 py-2.5 bg-white border-2 border-neutral-200 hover:border-primary text-neutral-42 font-semibold rounded-full transition-all duration-200 hover:scale-105 text-sm"
                    aria-label="Reset timer"
                >
                    ↻ Reset
                </button>
            </div>
        </div>
    );
}
