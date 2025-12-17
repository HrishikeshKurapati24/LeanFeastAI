import { useState, memo, useEffect } from 'react';
import { motion } from 'framer-motion';
import VoiceSettingsPanel from './VoiceSettingsPanel';
import { useVoiceCommands } from '../../hooks/useVoiceCommands';
import type { NormalizedStep } from '../../utils/stepNormalizer';

interface StepCardProps {
    step: NormalizedStep;
    stepIndex: number;
    totalSteps: number;
    isPlaying: boolean;
    onPlayPause: () => void;
    onPrevious: () => void;
    onNext: () => void;
    onRepeat: () => void;
    onStop: () => void;
    voiceSpeed: number;
    selectedVoice?: SpeechSynthesisVoice;
    selectedLanguage?: string;
    onSpeedChange: (speed: number) => void;
    onVoiceChange: (voice: SpeechSynthesisVoice) => void;
    onLanguageChange: (language: string) => void;
    showCaptions: boolean;
    onToggleCaptions: () => void;
    autoPlayEnabled?: boolean;
    onToggleAutoPlay?: () => void;
    handsFreeEnabled?: boolean;
    isWakeListening?: boolean;
    onToggleHandsFree?: () => void;
    onVoiceCommand?: (command: string, params?: { minutes?: number; seconds?: number }) => void;
    onTimerStart?: (seconds: number) => void;
    onTimerPause?: () => void;
    onTimerResume?: () => void;
    timerRemainingSeconds?: number;
    isTimerRunning?: boolean;
    isTimerPaused?: boolean;
    onTimerReset?: () => void;
    onListeningStart?: () => void;
    onListeningEnd?: () => void;
    onPermissionDenied?: () => void;
    shouldTriggerVoiceCommand?: boolean;
    onVoiceListeningTriggered?: () => void;
    onShowVoiceCommandsHelp?: () => void;
}

