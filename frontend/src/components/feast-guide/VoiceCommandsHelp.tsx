import { useState, memo, forwardRef } from 'react';
import { motion } from 'framer-motion';

interface VoiceCommandsHelpProps {
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}

const VoiceCommandsHelp = forwardRef<HTMLDivElement, VoiceCommandsHelpProps>(function VoiceCommandsHelp(
    { isExpanded: controlledIsExpanded, onToggleExpand },
    ref
) {
    const [internalIsExpanded, setInternalIsExpanded] = useState(false);

    // Use controlled state if provided, otherwise use internal state
    const isExpanded = controlledIsExpanded !== undefined ? controlledIsExpanded : internalIsExpanded;
    const handleToggle = onToggleExpand || (() => setInternalIsExpanded(!internalIsExpanded));

    const commands = [
        { command: 'read the step', description: 'Read the current step aloud' },
        { command: 'next', description: 'Go to next step' },
        { command: 'previous / back', description: 'Go to previous step' },
        { command: 'repeat', description: 'Repeat current step' },
        { command: 'start timer', description: 'Start timer for current step' },
        { command: 'start timer for X minutes', description: 'Start timer for X minutes' },
        { command: 'start timer for X seconds', description: 'Start timer for X seconds' },
        { command: 'pause timer', description: 'Pause the timer' },
        { command: 'resume timer', description: 'Resume the timer' },
        { command: 'reset timer', description: 'Reset the timer' },
    ];

    return (
        <div
            ref={ref}
            className="rounded-xl sm:rounded-2xl overflow-hidden bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-xl backdrop-saturate-180 border border-white/40 shadow-[0_12px_40px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.08)]"
        >
            <button
                onClick={handleToggle}
                className={`w-full p-3 sm:p-3.5 md:p-4 flex items-center justify-between transition-all duration-300 cursor-pointer group ${isExpanded ? 'bg-gradient-to-br from-emerald-500/8 to-emerald-600/5' : 'bg-transparent'}`}
                aria-expanded={isExpanded}
            >
                <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3">
                    <span className="text-xl sm:text-2xl">🎙️</span>
                    <h3 className="text-sm sm:text-base md:text-lg font-semibold text-neutral-61">Voice Commands</h3>
                </div>
                <svg
                    className={`w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5 text-neutral-61 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            </button>

            {isExpanded && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="px-3 pb-3 sm:px-3.5 sm:pb-3.5 md:px-4 md:pb-4"
                >
                    <div className="space-y-1.5 sm:space-y-2">
                        {commands.map((cmd, index) => (
                            <div
                                key={index}
                                className="flex items-start gap-2 sm:gap-2.5 md:gap-3 p-2 sm:p-2.5 md:p-3 rounded-lg bg-white/60 border border-primary/10"
                            >
                                <span className="text-primary font-semibold text-xs sm:text-sm min-w-[140px] sm:min-w-[160px] md:min-w-[180px]">
                                    "{cmd.command}"
                                </span>
                                <span className="text-neutral-61 text-xs sm:text-sm flex-1">
                                    {cmd.description}
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
});

export default memo(VoiceCommandsHelp);
