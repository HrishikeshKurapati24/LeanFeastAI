import { useState, useEffect, useRef, useCallback } from 'react';

export type VoiceCommand =
    | 'next'
    | 'repeat'
    | 'pause'
    | 'back'
    | 'previous'
    | 'start_timer'
    | 'pause_timer'
    | 'resume_timer'
    | 'reset_timer'
    | 'read_step'
    | 'pause_tts'
    | 'resume_tts'
    | 'stop_tts'
    | 'unknown';

export interface UseVoiceCommandsOptions {
    onCommand?: (command: VoiceCommand, params?: { minutes?: number; seconds?: number }) => void;
    continuous?: boolean;
    language?: string;
    onListeningStart?: () => void; // Callback when voice recognition starts
    onListeningEnd?: () => void; // Callback when voice recognition ends (without command)
    onPermissionDenied?: () => void; // Callback when microphone permission is denied
}

export interface UseVoiceCommandsReturn {
    isListening: boolean;
    isSupported: boolean;
    recognizedText: string;
    permissionDenied: boolean;
    startListening: () => void;
    stopListening: () => void;
    toggleListening: () => void;
}

const normalizeCommand = (text: string): { command: VoiceCommand; params?: { minutes?: number; seconds?: number } } => {
    const normalized = text.toLowerCase().trim();
    if (DEBUG_VOICE_COMMANDS) {
    }

    // Reset timer - check FIRST before other commands to avoid conflicts
    // Use regex for more reliable matching
    const resetTimerPattern = /\b(reset|restart)\s+(?:the\s+)?timer\b/i;
    const timerResetPattern = /\btimer\s+(reset|restart)\b/i;

    if (resetTimerPattern.test(normalized) || timerResetPattern.test(normalized)) {
        if (DEBUG_VOICE_COMMANDS) {
        }
        return { command: 'reset_timer' };
    }

    // Navigation commands
    if (normalized.includes('next') || normalized.includes('forward') || normalized.includes('next step')) {
        return { command: 'next' };
    }
    if (normalized.includes('back') || normalized.includes('previous') || normalized.includes('prev') || normalized.includes('go back')) {
        return { command: 'back' };
    }

    // Timer commands - check timer-specific commands FIRST before TTS commands
    // Match "start timer for X minutes" or "start timer for X seconds"
    const timerMinutesMatch = normalized.match(/start timer (?:for )?(\d+)\s*(?:minute|min|m)(?:ute|s)?/i);
    if (timerMinutesMatch) {
        const minutes = parseInt(timerMinutesMatch[1], 10);
        return { command: 'start_timer', params: { minutes } };
    }
    const timerSecondsMatch = normalized.match(/start timer (?:for )?(\d+)\s*(?:second|sec|s)(?:ond|s)?/i);
    if (timerSecondsMatch) {
        const seconds = parseInt(timerSecondsMatch[1], 10);
        return { command: 'start_timer', params: { seconds } };
    }
    if (normalized.includes('start timer') || normalized.includes('timer start')) {
        return { command: 'start_timer' };
    }
    if (normalized.includes('pause timer') || normalized.includes('timer pause')) {
        return { command: 'pause_timer' };
    }
    if (normalized.includes('resume timer') || normalized.includes('timer resume')) {
        return { command: 'resume_timer' };
    }

    // TTS commands (voice-first) - check after timer commands to avoid conflicts
    if (normalized.includes('read the step') || normalized.includes('start reading') || normalized.includes('read this') || normalized.includes('read step')) {
        return { command: 'read_step' };
    }
    if (normalized.includes('repeat step') || normalized.includes('say it again') || normalized.includes('repeat') || normalized.includes('again')) {
        return { command: 'repeat' };
    }
    if (normalized.includes('pause reading') || normalized.includes('pause audio') || normalized.includes('pause the audio')) {
        return { command: 'pause_tts' };
    }
    // Only match resume_tts if it's NOT a timer command
    if ((normalized.includes('continue reading') || normalized.includes('resume reading') || normalized.includes('continue') || normalized.includes('resume')) &&
        !normalized.includes('timer')) {
        return { command: 'resume_tts' };
    }
    if (normalized.includes('stop the audio') || normalized.includes('stop reading') || normalized.includes('stop audio')) {
        return { command: 'stop_tts' };
    }

    // Generic pause/stop (context-dependent, defaults to TTS)
    // Only match if not already matched as a timer command
    if ((normalized.includes('pause') || normalized.includes('stop')) &&
        !normalized.includes('timer')) {
        return { command: 'pause' };
    }

    return { command: 'unknown' };
};

