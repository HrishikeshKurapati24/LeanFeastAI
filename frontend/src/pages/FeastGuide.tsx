import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useAppDispatch } from '../store/hooks';
import { fetchRecentMeals } from '../store/thunks/userThunks';
import FloatingFoodIcons from '../components/FloatingFoodIcons';
import FeastGuideHeader from '../components/feast-guide/FeastGuideHeader';
import StepCard from '../components/feast-guide/StepCard';
import StepsList from '../components/feast-guide/StepsList';
import VoiceCommandsHelp from '../components/feast-guide/VoiceCommandsHelp';
import IngredientsList from '../components/feast-guide/IngredientsList';
import { useTimer } from '../hooks/useTimer';
import { saveProgress, loadProgress, saveSettings, loadSettings, clearProgress, type VoiceSettings } from '../utils/feastGuideStorage';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { normalizeSteps, type NormalizedStep } from '../utils/stepNormalizer';
import { preloadWhisper } from '../utils/whisperTiny';
import Toast from '../components/Toast';
import { usePorcupine } from '@picovoice/porcupine-react';

interface BackendStep {
    step_number?: number;
    instruction?: string;
    text?: string;
    image_url?: string;
}

interface Recipe {
    id: string;
    title: string;
    description?: string;
    serving_size?: number;
    prep_time?: number;
    cook_time?: number;
    ingredients?: string[] | Array<{ name: string; quantity?: string; unit?: string }>;
    steps: BackendStep[];
}

