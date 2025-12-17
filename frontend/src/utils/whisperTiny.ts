/**
 * Whisper Tiny WebGPU Integration
 * Lazy-loads and caches Whisper Tiny model for speech-to-text
 */

let whisperModel: any = null;
let isInitializing = false;
let initPromise: Promise<any> | null = null;

/**
 * Initialize Whisper Tiny model with WebGPU support
 */
export const initializeWhisper = async (): Promise<any> => {
    if (whisperModel) {
        return whisperModel;
    }

    if (isInitializing && initPromise) {
        return initPromise;
    }

    isInitializing = true;
    initPromise = (async () => {
        try {
            // Dynamic import to lazy-load transformers
            const { pipeline } = await import('@xenova/transformers');

            // Initialize Whisper Tiny model
            // Note: @xenova/transformers automatically handles device selection (WebGPU/CPU)
            // and will fallback to CPU if WebGPU is not available
            try {
                whisperModel = await pipeline(
                    'automatic-speech-recognition',
                    'Xenova/whisper-tiny.en',
                    {
                        quantized: true,
                        // Add error handling for model loading
                        progress_callback: (progress: any) => {
                            if (progress?.status === 'error') {
                                throw new Error('Model loading failed');
                            }
                        },
                    }
                );
            } catch (modelError: any) {
                // If model loading fails (e.g., network issues, CORS), throw a clear error
                const errorMessage = modelError?.message || '';
                const isNetworkError = errorMessage.includes('JSON') ||
                    errorMessage.includes('<!doctype') ||
                    errorMessage.includes('Failed to fetch') ||
                    errorMessage.includes('NetworkError') ||
                    errorMessage.includes('CORS') ||
                    errorMessage.includes('network');

                if (isNetworkError) {
                    throw new Error('Whisper model files could not be loaded. Please check your internet connection or use voice commands fallback.');
                }
                throw modelError;
            }

            isInitializing = false;
            return whisperModel;
        } catch (error: any) {
            isInitializing = false;
            initPromise = null;

            // Provide more helpful error messages
            const errorMessage = error?.message || '';
            const isNetworkError = errorMessage.includes('JSON') ||
                errorMessage.includes('<!doctype') ||
                errorMessage.includes('Failed to fetch') ||
                errorMessage.includes('NetworkError') ||
                errorMessage.includes('CORS') ||
                errorMessage.includes('network');

            if (isNetworkError) {
                // Silently fail for network issues - this is expected and fallback will work
                // Don't log to console as it's not an error, just a fallback scenario
            } else {
                console.error('Failed to initialize Whisper:', error);
            }
            throw error;
        }
    })();

    return initPromise;
};

/**
 * Transcribe audio using Whisper Tiny
 */
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    if (!whisperModel) {
        await initializeWhisper();
    }

    try {
        // @xenova/transformers can work directly with audio URLs or File objects
        // For blob, we can create an object URL or convert to File
        const audioFile = new File([audioBlob], 'audio.wav', { type: audioBlob.type || 'audio/wav' });

        // Run transcription
        const result = await whisperModel(audioFile, {
            language: 'en',
            task: 'transcribe',
        });

        return result?.text || '';
    } catch (error) {
        console.error('Transcription error:', error);
        throw error;
    }
};

/**
 * Check if WebGPU is supported
 */
export const isWebGPUSupported = (): boolean => {
    if (typeof navigator === 'undefined') {
        return false;
    }
    const nav = navigator as any;
    return 'gpu' in nav && typeof nav.gpu?.requestAdapter === 'function';
};

/**
 * Preload Whisper model (call on pages where it might be used)
 * Returns false if preload failed (so caller knows to use fallback)
 */
export const preloadWhisper = async (): Promise<boolean> => {
    // Don't preload if already initialized or initializing
    if (whisperModel || isInitializing) {
        return true;
    }

    try {
        await initializeWhisper();
        return true;
    } catch (error: any) {
        // Silently fail - SpeechRecognition API will be used as fallback
        // Network/CORS errors are expected and don't need logging
        const errorMessage = error?.message || '';
        const isNetworkError = errorMessage.includes('JSON') ||
            errorMessage.includes('<!doctype') ||
            errorMessage.includes('Failed to fetch') ||
            errorMessage.includes('NetworkError') ||
            errorMessage.includes('CORS') ||
            errorMessage.includes('network') ||
            errorMessage.includes('could not be loaded');

        // Only log unexpected errors
        if (!isNetworkError) {
            console.warn('Whisper preload failed, will use SpeechRecognition fallback:', error);
        }
        return false;
    }
};