// Debug flag - set to true to enable detailed logging
const DEBUG_VOICE_COMMANDS = true;

const debugLog = (message: string, data?: any) => {
    if (DEBUG_VOICE_COMMANDS) {
        const timestamp = new Date().toISOString();
        if (data) {
            // Optional debug: message with data when needed
        } else {
            // Optional debug: message when needed
        }
    }
};

export const useVoiceCommands = (options: UseVoiceCommandsOptions = {}): UseVoiceCommandsReturn => {
    const { onCommand, continuous = false, language = 'en-US', onListeningStart, onListeningEnd, onPermissionDenied } = options;
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [recognizedText, setRecognizedText] = useState('');
    const [permissionDenied, setPermissionDenied] = useState(false);
    const recognitionRef = useRef<any | null>(null);
    const onCommandRef = useRef(onCommand);
    const onListeningStartRef = useRef(onListeningStart);
    const onListeningEndRef = useRef(onListeningEnd);
    const onPermissionDeniedRef = useRef(onPermissionDenied);
    const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const errorCountRef = useRef<number>(0);
    const lastRestartTimeRef = useRef<number>(0);
    const isInitializedRef = useRef<boolean>(false);
    const commandRecognizedRef = useRef<boolean>(false); // Track if a command was recognized

    // Only log initialization once
    useEffect(() => {
        if (!isInitializedRef.current) {
            debugLog('Hook initialized', { continuous, language });
            isInitializedRef.current = true;
        }
    }, []);

    // Update refs when callbacks change
    useEffect(() => {
        onCommandRef.current = onCommand;
        debugLog('onCommand callback updated', { hasCallback: !!onCommand });
    }, [onCommand]);

    useEffect(() => {
        onListeningStartRef.current = onListeningStart;
        debugLog('onListeningStart callback updated', { hasCallback: !!onListeningStart });
    }, [onListeningStart]);

    useEffect(() => {
        onListeningEndRef.current = onListeningEnd;
        debugLog('onListeningEnd callback updated', { hasCallback: !!onListeningEnd });
    }, [onListeningEnd]);

    useEffect(() => {
        onPermissionDeniedRef.current = onPermissionDenied;
    }, [onPermissionDenied]);

    // Initialize speech recognition
    useEffect(() => {
        debugLog('Initializing speech recognition', { continuous, language });
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (SpeechRecognition) {
            debugLog('Speech Recognition API is supported');
            setIsSupported(true);
            const recognition = new SpeechRecognition();
            recognition.continuous = continuous;
            recognition.interimResults = true; // Enable interim results to see speech detection in real-time
            recognition.lang = language;
            debugLog('Recognition instance created', { continuous, language, interimResults: true });

            recognition.onstart = () => {
                debugLog('Recognition started - microphone should now be active');
                setIsListening(true);
                // Reset error count on successful start
                errorCountRef.current = 0;
                lastRestartTimeRef.current = Date.now();
                commandRecognizedRef.current = false; // Reset command recognition flag
                debugLog('Listening state set to true', { errorCount: errorCountRef.current });

                // Call callback to pause TTS when listening starts
                if (onListeningStartRef.current) {
                    debugLog('Calling onListeningStart callback to pause TTS');
                    onListeningStartRef.current();
                }

                // Check microphone access
                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then(stream => {
                        debugLog('Microphone access confirmed', {
                            active: stream.active,
                            tracks: stream.getTracks().length,
                            trackStates: stream.getTracks().map(t => ({
                                kind: t.kind,
                                enabled: t.enabled,
                                readyState: t.readyState,
                                muted: t.muted
                            }))
                        });
                        // Don't stop the stream - we need it for recognition
                    })
                    .catch(err => {
                        debugLog('Microphone access check failed', { error: err.name, message: err.message });
                    });
            };

            recognition.onend = () => {
                debugLog('Recognition ended', { continuous, errorCount: errorCountRef.current });

                if (continuous) {
                    debugLog('Recognition ended (continuous mode)');
                    return;
                }

                setIsListening(false);
                debugLog('Listening state set to false (non-continuous mode)', { commandRecognized: commandRecognizedRef.current });

                if (!commandRecognizedRef.current && onListeningEndRef.current) {
                    debugLog('Calling onListeningEnd - no command recognized');
                    setTimeout(() => {
                        if (onListeningEndRef.current) {
                            onListeningEndRef.current();
                        }
                    }, 100);
                }
            };

            recognition.onresult = (event: any) => {
                const lastResult = event.results[event.results.length - 1];
                const text = lastResult[0].transcript;
                const confidence = lastResult[0].confidence || 0;
                const isFinal = lastResult.isFinal;

                debugLog('Recognition result received', {
                    text,
                    confidence,
                    resultCount: event.results.length,
                    isFinal,
                    allResults: Array.from(event.results).map((r: any, i: number) => ({
                        index: i,
                        text: r[0].transcript,
                        confidence: r[0].confidence,
                        isFinal: r.isFinal
                    }))
                });

                // Update recognized text for display (even for interim results)
                setRecognizedText(text);

                // Only process commands when result is final
                if (isFinal) {
                    const { command, params } = normalizeCommand(text);
                    debugLog('Command normalized (final result)', { originalText: text, command, params });

                    if (command !== 'unknown' && onCommandRef.current) {
                        debugLog('Executing command', { command, params });
                        commandRecognizedRef.current = true; // Mark that a command was recognized
                        onCommandRef.current(command, params);
                    } else {
                        debugLog('Command ignored', { command, hasCallback: !!onCommandRef.current });
                    }
                } else {
                    debugLog('Interim result (not final yet)', { text });
                }
            };

            recognition.onerror = (event: any) => {
                const error = event.error;
                debugLog('Recognition error occurred', { error, errorCount: errorCountRef.current });

                // Ignore "aborted" errors - these are expected when restarting recognition
                // or when recognition is stopped programmatically
                if (error === 'aborted') {
                    debugLog('Aborted error (ignored)');
                    // Don't log or change state for aborted errors
                    return;
                }

                // Handle "no-speech" errors - log them but don't treat as critical
                if (error === 'no-speech') {
                    debugLog('No-speech error - recognition timed out waiting for speech', {
                        timeSinceStart: recognitionRef.current ? Date.now() - lastRestartTimeRef.current : 0,
                        suggestion: 'Try speaking immediately after clicking Start Voice button'
                    });
                    // In non-continuous mode, this is expected - user needs to click again
                    return;
                }

                // Handle microphone permission errors - stop completely
                if (error === 'not-allowed' || error === 'service-not-allowed' || error === 'audio-capture') {
                    debugLog('Microphone permission error', { error });
                    setIsListening(false);
                    setPermissionDenied(true);
                    errorCountRef.current = 10; // Prevent further restarts
                    // Clear any pending restart
                    if (restartTimeoutRef.current) {
                        clearTimeout(restartTimeoutRef.current);
                        restartTimeoutRef.current = null;
                        debugLog('Cleared pending restart due to permission error');
                    }
                    console.warn('Microphone permission denied. Please allow microphone access to use voice commands.');
                    // Call permission denied callback
                    if (onPermissionDeniedRef.current) {
                        onPermissionDeniedRef.current();
                    }
                    // Don't try to restart if permission is denied
                    return;
                }

                // Increment error count for other errors
                errorCountRef.current += 1;
                debugLog('Error count incremented', { errorCount: errorCountRef.current, error });

                // Only log actual errors (not network errors which are expected)
                if (error !== 'network') {
                    console.error('Speech recognition error:', error);
                } else {
                    debugLog('Network error (ignored)');
                }

                // Stop listening if too many errors
                // Set to 10,000 to effectively never stop due to error accumulation
                if (errorCountRef.current >= 10000) {
                    debugLog('Too many errors - stopping recognition', { errorCount: errorCountRef.current });
                    setIsListening(false);
                    // Clear any pending restart
                    if (restartTimeoutRef.current) {
                        clearTimeout(restartTimeoutRef.current);
                        restartTimeoutRef.current = null;
                        debugLog('Cleared pending restart due to too many errors');
                    }
                }
            };

            recognitionRef.current = recognition;
            debugLog('Recognition ref set', { hasRecognition: !!recognitionRef.current });
            debugLog('Initialization complete - waiting for manual start');
        } else {
            debugLog('Speech Recognition API not supported');
            setIsSupported(false);
        }

        return () => {
            debugLog('Cleaning up recognition - component unmounting');

            // Clear any pending restart
            if (restartTimeoutRef.current) {
                clearTimeout(restartTimeoutRef.current);
                restartTimeoutRef.current = null;
                debugLog('Cleared pending restart timeout');
            }

            // Stop recognition if it's running
            if (recognitionRef.current) {
                try {
                    debugLog('Stopping recognition on unmount');
                    recognitionRef.current.stop();
                    setIsListening(false);
                } catch (error) {
                    debugLog('Error stopping recognition on unmount (ignored)', { error });
                    // Ignore errors when stopping
                }
                recognitionRef.current = null;
                debugLog('Recognition ref cleared');
            }
        };
    }, [continuous, language]);

    const startListening = useCallback(() => {
        debugLog('startListening called', { isSupported, hasRef: !!recognitionRef.current, isListening });
        if (isSupported && recognitionRef.current && !isListening) {
            try {
                debugLog('Attempting to start recognition');
                recognitionRef.current.start();
                debugLog('Recognition start() called successfully');
            } catch (error: any) {
                debugLog('Error in start() call', { errorName: error?.name, errorMessage: error?.message });
                // Ignore "already started" errors - recognition might already be running
                if (error.name !== 'InvalidStateError' || !error.message.includes('already started')) {
                    console.error('Error starting speech recognition:', error);
                } else {
                    debugLog('Already started error (ignored)');
                }
            }
        } else {
            debugLog('Cannot start listening', {
                isSupported,
                hasRef: !!recognitionRef.current,
                isListening
            });
        }
    }, [isSupported, isListening]);

    const stopListening = useCallback(() => {
        debugLog('stopListening called', { isSupported, hasRef: !!recognitionRef.current, isListening });
        if (isSupported && recognitionRef.current && isListening) {
            try {
                debugLog('Stopping recognition');
                recognitionRef.current.stop();
                debugLog('Recognition stop() called successfully');
            } catch (error: any) {
                debugLog('Error stopping recognition', { error });
            }
        } else {
            debugLog('Cannot stop listening', {
                isSupported,
                hasRef: !!recognitionRef.current,
                isListening
            });
        }
    }, [isSupported, isListening]);

    const toggleListening = useCallback(() => {
        debugLog('toggleListening called', { currentState: isListening ? 'listening' : 'not listening' });
        if (isListening) {
            debugLog('Stopping (toggle)');
            stopListening();
        } else {
            debugLog('Starting (toggle)');
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    return {
        isListening,
        isSupported,
        recognizedText,
        permissionDenied,
        startListening,
        stopListening,
        toggleListening,
    };
};

// Extend Window interface for TypeScript
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

