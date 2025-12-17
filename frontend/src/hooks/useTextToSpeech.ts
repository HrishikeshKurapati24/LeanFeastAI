import { useState, useEffect, useRef, useCallback } from 'react';
import { convertFractionsToWords } from '../utils/fractionConverter';

export interface UseTextToSpeechOptions {
    onComplete?: () => void;
    onError?: (error: Error) => void;
}

export interface UseTextToSpeechReturn {
    isSpeaking: boolean;
    isPaused: boolean;
    speak: (text: string, options?: { voice?: SpeechSynthesisVoice; rate?: number; pitch?: number; volume?: number }) => void;
    pause: () => void;
    resume: () => void;
    cancel: () => void;
    stop: () => void;
    voices: SpeechSynthesisVoice[];
    isSupported: boolean;
}

export const useTextToSpeech = (options: UseTextToSpeechOptions = {}): UseTextToSpeechReturn => {
    const { autoPlay = false, onComplete, onError } = options;
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [isSupported, setIsSupported] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Check browser support
    useEffect(() => {
        const supported = 'speechSynthesis' in window;
        setIsSupported(supported);

        if (supported) {
            // Load voices (may need to wait for voiceschanged event)
            const loadVoices = () => {
                const availableVoices = window.speechSynthesis.getVoices();
                setVoices(availableVoices);
            };

            loadVoices();
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    const speak = useCallback((text: string, speakOptions?: { voice?: SpeechSynthesisVoice; rate?: number; pitch?: number; volume?: number }) => {
        if (!isSupported) {
            if (onError) {
                onError(new Error('Text-to-speech is not supported in this browser'));
            }
            return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        // Convert fractions to words for better TTS pronunciation
        const convertedText = convertFractionsToWords(text);

        const utterance = new SpeechSynthesisUtterance(convertedText);
        utteranceRef.current = utterance;

        // Set voice
        if (speakOptions?.voice) {
            utterance.voice = speakOptions.voice;
        }

        // Set rate (0.1 to 10, default 1)
        utterance.rate = speakOptions?.rate ?? 1;

        // Set pitch (0 to 2, default 1)
        utterance.pitch = speakOptions?.pitch ?? 1;

        // Set volume (0 to 1, default 1)
        utterance.volume = speakOptions?.volume ?? 1;

        // Event handlers
        utterance.onstart = () => {
            setIsSpeaking(true);
            setIsPaused(false);
        };

        utterance.onend = () => {
            setIsSpeaking(false);
            setIsPaused(false);
            utteranceRef.current = null;
            if (onComplete) {
                onComplete();
            }
        };

        utterance.onerror = (event) => {
            setIsSpeaking(false);
            setIsPaused(false);
            utteranceRef.current = null;
            if (onError) {
                onError(new Error(`Speech synthesis error: ${event.error}`));
            }
        };

        utterance.onpause = () => {
            setIsPaused(true);
        };

        utterance.onresume = () => {
            setIsPaused(false);
        };

        window.speechSynthesis.speak(utterance);
    }, [isSupported, onComplete, onError]);

    const pause = useCallback(() => {
        if (isSupported && window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
        }
    }, [isSupported]);

    const resume = useCallback(() => {
        if (isSupported && window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }
    }, [isSupported]);

    const cancel = useCallback(() => {
        if (isSupported) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            setIsPaused(false);
            utteranceRef.current = null;
        }
    }, [isSupported]);

    const stop = useCallback(() => {
        // Alias for cancel
        cancel();
    }, [cancel]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cancel();
        };
    }, [cancel]);

    return {
        isSpeaking,
        isPaused,
        speak,
        pause,
        resume,
        cancel,
        stop,
        voices,
        isSupported,
    };
};