export default function FeastGuide() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const dispatch = useAppDispatch();
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [normalizedSteps, setNormalizedSteps] = useState<NormalizedStep[]>([]);
    const [loading, setLoading] = useState(false); // Start with false for instant render
    const [error, setError] = useState<string | null>(null);

    // Redirect to login if user is not authenticated
    useEffect(() => {
        if (!user?.id) {
            navigate('/login', { replace: true });
            return;
        }
    }, [user?.id, navigate]);

    // Don't render if user is not authenticated
    if (!user?.id) {
        return null;
    }

    // Step navigation state
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
    const [isStepsListExpanded, setIsStepsListExpanded] = useState(false);

    // Playback state
    const [isPlaying, setIsPlaying] = useState(false);
    const [autoPlayEnabled, setAutoPlayEnabled] = useState(false);
    const wasPlayingBeforeVoiceRef = useRef(false); // Track if TTS was playing when voice recognition started
    const autoModeTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Track auto-mode timeout
    const isAutoModeActiveRef = useRef(false); // Track if auto-mode progression is active
    const normalizedStepsRef = useRef<NormalizedStep[]>([]); // Ref for normalized steps
    const currentStepIndexRef = useRef(0); // Ref for current step index
    const completedStepsRef = useRef<Set<number>>(new Set()); // Ref for completed steps
    const sentenceQueueRef = useRef<string[]>([]); // Queue of sentences to read
    const currentSentenceIndexRef = useRef(0); // Current sentence being read

    // Voice settings
    const [voiceSpeed, setVoiceSpeed] = useState(1);
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | undefined>();
    const [selectedLanguage, setSelectedLanguage] = useState('en');
    const [showCaptions, setShowCaptions] = useState(false);
    const [isHandsFreeEnabled, setIsHandsFreeEnabled] = useState(false);

    // Refs for TTS functions/values (to avoid stale closures in timer callback)
    const speakRef = useRef<((text: string, options?: any) => void) | null>(null);
    const selectedVoiceRef = useRef<SpeechSynthesisVoice | undefined>(undefined);
    const voiceSpeedRef = useRef(1);

    // Voice commands help state
    const voiceCommandsHelpRef = useRef<HTMLDivElement>(null);
    const [voiceCommandsHelpExpanded, setVoiceCommandsHelpExpanded] = useState(false);

    // Handler to scroll to and expand voice commands help
    const handleShowVoiceCommandsHelp = useCallback(() => {
        setVoiceCommandsHelpExpanded(true);
        // Scroll to the voice commands help section
        setTimeout(() => {
            voiceCommandsHelpRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }, []);

    // Timer state
    const currentStepForTimer = normalizedSteps[currentStepIndex];
    const timerSeconds = currentStepForTimer?.timer_seconds;
    const {
        start: startTimer,
        pause: pauseTimer,
        resume: resumeTimer,
        reset: resetTimer,
        remainingSeconds: timerRemainingSeconds,
        isRunning: isTimerRunning,
        isPaused: isTimerPaused,
        setTime: setTimerTime
    } = useTimer({
        initialSeconds: timerSeconds || 0,
        onComplete: () => {
            // Play sound on completion
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGWi77+efTRAMUKfj8LZjHAY4kdfyzHksBSR3x/Dej0AKFF606euoVRQKRp/g8r5sIQUrgc7y2Yk2CBlo');
            audio.play().catch(() => { });

            setToastMessage('Timer completed! ⏰');
            setShowToast(true);

            // TTS announcement for timer completion (using refs to avoid stale closures)
            if (speakRef.current && selectedVoiceRef.current) {
                speakRef.current('Timer completed!', {
                    voice: selectedVoiceRef.current,
                    rate: voiceSpeedRef.current,
                });
            }

            // Auto-mode: advance to next step after timer completes
            if (autoPlayEnabled && isAutoModeActiveRef.current) {
                const currentIdx = currentStepIndexRef.current;
                const steps = normalizedStepsRef.current;

                if (currentIdx < steps.length - 1) {
                    handleNext();
                } else {
                    // Last step completed
                    const completed = completedStepsRef.current;
                    setCompletedSteps(new Set([...completed, currentIdx]));
                    setToastMessage('Recipe completed! 🎉');
                    setShowToast(true);
                }
                isAutoModeActiveRef.current = false;
            }
        },
    });

    // Update refs when state changes
    useEffect(() => {
        currentStepIndexRef.current = currentStepIndex;
    }, [currentStepIndex]);

    useEffect(() => {
        completedStepsRef.current = completedSteps;
    }, [completedSteps]);

    useEffect(() => {
        normalizedStepsRef.current = normalizedSteps;
    }, [normalizedSteps]);

    // Update timer when step changes (only reset if timer is not running)
    useEffect(() => {
        if (currentStepForTimer?.timer_seconds) {
            // Only reset timer if it's not currently running
            if (!isTimerRunning && !isTimerPaused) {
                setTimerTime(currentStepForTimer.timer_seconds);
                resetTimer();
            }
        }
    }, [currentStepIndex, currentStepForTimer?.timer_seconds, setTimerTime, resetTimer, isTimerRunning, isTimerPaused]);

    // Toast state
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    // Porcupine wake-word (LeanFeast) integration for hands-free mode
    const porcupineAccessKey = import.meta.env.VITE_PV_ACCESS_KEY;
    const porcupineKeywordBase64 = import.meta.env.VITE_PV_LEANFEAST_KEYWORD;
    const porcupineModelPath = import.meta.env.VITE_PV_MODEL_PATH || '/porcupine/porcupine_params.pv';

    const { init: initPorcupine, start: startPorcupine, stop: stopPorcupine, isListening: isWakeListening, keywordDetection } = usePorcupine();

    // State to trigger voice command listening when wake-word is detected
    const [shouldTriggerVoiceCommand, setShouldTriggerVoiceCommand] = useState(false);

    // Initialize / start or stop Porcupine based on hands-free flag
    useEffect(() => {
        const setupHandsFree = async () => {
            if (!isHandsFreeEnabled) {
                stopPorcupine();
                return;
            }

            if (!porcupineAccessKey || !porcupineKeywordBase64) {
                setToastMessage('Hands-free requires Porcupine access key and keyword configuration.');
                setToastType('error');
                setShowToast(true);
                setIsHandsFreeEnabled(false);
                return;
            }

            try {
                const keyword = {
                    label: 'LeanFeast',
                    base64: porcupineKeywordBase64,
                };

                const model = {
                    publicPath: porcupineModelPath,
                };

                // Initialize Porcupine - keywordDetection state will be used to detect the wake-word
                await initPorcupine(porcupineAccessKey, [keyword], model);

                await startPorcupine();
                setToastType('success');
                setToastMessage('Hands-free mode enabled. Say "LeanFeast" followed by a command.');
                setShowToast(true);
            } catch (err) {
                console.error('Error initializing Porcupine hands-free mode:', err);
                setToastMessage('Failed to start hands-free mode. Please check your microphone and Porcupine configuration.');
                setToastType('error');
                setShowToast(true);
                setIsHandsFreeEnabled(false);
                stopPorcupine();
            }
        };

        setupHandsFree();

        return () => {
            // Stop wake-word listening when component unmounts or hands-free toggles off
            if (!isHandsFreeEnabled) {
                stopPorcupine();
            }
        };
    }, [
        isHandsFreeEnabled,
        porcupineAccessKey,
        porcupineKeywordBase64,
        porcupineModelPath,
        initPorcupine,
        startPorcupine,
        stopPorcupine,
    ]);

    // Pause hands-free when tab is hidden, resume when visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                stopPorcupine();
            } else if (document.visibilityState === 'visible' && isHandsFreeEnabled) {
                // Resume listening when tab becomes visible again
                startPorcupine().catch((err) => {
                    console.error('Error resuming Porcupine:', err);
                });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [stopPorcupine, startPorcupine, isHandsFreeEnabled]);

    // React to wake-word detection - trigger voice command listening
    useEffect(() => {
        if (keywordDetection && isHandsFreeEnabled) {
            // Wake-word detected! Show toast and trigger voice command listening
            setToastType('success');
            setToastMessage('Heard LeanFeast! Listening for command...');
            setShowToast(true);

            // Trigger voice command listening in StepCard
            setShouldTriggerVoiceCommand(true);
        }
    }, [keywordDetection, isHandsFreeEnabled]);

    // Refs for debouncing
    const saveProgressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const backendSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    // Helper function to split text into sentences
    const splitIntoSentences = useCallback((text: string): string[] => {
        // Split by sentence-ending punctuation, keeping the punctuation
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
        // If no sentence-ending punctuation found, treat entire text as one sentence
        if (sentences.length === 0) {
            return [text.trim()].filter(s => s.length > 0);
        }
        return sentences.map(s => s.trim()).filter(s => s.length > 0);
    }, []);

    // Function to read next sentence in queue (will be defined after useTextToSpeech)
    const readNextSentenceRef = useRef<(() => void) | null>(null);

    const { speak, pause: pauseTTS, resume: resumeTTS, cancel, stop, voices } = useTextToSpeech({
        onComplete: () => {
            setIsPlaying(false);

            // Auto-mode progression: wait 5 seconds after each sentence
            if (autoPlayEnabled && isAutoModeActiveRef.current && readNextSentenceRef.current) {
                // Wait 5 seconds before reading next sentence
                autoModeTimeoutRef.current = setTimeout(() => {
                    if (readNextSentenceRef.current) {
                        readNextSentenceRef.current();
                    }
                }, 5000); // 5 seconds
            }
        },
    });

    // Update TTS refs when values change (for timer callback to use)
    useEffect(() => {
        speakRef.current = speak;
    }, [speak]);

    useEffect(() => {
        selectedVoiceRef.current = selectedVoice;
    }, [selectedVoice]);

    useEffect(() => {
        voiceSpeedRef.current = voiceSpeed;
    }, [voiceSpeed]);

    // Handler for toggling hands-free mode with TTS announcement
    const handleToggleHandsFree = useCallback(() => {
        setIsHandsFreeEnabled(prev => {
            const newValue = !prev;
            // TTS announcement
            if (speak && selectedVoice) {
                if (newValue) {
                    speak('Hands-free cooking enabled. Say LeanFeast to activate voice commands.', {
                        voice: selectedVoice,
                        rate: voiceSpeed,
                    });
                } else {
                    speak('Hands-free cooking disabled.', {
                        voice: selectedVoice,
                        rate: voiceSpeed,
                    });
                }
            }
            return newValue;
        });
    }, [speak, selectedVoice, voiceSpeed]);

    // Define readNextSentence after speak is available
    // Use refs to avoid dependency on handleNext which is defined later
    const handleNextRef = useRef<(() => void) | null>(null);
    const readNextSentence = useCallback(() => {
        // Check if we've read all sentences
        if (sentenceQueueRef.current.length === 0 || currentSentenceIndexRef.current >= sentenceQueueRef.current.length) {
            // All sentences read, proceed with timer/advance logic
            const currentIdx = currentStepIndexRef.current;
            const steps = normalizedStepsRef.current;
            const step = steps[currentIdx];

            // Check if step has a timer
            if (step?.timer_seconds && step.timer_seconds > 0) {
                // Start timer automatically - wait for timer to complete before continuing
                startTimer(step.timer_seconds);
                // Don't continue reading - timer completion will handle advancement
                return;
            } else {
                // No timer, wait 15 seconds before advancing to next step
                if (currentIdx < steps.length - 1) {
                    // Clear any existing timeout before setting a new one
                    if (autoModeTimeoutRef.current) {
                        clearTimeout(autoModeTimeoutRef.current);
                    }
                    // Wait 15 seconds before advancing
                    autoModeTimeoutRef.current = setTimeout(() => {
                        if (handleNextRef.current) {
                            handleNextRef.current();
                        }
                    }, 15000); // 15 seconds delay
                } else {
                    // Last step completed
                    const completed = completedStepsRef.current;
                    setCompletedSteps(new Set([...completed, currentIdx]));
                    setToastMessage('Recipe completed! 🎉');
                    setShowToast(true);
                    isAutoModeActiveRef.current = false;
                }
                return;
            }
        }

        // Get the current sentence index
        const currentIndex = currentSentenceIndexRef.current;

        // Read the sentence at the current index
        const sentence = sentenceQueueRef.current[currentIndex];
        if (sentence) {
            // Increment the index AFTER getting the sentence but BEFORE speaking
            // This ensures the next call will read the next sentence
            currentSentenceIndexRef.current = currentIndex + 1;

            speak(sentence, {
                voice: selectedVoice,
                rate: voiceSpeed,
            });
            setIsPlaying(true);
        }
    }, [speak, selectedVoice, voiceSpeed, startTimer]);

    // Update ref so onComplete can call it
    readNextSentenceRef.current = readNextSentence;

    const recipeId = id || localStorage.getItem('current_recipe_id');

    // Preload Whisper on mount (silently fail - fallback to SpeechRecognition)
    useEffect(() => {
        // Try to load Whisper, but don't block or show errors if it fails
        // SpeechRecognition API will be used as fallback automatically
        preloadWhisper().catch(() => {
            // Silently fail - this is expected in many environments (CORS, network, etc.)
            // SpeechRecognition API will work as fallback
        });
    }, []);

    // Refetch recent meals when FeastGuide page is rendered (non-blocking)
    useEffect(() => {
        if (user?.id) {
            dispatch(fetchRecentMeals({ userId: user.id, page: 1 }));
        }
    }, [user?.id, dispatch]);

    // Fetch recipe and load saved progress (non-blocking)
    useEffect(() => {
        const fetchRecipe = async () => {
            if (!recipeId) {
                setError('No recipe ID provided');
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const session = await supabase.auth.getSession();
                if (!session.data.session?.access_token) {
                    throw new Error('Not authenticated');
                }

                const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                const response = await fetch(`${backendUrl}/api/recipes/${recipeId}`, {
                    headers: {
                        'Authorization': `Bearer ${session.data.session.access_token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch recipe: ${response.statusText}`);
                }

                const result = await response.json();
                const recipeData = result.recipe;

                setRecipe(recipeData);

                // Store recipe ID in localStorage for hard refresh support
                if (recipeId) {
                    localStorage.setItem('current_recipe_id', recipeId);
                }

                // Normalize steps (frontend-only transformation)
                if (recipeData.steps && Array.isArray(recipeData.steps)) {
                    const normalized = normalizeSteps(recipeData.steps);
                    setNormalizedSteps(normalized);
                } else {
                    setNormalizedSteps([]);
                }

                // Log step-by-step action to backend (non-blocking, fire and forget)
                // Note: sendBeacon doesn't support custom headers, so we use fetch for authenticated requests
                setTimeout(() => {
                    fetch(`${backendUrl}/api/recipes/${recipeId}/step-by-step`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${session.data.session?.access_token}`,
                            'Content-Type': 'application/json',
                        },
                        keepalive: true, // Keep request alive even if page unloads
                    }).catch((err) => {
                        // Silently fail - don't show error to user
                        console.error('Error tracking step-by-step action:', err);
                    });
                }, 0);

                // Load saved progress (only if not completed)
                const savedProgress = loadProgress(recipeId);
                if (savedProgress) {
                    if (savedProgress.localState?.completed) {
                        // Recipe was completed - clear progress and start from the beginning
                        clearProgress(recipeId);
                        setCurrentStepIndex(0);
                        setCompletedSteps(new Set());
                    } else if (savedProgress.currentIndex < (recipeData.steps?.length || 0)) {
                        // Only restore progress if recipe is not marked as completed
                        setCurrentStepIndex(savedProgress.currentIndex);
                        if (savedProgress.localState?.completedSteps) {
                            setCompletedSteps(new Set(savedProgress.localState.completedSteps));
                        }
                    }
                }

                // Load saved settings
                const savedSettings = loadSettings(recipeId);
                if (savedSettings) {
                    setVoiceSpeed(savedSettings.speed || 1);
                    setSelectedLanguage(savedSettings.language || 'en');
                    setAutoPlayEnabled(savedSettings.autoPlay || false);
                    setShowCaptions(savedSettings.autoPlay || false);
                    setIsHandsFreeEnabled(!!savedSettings.handsFreeEnabled);
                }

            } catch (err) {
                console.error('Error fetching recipe:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch recipe');
            } finally {
                setLoading(false);
            }
        };

        fetchRecipe();
    }, [recipeId, voices, selectedVoice, selectedLanguage]);

    // Default voice selection (memoized)
    const defaultVoice = useMemo(() => {
        if (voices.length === 0 || selectedVoice) {
            return undefined;
        }
        const googleUSEnglish = voices.find(v =>
            v.name.toLowerCase().includes('google') &&
            v.name.toLowerCase().includes('us english')
        );
        return googleUSEnglish ||
            voices.find(v => v.lang.startsWith(selectedLanguage)) ||
            voices[0];
    }, [voices, selectedLanguage, selectedVoice]);

    // Update selected voice when default voice changes
    useEffect(() => {
        if (defaultVoice && !selectedVoice) {
            setSelectedVoice(defaultVoice);
        }
    }, [defaultVoice, selectedVoice]);

    // Save progress to localStorage immediately (debounced 1s)
    const debouncedSaveProgress = useCallback(() => {
        if (!recipeId || !normalizedSteps.length) return;

        if (saveProgressTimeoutRef.current) {
            clearTimeout(saveProgressTimeoutRef.current);
        }

        saveProgressTimeoutRef.current = setTimeout(() => {
            saveProgress(recipeId, currentStepIndex, Date.now(), {
                completedSteps: Array.from(completedSteps),
            });
        }, 1000);
    }, [recipeId, normalizedSteps.length, currentStepIndex, completedSteps]);

    // Save progress to backend (throttled 5-10 seconds)
    const throttledBackendSave = useCallback(() => {
        if (!recipeId || !normalizedSteps.length) return;

        if (backendSaveTimeoutRef.current) {
            clearTimeout(backendSaveTimeoutRef.current);
        }

        backendSaveTimeoutRef.current = setTimeout(async () => {
            try {
                const session = await supabase.auth.getSession();
                if (session.data.session?.access_token) {
                    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                    await fetch(`${backendUrl}/api/recipes/${recipeId}/progress`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${session.data.session.access_token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            current_index: currentStepIndex,
                            timestamp: Date.now(),
                            local_state: {
                                completedSteps: Array.from(completedSteps),
                            },
                        }),
                    });
                }
            } catch (error) {
                console.error('Error saving progress to backend:', error);
            }
        }, 7000); // 7 seconds throttle
    }, [recipeId, normalizedSteps.length, currentStepIndex, completedSteps]);

    // Save progress when step changes (localStorage + backend)
    useEffect(() => {
        debouncedSaveProgress();
        throttledBackendSave();
    }, [currentStepIndex, completedSteps, debouncedSaveProgress, throttledBackendSave]);

    // Get current step (memoized)
    const currentStep = useMemo(() => {
        return normalizedSteps[currentStepIndex];
    }, [normalizedSteps, currentStepIndex]);

    // Navigation handlers
    const handlePrevious = useCallback(() => {
        if (currentStepIndex > 0) {
            // Cancel auto-mode if active
            if (autoModeTimeoutRef.current) {
                clearTimeout(autoModeTimeoutRef.current);
                autoModeTimeoutRef.current = null;
            }
            isAutoModeActiveRef.current = false;

            stop();
            setIsPlaying(false);
            setCurrentStepIndex(currentStepIndex - 1);
        }
    }, [currentStepIndex, stop]);

    const handleNext = useCallback(() => {
        // Update ref so readNextSentence can call it
        handleNextRef.current = handleNext;

        // Cancel auto-mode if active
        if (autoModeTimeoutRef.current) {
            clearTimeout(autoModeTimeoutRef.current);
            autoModeTimeoutRef.current = null;
        }
        isAutoModeActiveRef.current = false;

        if (normalizedSteps.length > 0 && currentStepIndex < normalizedSteps.length - 1) {
            stop();
            setIsPlaying(false);
            setCurrentStepIndex(currentStepIndex + 1);
        } else if (normalizedSteps.length > 0) {
            // Mark as completed
            setCompletedSteps(new Set([...completedSteps, currentStepIndex]));
            setToastMessage('Recipe completed! 🎉');
            setShowToast(true);
        }
    }, [normalizedSteps.length, currentStepIndex, completedSteps, stop]);

    const handleStepClick = useCallback((index: number) => {
        // Cancel auto-mode if active
        if (autoModeTimeoutRef.current) {
            clearTimeout(autoModeTimeoutRef.current);
            autoModeTimeoutRef.current = null;
        }
        isAutoModeActiveRef.current = false;

        stop();
        setIsPlaying(false);
        setCurrentStepIndex(index);
    }, [stop]);

    const handlePlayPause = useCallback(() => {
        // Cancel auto-mode if user manually controls playback
        if (autoModeTimeoutRef.current) {
            clearTimeout(autoModeTimeoutRef.current);
            autoModeTimeoutRef.current = null;
        }
        isAutoModeActiveRef.current = false;

        if (isPlaying) {
            pauseTTS();
            setIsPlaying(false);
        } else {
            if (currentStep) {
                speak(currentStep.text, {
                    voice: selectedVoice,
                    rate: voiceSpeed,
                });
                setIsPlaying(true);
            }
        }
    }, [isPlaying, currentStep, selectedVoice, voiceSpeed, speak, pauseTTS]);

    const handleStop = useCallback(() => {
        stop();
        setIsPlaying(false);
    }, [stop]);

    // Pause TTS when voice recognition starts
    const handleVoiceListeningStart = useCallback(() => {
        // Track if TTS was playing before we pause it
        wasPlayingBeforeVoiceRef.current = isPlaying || window.speechSynthesis.speaking;
        if (wasPlayingBeforeVoiceRef.current) {
            pauseTTS();
            setIsPlaying(false);
        }
    }, [pauseTTS, isPlaying]);

    // Resume TTS when voice recognition ends without a command (user said something unrecognized)
    const handleVoiceListeningEnd = useCallback(() => {
        // Resume TTS if it was playing before voice recognition started
        if (wasPlayingBeforeVoiceRef.current && window.speechSynthesis.paused) {
            resumeTTS();
            setIsPlaying(true);
            wasPlayingBeforeVoiceRef.current = false;
        }
    }, [resumeTTS]);

    const handlePermissionDenied = useCallback(() => {
        setToastMessage('Microphone permission denied. Please allow microphone access in your browser settings to use voice commands.');
        setShowToast(true);
    }, []);

    const handleRepeat = useCallback(() => {
        if (currentStep) {
            cancel();
            speak(currentStep.text, {
                voice: selectedVoice,
                rate: voiceSpeed,
            });
            setIsPlaying(true);
        }
    }, [currentStep, selectedVoice, voiceSpeed, speak, cancel]);

    // Save settings when they change
    useEffect(() => {
        if (!recipeId) return;

        const settings: VoiceSettings = {
            speed: voiceSpeed,
            voiceName: selectedVoice?.name,
            language: selectedLanguage,
            autoPlay: autoPlayEnabled,
            handsFreeEnabled: isHandsFreeEnabled,
        };
        saveSettings(recipeId, settings);
    }, [recipeId, voiceSpeed, selectedVoice, selectedLanguage, autoPlayEnabled, isHandsFreeEnabled]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't handle if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    handlePrevious();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    handleNext();
                    break;
                case ' ':
                case 'Enter':
                    e.preventDefault();
                    handlePlayPause();
                    break;
                case 'r':
                case 'R':
                    e.preventDefault();
                    handleRepeat();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleNext, handlePrevious, handlePlayPause, handleRepeat]);

    // Auto-play TTS on step change (only if user enabled it)
    useEffect(() => {
        // Only reset and start auto-play when step index actually changes
        // Reset auto-mode state when step changes
        if (autoModeTimeoutRef.current) {
            clearTimeout(autoModeTimeoutRef.current);
            autoModeTimeoutRef.current = null;
        }
        isAutoModeActiveRef.current = false;
        currentSentenceIndexRef.current = 0;
        sentenceQueueRef.current = [];

        if (autoPlayEnabled && normalizedSteps.length > 0 && currentStepIndex < normalizedSteps.length) {
            const step = normalizedSteps[currentStepIndex];
            if (step) {
                // Small delay to ensure step is rendered
                const timer = setTimeout(() => {
                    // Only start if not already playing (check refs, not state)
                    const isCurrentlyPlaying = window.speechSynthesis.speaking || window.speechSynthesis.pending;
                    if (!isCurrentlyPlaying) {
                        // Split text into sentences for auto-mode
                        const sentences = splitIntoSentences(step.text);
                        sentenceQueueRef.current = sentences;
                        currentSentenceIndexRef.current = 0;
                        isAutoModeActiveRef.current = true;

                        // Start reading first sentence using ref to avoid dependency issues
                        if (sentences.length > 0 && readNextSentenceRef.current) {
                            readNextSentenceRef.current();
                        }
                    }
                }, 300);
                return () => clearTimeout(timer);
            }
        }
    }, [currentStepIndex, autoPlayEnabled, normalizedSteps, splitIntoSentences]); // Depend on normalizedSteps array, not currentStep object

    // Save progress on unload
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (recipeId && recipe) {
                saveProgress(recipeId, currentStepIndex, Date.now(), {
                    completedSteps: Array.from(completedSteps),
                });
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (saveProgressTimeoutRef.current) {
                clearTimeout(saveProgressTimeoutRef.current);
            }
        };
    }, [recipeId, recipe, currentStepIndex, completedSteps]);

    const handleVoiceCommand = useCallback((command: string, params?: { minutes?: number; seconds?: number }) => {
        // Commands that should NOT resume TTS (step-related commands)
        const stepRelatedCommands = ['next', 'back', 'previous', 'repeat', 'repeat_step', 'read_step', 'stop_tts', 'pause_tts', 'pause'];
        const shouldResumeTTS = wasPlayingBeforeVoiceRef.current && !stepRelatedCommands.includes(command);

        // Visual feedback: show toast for voice command recognition (except for timer which has its own message)
        if (command !== 'start_timer' && command !== 'pause_timer' && command !== 'resume_timer' && command !== 'reset_timer') {
            setToastMessage(`Voice command: ${command}`);
            setShowToast(true);
        }

        switch (command) {
            case 'next':
                wasPlayingBeforeVoiceRef.current = false; // Don't resume after step change
                handleNext();
                break;
            case 'back':
            case 'previous':
                wasPlayingBeforeVoiceRef.current = false; // Don't resume after step change
                handlePrevious();
                break;
            case 'repeat':
            case 'repeat_step':
                wasPlayingBeforeVoiceRef.current = false; // Don't resume - new TTS will start
                handleRepeat();
                break;
            case 'read_step':
                wasPlayingBeforeVoiceRef.current = false; // Don't resume - new TTS will start
                // Play audio on explicit command
                if (currentStep) {
                    cancel();
                    speak(currentStep.text, {
                        voice: selectedVoice,
                        rate: voiceSpeed,
                    });
                    setIsPlaying(true);
                }
                break;
            case 'pause_tts':
                wasPlayingBeforeVoiceRef.current = false; // Don't resume - explicitly paused
                pauseTTS();
                setIsPlaying(false);
                break;
            case 'resume_tts':
                wasPlayingBeforeVoiceRef.current = false; // Already resuming
                resumeTTS();
                setIsPlaying(true);
                break;
            case 'stop_tts':
                wasPlayingBeforeVoiceRef.current = false; // Don't resume - explicitly stopped
                stop();
                setIsPlaying(false);
                break;
            case 'start_timer':
                // Prioritize voice command parameter over step's default duration
                if (params?.seconds !== undefined) {
                    // Handle seconds
                    startTimer(params.seconds);
                    setToastMessage(`Timer started for ${params.seconds} second${params.seconds !== 1 ? 's' : ''}! ⏰`);
                    setShowToast(true);
                    // TTS announcement for timer start (don't resume main TTS - timer announcement replaces it)
                    wasPlayingBeforeVoiceRef.current = false;
                    if (selectedVoice) {
                        speak(`Timer started for ${params.seconds} second${params.seconds !== 1 ? 's' : ''}`, {
                            voice: selectedVoice,
                            rate: voiceSpeed,
                        });
                    }
                } else if (params?.minutes) {
                    // Handle minutes
                    const timerSeconds = params.minutes * 60;
                    startTimer(timerSeconds);
                    setToastMessage(`Timer started for ${params.minutes} minute${params.minutes > 1 ? 's' : ''}! ⏰`);
                    setShowToast(true);
                    // TTS announcement for timer start (don't resume main TTS - timer announcement replaces it)
                    wasPlayingBeforeVoiceRef.current = false;
                    if (selectedVoice) {
                        speak(`Timer started for ${params.minutes} minute${params.minutes > 1 ? 's' : ''}`, {
                            voice: selectedVoice,
                            rate: voiceSpeed,
                        });
                    }
                } else if (currentStep?.timer_seconds) {
                    // Fall back to step's default duration if no parameter provided
                    startTimer(currentStep.timer_seconds);
                    const minutes = Math.floor(currentStep.timer_seconds / 60);
                    const seconds = currentStep.timer_seconds % 60;
                    const timerText = minutes > 0
                        ? `Timer started for ${minutes} minute${minutes > 1 ? 's' : ''}`
                        : `Timer started for ${seconds} second${seconds !== 1 ? 's' : ''}`;
                    setToastMessage('Timer started! ⏰');
                    setShowToast(true);
                    // TTS announcement for timer start (don't resume main TTS - timer announcement replaces it)
                    wasPlayingBeforeVoiceRef.current = false;
                    if (selectedVoice) {
                        speak(timerText, {
                            voice: selectedVoice,
                            rate: voiceSpeed,
                        });
                    }
                }
                break;
            case 'pause_timer':
                pauseTimer();
                setToastMessage('Timer paused');
                setShowToast(true);
                // Resume TTS if it was playing before voice recognition
                if (shouldResumeTTS) {
                    resumeTTS();
                    setIsPlaying(true);
                    wasPlayingBeforeVoiceRef.current = false;
                }
                break;
            case 'resume_timer':
                resumeTimer();
                setToastMessage('Timer resumed');
                setShowToast(true);
                // Resume TTS if it was playing before voice recognition
                if (shouldResumeTTS) {
                    resumeTTS();
                    setIsPlaying(true);
                    wasPlayingBeforeVoiceRef.current = false;
                }
                break;
            case 'reset_timer':
                resetTimer();
                // If step has a default timer, set it back to that duration
                if (currentStep?.timer_seconds) {
                    setTimerTime(currentStep.timer_seconds);
                }
                setToastMessage('Timer reset');
                setShowToast(true);
                // Resume TTS if it was playing before voice recognition
                if (shouldResumeTTS) {
                    resumeTTS();
                    setIsPlaying(true);
                    wasPlayingBeforeVoiceRef.current = false;
                }
                break;
            case 'pause':
                wasPlayingBeforeVoiceRef.current = false; // Don't resume - explicitly paused
                // Generic pause - pause both TTS and timer
                pauseTTS();
                pauseTimer();
                setIsPlaying(false);
                break;
            default:
                // For unknown commands, resume TTS if it was playing
                if (shouldResumeTTS) {
                    resumeTTS();
                    setIsPlaying(true);
                    wasPlayingBeforeVoiceRef.current = false;
                }
                break;
        }
    }, [currentStep, selectedVoice, voiceSpeed, speak, cancel, pauseTTS, resumeTTS, stop, startTimer, pauseTimer, resumeTimer, resetTimer, handleNext, handlePrevious, handleRepeat]);

    const handleEndGuide = async () => {
        if (window.confirm('Are you sure you want to end the guide?')) {
            cancel();
            const recipeIdToUse = id || localStorage.getItem('current_recipe_id');

            // Mark recipe as completed (100% progress) - non-blocking
            if (recipeIdToUse && normalizedSteps.length > 0) {
                try {
                    const session = await supabase.auth.getSession();
                    if (session.data.session?.access_token) {
                        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                        // Fire and forget - don't wait for response
                        fetch(`${backendUrl}/api/recipes/${recipeIdToUse}/progress`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${session.data.session.access_token}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                current_index: normalizedSteps.length - 1, // Last step index
                                timestamp: Date.now(),
                                local_state: {
                                    completedSteps: Array.from(Array(normalizedSteps.length).keys()), // All steps completed
                                    completed: true, // Mark as fully completed
                                },
                            }),
                            keepalive: true, // Keep request alive even if page unloads
                        }).catch((err) => {
                            // Silently fail - don't block navigation
                            console.error('Error marking recipe as completed:', err);
                        });
                    }
                } catch (error) {
                    // Silently fail - don't block navigation
                    console.error('Error marking recipe as completed:', error);
                }

                // Update localStorage to mark as completed
                saveProgress(recipeIdToUse, normalizedSteps.length - 1, Date.now(), {
                    completedSteps: Array.from(Array(normalizedSteps.length).keys()),
                    completed: true, // Mark as fully completed
                });
            }

            // Navigate to Feast Studio
            navigate('/feast-studio');
        }
    };

    const handleBackToRecipe = () => {
        const recipeId = localStorage.getItem('current_recipe_id');
        if (recipeId) {
            navigate(`/recipe/${recipeId}`);
        } else {
            navigate('/feast-studio');
        }
    };


    const totalTime = useMemo(() => {
        return recipe ? (recipe.prep_time || 0) + (recipe.cook_time || 0) : 0;
    }, [recipe?.prep_time, recipe?.cook_time]);

    // Show skeleton UI while loading (non-blocking render)
    const showSkeleton = loading && !recipe;

    // Only show error if we're sure there's an error and not just still loading
    // Don't redirect on hard refresh - stay on the page and show error state
    if (error && !loading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center px-2 sm:px-3 md:px-4 py-6 sm:py-8 md:py-12 bg-gradient-to-br from-[#fafcfb] via-[#f0fdf4] to-[#dcfce7]"
            >
                <div className="text-center max-w-md">
                    <h1 className="text-xl sm:text-2xl font-bold text-neutral-42 mb-3 sm:mb-4">Recipe Not Found</h1>
                    <p className="text-sm sm:text-base text-neutral-61 mb-4 sm:mb-6">{error}</p>
                    <button
                        onClick={() => {
                            // Try to reload the page first
                            window.location.reload();
                        }}
                        className="px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm md:text-base font-semibold rounded-xl transition-colors mr-2 sm:mr-3"
                    >
                        Retry
                    </button>
                    <button
                        onClick={() => navigate('/feast-studio')}
                        className="px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 bg-neutral-200 hover:bg-neutral-300 text-neutral-42 text-xs sm:text-sm md:text-base font-semibold rounded-xl transition-colors"
                    >
                        Back to Feast Studio
                    </button>
                </div>
            </div>
        );
    }

    // If no recipe and not loading, show loading state (don't redirect)
    if (!recipe && !loading && !error) {
        // This shouldn't happen, but if it does, show loading state
        return (
            <div
                className="min-h-screen flex items-center justify-center px-2 sm:px-3 md:px-4 py-6 sm:py-8 md:py-12 bg-gradient-to-br from-[#fafcfb] via-[#f0fdf4] to-[#dcfce7]"
            >
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 border-b-2 border-primary mx-auto mb-3 sm:mb-4"></div>
                    <p className="text-sm sm:text-base text-neutral-61">Loading recipe...</p>
                </div>
            </div>
        );
    }

    if (!loading && recipe && normalizedSteps.length === 0) {
        return (
            <div
                className="min-h-screen flex items-center justify-center px-2 sm:px-3 md:px-4 py-6 sm:py-8 md:py-12 bg-gradient-to-br from-[#fafcfb] via-[#f0fdf4] to-[#dcfce7]"
            >
                <div className="text-center max-w-md">
                    <h1 className="text-xl sm:text-2xl font-bold text-neutral-42 mb-3 sm:mb-4">No Steps Available</h1>
                    <p className="text-sm sm:text-base text-neutral-61 mb-4 sm:mb-6">
                        No steps available for this recipe — go back to recipe details.
                    </p>
                    <button
                        onClick={handleBackToRecipe}
                        className="px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm md:text-base font-semibold rounded-xl transition-colors"
                    >
                        Back to Recipe Details
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen flex flex-col relative bg-gradient-to-br from-[#fafcfb] via-[#f0fdf4] to-[#dcfce7]"
        >
            {/* Floating Food Icons Background */}
            <FloatingFoodIcons />

            {/* Subtle Pattern Overlay */}
            <div
                className="fixed inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(circle_at_2px_2px,#22c55e_1px,transparent_0)] bg-[length:30px_30px] sm:bg-[length:35px_35px] md:bg-[length:40px_40px]"
            />

            {/* Toast Notification */}
            <Toast
                message={toastMessage}
                type={toastType}
                isVisible={showToast}
                onClose={() => setShowToast(false)}
                duration={3000}
            />

            {/* Header */}
            {recipe && (
                <FeastGuideHeader
                    recipeTitle={recipe.title}
                    servingSize={recipe.serving_size}
                    totalTime={totalTime}
                    onEndGuide={handleEndGuide}
                    onPrevious={handlePrevious}
                    onNext={handleNext}
                    canGoPrevious={currentStepIndex > 0}
                    canGoNext={currentStepIndex < normalizedSteps.length - 1}
                    currentStep={currentStepIndex}
                    totalSteps={normalizedSteps.length}
                    stepType={currentStep?.requires_user ? "Do this now" : "Monitor"}
                    stepTypeEmoji={currentStep?.requires_user ? "👋" : "👀"}
                />
            )}

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {/* Aria-live region for step announcements */}
                <div aria-live="polite" aria-atomic="true" className="sr-only">
                    {currentStep && recipe && (
                        <span>
                            Step {currentStepIndex + 1} of {normalizedSteps.length}: {currentStep.text || ''}
                        </span>
                    )}
                </div>

                <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 py-4 sm:py-5 md:py-6 lg:py-8">
                    {showSkeleton ? (
                        // Skeleton UI
                        <div className="space-y-4 sm:space-y-5 md:space-y-6">
                            <div className="bg-white rounded-[20px] sm:rounded-[24px] md:rounded-[28px] p-4 sm:p-5 md:p-6 lg:p-8 shadow-lg animate-pulse">
                                <div className="h-6 sm:h-7 md:h-8 bg-neutral-200 rounded w-1/3 mb-3 sm:mb-3.5 md:mb-4"></div>
                                <div className="h-3 sm:h-3.5 md:h-4 bg-neutral-200 rounded w-full mb-1.5 sm:mb-2"></div>
                                <div className="h-3 sm:h-3.5 md:h-4 bg-neutral-200 rounded w-5/6"></div>
                            </div>
                        </div>
                    ) : currentStep ? (
                        <>
                            {/* Mobile: Single Column - StepCard with StepsList below */}
                            <div className="block md:hidden space-y-6">
                                <StepCard
                                    step={currentStep}
                                    stepIndex={currentStepIndex}
                                    totalSteps={normalizedSteps.length}
                                    isPlaying={isPlaying}
                                    onPlayPause={handlePlayPause}
                                    onPrevious={handlePrevious}
                                    onNext={handleNext}
                                    onRepeat={handleRepeat}
                                    onStop={handleStop}
                                    voiceSpeed={voiceSpeed}
                                    selectedVoice={selectedVoice}
                                    selectedLanguage={selectedLanguage}
                                    onSpeedChange={setVoiceSpeed}
                                    onVoiceChange={setSelectedVoice}
                                    onLanguageChange={setSelectedLanguage}
                                    showCaptions={showCaptions}
                                    onToggleCaptions={() => setShowCaptions(!showCaptions)}
                                    autoPlayEnabled={autoPlayEnabled}
                                    onToggleAutoPlay={() => setAutoPlayEnabled(!autoPlayEnabled)}
                                    handsFreeEnabled={isHandsFreeEnabled}
                                    isWakeListening={isWakeListening}
                                    onToggleHandsFree={handleToggleHandsFree}
                                    onVoiceCommand={handleVoiceCommand}
                                    onTimerStart={(seconds: number) => startTimer(seconds)}
                                    onTimerPause={pauseTimer}
                                    onTimerResume={resumeTimer}
                                    timerRemainingSeconds={timerRemainingSeconds}
                                    isTimerRunning={isTimerRunning}
                                    isTimerPaused={isTimerPaused}
                                    onTimerReset={resetTimer}
                                    onListeningStart={handleVoiceListeningStart}
                                    onListeningEnd={handleVoiceListeningEnd}
                                    onPermissionDenied={handlePermissionDenied}
                                    shouldTriggerVoiceCommand={shouldTriggerVoiceCommand}
                                    onVoiceListeningTriggered={() => setShouldTriggerVoiceCommand(false)}
                                    onShowVoiceCommandsHelp={handleShowVoiceCommandsHelp}
                                />

                                {/* Ingredients List */}
                                {recipe?.ingredients && (
                                    <IngredientsList ingredients={recipe.ingredients} />
                                )}

                                {/* Voice Commands Help */}
                                <VoiceCommandsHelp
                                    ref={voiceCommandsHelpRef}
                                    isExpanded={voiceCommandsHelpExpanded}
                                    onToggleExpand={() => setVoiceCommandsHelpExpanded(!voiceCommandsHelpExpanded)}
                                />

                                {/* Steps List - Below StepCard on mobile */}
                                <StepsList
                                    steps={normalizedSteps.map(s => ({ text: s.text, image_url: s.image_url }))}
                                    currentIndex={currentStepIndex}
                                    completedSteps={completedSteps}
                                    onStepClick={handleStepClick}
                                    isExpanded={isStepsListExpanded}
                                    onToggleExpand={() => setIsStepsListExpanded(!isStepsListExpanded)}
                                />
                            </div>

                            {/* Medium: Single Column with StepsList (768px - 1024px) */}
                            <div className="hidden md:block lg:hidden space-y-6">
                                {/* Step Card */}
                                <StepCard
                                    step={currentStep}
                                    stepIndex={currentStepIndex}
                                    totalSteps={normalizedSteps.length}
                                    isPlaying={isPlaying}
                                    onPlayPause={handlePlayPause}
                                    onPrevious={handlePrevious}
                                    onNext={handleNext}
                                    onRepeat={handleRepeat}
                                    onStop={handleStop}
                                    voiceSpeed={voiceSpeed}
                                    selectedVoice={selectedVoice}
                                    selectedLanguage={selectedLanguage}
                                    onSpeedChange={setVoiceSpeed}
                                    onVoiceChange={setSelectedVoice}
                                    onLanguageChange={setSelectedLanguage}
                                    showCaptions={showCaptions}
                                    onToggleCaptions={() => setShowCaptions(!showCaptions)}
                                    autoPlayEnabled={autoPlayEnabled}
                                    onToggleAutoPlay={() => setAutoPlayEnabled(!autoPlayEnabled)}
                                    handsFreeEnabled={isHandsFreeEnabled}
                                    isWakeListening={isWakeListening}
                                    onToggleHandsFree={handleToggleHandsFree}
                                    onVoiceCommand={handleVoiceCommand}
                                    onTimerStart={(seconds: number) => startTimer(seconds)}
                                    onTimerPause={pauseTimer}
                                    onTimerResume={resumeTimer}
                                    timerRemainingSeconds={timerRemainingSeconds}
                                    isTimerRunning={isTimerRunning}
                                    isTimerPaused={isTimerPaused}
                                    onTimerReset={resetTimer}
                                    onListeningStart={handleVoiceListeningStart}
                                    onListeningEnd={handleVoiceListeningEnd}
                                    onPermissionDenied={handlePermissionDenied}
                                    shouldTriggerVoiceCommand={shouldTriggerVoiceCommand}
                                    onVoiceListeningTriggered={() => setShouldTriggerVoiceCommand(false)}
                                    onShowVoiceCommandsHelp={handleShowVoiceCommandsHelp}
                                />

                                {/* Ingredients List */}
                                {recipe?.ingredients && (
                                    <IngredientsList ingredients={recipe.ingredients} />
                                )}

                                {/* Voice Commands Help */}
                                <VoiceCommandsHelp
                                    ref={voiceCommandsHelpRef}
                                    isExpanded={voiceCommandsHelpExpanded}
                                    onToggleExpand={() => setVoiceCommandsHelpExpanded(!voiceCommandsHelpExpanded)}
                                />

                                {/* Steps List - Always visible and non-collapsed on medium screens */}
                                <StepsList
                                    steps={normalizedSteps.map(s => ({ text: s.text, image_url: s.image_url }))}
                                    currentIndex={currentStepIndex}
                                    completedSteps={completedSteps}
                                    onStepClick={handleStepClick}
                                    isExpanded={true}
                                    onToggleExpand={() => { }}
                                />
                            </div>

                            {/* Desktop: Two Column (only on >= 1024px) */}
                            <div className="hidden lg:grid lg:grid-cols-[60%_38%] lg:gap-8">
                                {/* Left: Step Card (Centered) */}
                                <div className="flex justify-center">
                                    <div className="w-full max-w-2xl space-y-6">
                                        <StepCard
                                            step={currentStep}
                                            stepIndex={currentStepIndex}
                                            totalSteps={normalizedSteps.length}
                                            isPlaying={isPlaying}
                                            onPlayPause={handlePlayPause}
                                            onPrevious={handlePrevious}
                                            onNext={handleNext}
                                            onRepeat={handleRepeat}
                                            onStop={handleStop}
                                            voiceSpeed={voiceSpeed}
                                            selectedVoice={selectedVoice}
                                            selectedLanguage={selectedLanguage}
                                            onSpeedChange={setVoiceSpeed}
                                            onVoiceChange={setSelectedVoice}
                                            onLanguageChange={setSelectedLanguage}
                                            showCaptions={showCaptions}
                                            onToggleCaptions={() => setShowCaptions(!showCaptions)}
                                            autoPlayEnabled={autoPlayEnabled}
                                            onToggleAutoPlay={() => setAutoPlayEnabled(!autoPlayEnabled)}
                                            handsFreeEnabled={isHandsFreeEnabled}
                                            isWakeListening={isWakeListening}
                                            onToggleHandsFree={handleToggleHandsFree}
                                            onVoiceCommand={handleVoiceCommand}
                                            onTimerStart={(seconds: number) => startTimer(seconds)}
                                            onTimerPause={pauseTimer}
                                            onTimerResume={resumeTimer}
                                            timerRemainingSeconds={timerRemainingSeconds}
                                            isTimerRunning={isTimerRunning}
                                            isTimerPaused={isTimerPaused}
                                            onTimerReset={resetTimer}
                                            onListeningStart={handleVoiceListeningStart}
                                            onListeningEnd={handleVoiceListeningEnd}
                                            onPermissionDenied={handlePermissionDenied}
                                            shouldTriggerVoiceCommand={shouldTriggerVoiceCommand}
                                            onVoiceListeningTriggered={() => setShouldTriggerVoiceCommand(false)}
                                            onShowVoiceCommandsHelp={handleShowVoiceCommandsHelp}
                                        />

                                        {/* Ingredients List */}
                                        {recipe?.ingredients && (
                                            <IngredientsList ingredients={recipe.ingredients} />
                                        )}

                                        {/* Voice Commands Help */}
                                        <VoiceCommandsHelp
                                            ref={voiceCommandsHelpRef}
                                            isExpanded={voiceCommandsHelpExpanded}
                                            onToggleExpand={() => setVoiceCommandsHelpExpanded(!voiceCommandsHelpExpanded)}
                                        />
                                    </div>
                                </div>

                                {/* Right: Steps List (Sticky, Desktop Only) */}
                                <div className="hidden lg:block sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
                                    <StepsList
                                        steps={normalizedSteps.map(s => ({ text: s.text, image_url: s.image_url }))}
                                        currentIndex={currentStepIndex}
                                        completedSteps={completedSteps}
                                        onStepClick={handleStepClick}
                                        isExpanded={isStepsListExpanded}
                                        onToggleExpand={() => setIsStepsListExpanded(!isStepsListExpanded)}
                                    />
                                </div>
                            </div>
                        </>
                    ) : null}
                </div>
            </main>
        </div>
    );
}