function StepCard({
    step,
    stepIndex,
    totalSteps,
    onPrevious,
    onNext,
    voiceSpeed,
    selectedVoice,
    selectedLanguage,
    onSpeedChange,
    onVoiceChange,
    onLanguageChange,
    showCaptions,
    handsFreeEnabled,
    isWakeListening,
    onToggleHandsFree,
    onVoiceCommand,
    onTimerStart,
    onTimerPause,
    onTimerResume,
    timerRemainingSeconds,
    isTimerRunning = false,
    isTimerPaused = false,
    onTimerReset,
    onListeningStart,
    onListeningEnd,
    onPermissionDenied,
    shouldTriggerVoiceCommand,
    onVoiceListeningTriggered,
    onShowVoiceCommandsHelp,
}: StepCardProps) {
    const [showVoiceSettings, setShowVoiceSettings] = useState(false);
    const { isListening, isSupported: voiceCommandsSupported, permissionDenied, toggleListening, recognizedText } = useVoiceCommands({
        onCommand: (command, params) => {
            if (onVoiceCommand) {
                onVoiceCommand(command, params);
            }
        },
        continuous: false,
        onListeningStart: onListeningStart,
        onListeningEnd: onListeningEnd,
        onPermissionDenied: onPermissionDenied,
    });

    // React to shouldTriggerVoiceCommand - auto-start voice listening when wake-word is detected
    useEffect(() => {
        if (shouldTriggerVoiceCommand && voiceCommandsSupported && !isListening && !permissionDenied) {
            // Start listening for voice commands
            toggleListening();
            // Notify parent that we've started listening
            if (onVoiceListeningTriggered) {
                onVoiceListeningTriggered();
            }
        }
    }, [shouldTriggerVoiceCommand, voiceCommandsSupported, isListening, permissionDenied, toggleListening, onVoiceListeningTriggered]);

    const getStepText = (): string => {
        return step.text || `Step ${stepIndex + 1}`;
    };

    return (
        <div className="relative flex items-center justify-center gap-2 sm:gap-3 md:gap-4">
            {/* Left Navigation Arrow - Desktop Only */}
            <button
                onClick={onPrevious}
                disabled={stepIndex === 0}
                className={`hidden md:flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white/80 border border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 hover:scale-110 shadow-lg ${stepIndex === 0 ? 'opacity-40 cursor-not-allowed hover:scale-100' : ''}`}
                aria-label="Previous step"
            >
                <svg className="w-5 h-5 lg:w-6 lg:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="flex-1 max-w-2xl rounded-[20px] sm:rounded-[24px] md:rounded-[28px] p-4 sm:p-5 md:p-6 lg:p-8 xl:p-10 relative overflow-hidden bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-xl backdrop-saturate-180 border border-white/40 shadow-[0_12px_40px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.08)]"
            >
                {/* Soft Radial Glow Behind Card */}
                <div
                    className="absolute -inset-4 bg-gradient-to-br from-primary/5 to-transparent rounded-[32px] -z-10 blur-2xl"
                />

                {/* GenZ Styled Step Number Circle - Top center */}
                <div className="flex justify-center mb-4 sm:mb-5 md:mb-6 lg:mb-8">
                    <div
                        className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full flex items-center justify-center font-bold text-white text-lg sm:text-xl md:text-2xl lg:text-3xl shadow-xl transform hover:scale-110 transition-transform duration-300 bg-gradient-to-br from-[#22c55e] to-[#16a34a] shadow-[0_8px_24px_rgba(34,197,94,0.3)]"
                    >
                        {stepIndex + 1}
                    </div>
                </div>

                {/* Step Description - Responsive styling */}
                <div className="mb-6 sm:mb-8 md:mb-10 lg:mb-12 text-center">
                    <p
                        className="text-base sm:text-lg md:text-xl font-medium text-center leading-[1.5] text-neutral-42 md:text-neutral-61"
                    >
                        {getStepText()}
                    </p>
                </div>

                {/* Optional Step Image */}
                {step.image_url && (
                    <div className="mb-6 sm:mb-8 md:mb-10 lg:mb-12 rounded-[16px] sm:rounded-[20px] md:rounded-[24px] overflow-hidden shadow-md">
                        <img
                            src={step.image_url}
                            alt={`Step ${stepIndex + 1}`}
                            className="w-full h-auto object-cover"
                        />
                    </div>
                )}

                {/* Timer Controls - Full UI (if step has duration OR timer is active) */}
                {(step.timer_seconds && step.timer_seconds > 0) || isTimerRunning || isTimerPaused ? (
                    <div className="mb-6 sm:mb-7 md:mb-8 lg:mb-10">
                        <div className="flex flex-col items-center gap-2 sm:gap-3 md:gap-4">
                            {/* Timer Display */}
                            <div className="text-center">
                                <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary mb-1 sm:mb-1.5 md:mb-2">
                                    {timerRemainingSeconds !== undefined && timerRemainingSeconds >= 0
                                        ? `${Math.floor(timerRemainingSeconds / 60)}:${String(Math.floor(timerRemainingSeconds % 60)).padStart(2, '0')}`
                                        : step.timer_seconds && step.timer_seconds > 0
                                            ? `${Math.floor(step.timer_seconds / 60)}:${String(step.timer_seconds % 60).padStart(2, '0')}`
                                            : '0:00'
                                    }
                                </div>
                                <p className="text-xs sm:text-sm text-neutral-61">Timer</p>
                            </div>

                            {/* Timer Control Buttons */}
                            <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 flex-wrap justify-center">
                                {!isTimerRunning && !isTimerPaused && (
                                    <button
                                        onClick={() => onTimerStart && step.timer_seconds && onTimerStart(step.timer_seconds)}
                                        className="px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white font-semibold rounded-full transition-all duration-200 hover:scale-105 shadow-lg text-xs sm:text-sm"
                                        style={{
                                            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                                        }}
                                        aria-label="Start timer"
                                        disabled={!step.timer_seconds}
                                    >
                                        ▶️ Start Timer
                                    </button>
                                )}
                                {isTimerRunning && !isTimerPaused && (
                                    <button
                                        onClick={onTimerPause}
                                        className="px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 bg-white border-2 border-primary hover:bg-primary/10 text-primary font-semibold rounded-full transition-all duration-200 hover:scale-105 text-xs sm:text-sm"
                                        aria-label="Pause timer"
                                    >
                                        ⏸️ Pause
                                    </button>
                                )}
                                {isTimerPaused && (
                                    <button
                                        onClick={onTimerResume}
                                        className="px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white font-semibold rounded-full transition-all duration-200 hover:scale-105 shadow-lg text-xs sm:text-sm"
                                        style={{
                                            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                                        }}
                                        aria-label="Resume timer"
                                    >
                                        ▶️ Resume
                                    </button>
                                )}
                                {(isTimerRunning || isTimerPaused) && onTimerReset && (
                                    <button
                                        onClick={onTimerReset}
                                        className="px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 bg-white border-2 border-neutral-200 hover:border-primary text-neutral-61 font-semibold rounded-full transition-all duration-200 hover:scale-105 text-xs sm:text-sm"
                                        aria-label="Reset timer"
                                    >
                                        ↻ Reset
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Control Buttons - Two Row Layout */}
                <div className="space-y-2 sm:space-y-2.5 md:space-y-3 mb-4 sm:mb-5 md:mb-6">
                    {/* Row 1: Info + Hands-free */}
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                        {/* Info Button - Opens Voice Commands Help */}
                        <button
                            onClick={onShowVoiceCommandsHelp}
                            className="px-2 py-1 sm:px-2.5 sm:py-1.5 md:px-3 rounded-full text-[10px] sm:text-xs font-medium transition-all duration-200 hover:scale-105 border bg-white/60 border-primary/20 hover:border-primary/40 text-neutral-61"
                            aria-label="Show voice commands help"
                        >
                            ℹ️ Info
                        </button>

                        {/* Hands-free Toggle */}
                        {onToggleHandsFree && (
                            <button
                                onClick={onToggleHandsFree}
                                className={`px-2 py-1 sm:px-2.5 sm:py-1.5 md:px-3 rounded-full text-[10px] sm:text-xs font-medium transition-all duration-200 hover:scale-105 border ${handsFreeEnabled
                                    ? 'bg-primary/10 border-primary text-primary'
                                    : 'bg-white/60 border-primary/20 hover:border-primary/40 text-neutral-61'
                                    }`}
                                aria-pressed={handsFreeEnabled ? true : false}
                                aria-label="Toggle hands-free cooking"
                            >
                                {handsFreeEnabled
                                    ? isWakeListening
                                        ? '🗣️ Hands-free'
                                        : '🗣️ Paused'
                                    : '🗣️ Hands-free'}
                            </button>
                        )}
                    </div>

                    {/* Row 2: Voice + Speed */}
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                        {/* Change Voice */}
                        <button
                            onClick={() => setShowVoiceSettings(true)}
                            className="px-2 py-1 sm:px-2.5 sm:py-1.5 md:px-3 bg-white/60 border border-primary/20 hover:border-primary/40 rounded-full text-[10px] sm:text-xs font-medium text-neutral-61 transition-all duration-200 hover:scale-105"
                            aria-label="Change voice settings"
                        >
                            🎤 Voice
                        </button>

                        {/* Voice Speed */}
                        <button
                            onClick={() => setShowVoiceSettings(true)}
                            className="px-2 py-1 sm:px-2.5 sm:py-1.5 md:px-3 bg-white/60 border border-primary/20 hover:border-primary/40 rounded-full text-[10px] sm:text-xs font-medium text-neutral-61 transition-all duration-200 hover:scale-105"
                            aria-label={`Current speed: ${voiceSpeed}x. Click to change.`}
                        >
                            ⚡ {voiceSpeed}x
                        </button>
                    </div>
                </div>

                {/* Captions Display */}
                {showCaptions && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 sm:mt-5 md:mt-6 p-3 sm:p-3.5 md:p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-[16px] sm:rounded-[18px] md:rounded-[20px] border border-primary/20"
                    >
                        <p className="text-xs sm:text-sm text-[#475569] italic leading-relaxed">
                            "{getStepText()}"
                        </p>
                    </motion.div>
                )}

                {/* Voice Command Recognition Display */}
                {isListening && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-3 sm:mt-3.5 md:mt-4 p-3 sm:p-3.5 md:p-4 bg-primary/10 rounded-[16px] sm:rounded-[18px] md:rounded-[20px] border border-primary/30"
                    >
                        {recognizedText ? (
                            <p className="text-xs sm:text-sm text-primary font-semibold">
                                🎯 Heard: "{recognizedText}"
                            </p>
                        ) : (
                            <p className="text-xs sm:text-sm text-primary font-semibold animate-pulse">
                                🎙️ Listening... Speak your command now
                            </p>
                        )}
                    </motion.div>
                )}
            </motion.div>

            {/* Right Navigation Arrow - Desktop Only */}
            <button
                onClick={onNext}
                disabled={stepIndex >= totalSteps - 1}
                className={`hidden md:flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white/80 border border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 hover:scale-110 shadow-lg ${stepIndex >= totalSteps - 1 ? 'opacity-40 cursor-not-allowed hover:scale-100' : ''}`}
                aria-label="Next step"
            >
                <svg className="w-5 h-5 lg:w-6 lg:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
            </button>

            {/* Voice Settings Panel - Rendered outside motion.div to prevent clipping */}
            <VoiceSettingsPanel
                isOpen={showVoiceSettings}
                onClose={() => setShowVoiceSettings(false)}
                currentSpeed={voiceSpeed}
                currentVoice={selectedVoice}
                currentLanguage={selectedLanguage}
                onSpeedChange={onSpeedChange}
                onVoiceChange={onVoiceChange}
                onLanguageChange={onLanguageChange}
            />
        </div>
    );
}

export default memo(StepCard);