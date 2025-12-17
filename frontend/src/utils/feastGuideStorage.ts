/**
 * LocalStorage utilities for Feast Guide progress and settings
 */

export interface ProgressData {
    currentIndex: number;
    timestamp: number;
    localState?: any;
}

export interface VoiceSettings {
    speed: number;
    voiceName?: string;
    language?: string;
    autoPlay?: boolean;
    timerStartAfterTTS?: boolean;
    handsFreeEnabled?: boolean;
}

const PROGRESS_KEY_PREFIX = 'feast_guide_progress_';
const SETTINGS_KEY_PREFIX = 'feast_guide_settings_';

export const saveProgress = (recipeId: string, currentIndex: number, timestamp: number, localState?: any): void => {
    try {
        const progress: ProgressData = {
            currentIndex,
            timestamp,
            localState,
        };
        localStorage.setItem(`${PROGRESS_KEY_PREFIX}${recipeId}`, JSON.stringify(progress));
    } catch (error) {
        console.error('Error saving progress to localStorage:', error);
    }
};

export const loadProgress = (recipeId: string): ProgressData | null => {
    try {
        const stored = localStorage.getItem(`${PROGRESS_KEY_PREFIX}${recipeId}`);
        if (stored) {
            return JSON.parse(stored) as ProgressData;
        }
    } catch (error) {
        console.error('Error loading progress from localStorage:', error);
    }
    return null;
};

export const saveSettings = (recipeId: string, settings: VoiceSettings): void => {
    try {
        localStorage.setItem(`${SETTINGS_KEY_PREFIX}${recipeId}`, JSON.stringify(settings));
    } catch (error) {
        console.error('Error saving settings to localStorage:', error);
    }
};

export const loadSettings = (recipeId: string): VoiceSettings | null => {
    try {
        const stored = localStorage.getItem(`${SETTINGS_KEY_PREFIX}${recipeId}`);
        if (stored) {
            return JSON.parse(stored) as VoiceSettings;
        }
    } catch (error) {
        console.error('Error loading settings from localStorage:', error);
    }
    return null;
};

export const clearProgress = (recipeId: string): void => {
    try {
        localStorage.removeItem(`${PROGRESS_KEY_PREFIX}${recipeId}`);
    } catch (error) {
        console.error('Error clearing progress from localStorage:', error);
    }
};

export const clearSettings = (recipeId: string): void => {
    try {
        localStorage.removeItem(`${SETTINGS_KEY_PREFIX}${recipeId}`);
    } catch (error) {
        console.error('Error clearing settings from localStorage:', error);
    }
};