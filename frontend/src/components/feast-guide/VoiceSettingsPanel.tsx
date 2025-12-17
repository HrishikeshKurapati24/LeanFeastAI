import { useState } from 'react';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';

interface VoiceSettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    currentSpeed: number;
    currentVoice?: SpeechSynthesisVoice;
    currentLanguage?: string;
    onSpeedChange: (speed: number) => void;
    onVoiceChange: (voice: SpeechSynthesisVoice) => void;
    onLanguageChange: (language: string) => void;
}

export default function VoiceSettingsPanel({
    isOpen,
    onClose,
    currentSpeed,
    currentVoice,
    currentLanguage,
    onSpeedChange,
    onVoiceChange,
    onLanguageChange,
}: VoiceSettingsPanelProps) {
    const { voices, isSupported, speak } = useTextToSpeech();
    const [previewText] = useState('This is a preview of the voice.');

    const handlePreview = () => {
        if (currentVoice) {
            speak(previewText, {
                voice: currentVoice,
                rate: currentSpeed,
            });
        }
    };

    if (!isOpen) return null;

    if (!isSupported) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 max-w-md w-full mx-2 sm:mx-3 md:mx-4">
                    <h3 className="text-lg sm:text-xl font-bold text-neutral-42 mb-3 sm:mb-4">Voice Settings</h3>
                    <p className="text-sm sm:text-base text-neutral-61 mb-3 sm:mb-4">
                        Text-to-speech is not supported in your browser.
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full px-3 py-1.5 sm:px-4 sm:py-2 bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm md:text-base font-semibold rounded-xl transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    // Group voices by language
    const voicesByLanguage = voices.reduce((acc, voice) => {
        const lang = voice.lang.split('-')[0];
        if (!acc[lang]) {
            acc[lang] = [];
        }
        acc[lang].push(voice);
        return acc;
    }, {} as Record<string, SpeechSynthesisVoice[]>);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-1.5 sm:px-3"
            onClick={onClose}
        >
            <div className="w-full max-w-[360px] sm:max-w-md max-h-[78vh]">
                <div
                    className="bg-white rounded-[14px] sm:rounded-[18px] md:rounded-[22px] p-2.5 sm:p-3.5 md:p-4.5 lg:p-5 w-full h-full overflow-y-auto shadow-[0px_6px_18px_rgba(0,0,0,0.12)] border border-white/50"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-2.5 sm:mb-3.5 md:mb-4.5">
                        <h3 className="text-[13px] sm:text-sm md:text-base font-semibold text-neutral-42">🎧 Voice Settings</h3>
                        <button
                            onClick={onClose}
                            className="w-6.5 h-6.5 sm:w-7 sm:h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-all duration-200 hover:scale-105"
                            aria-label="Close"
                        >
                            <svg
                                className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-neutral-42"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>

                    {/* Playback Speed */}
                    <div className="mb-3 sm:mb-3.5 md:mb-4.5">
                        <label className="block text-xs sm:text-sm font-semibold text-neutral-42 mb-1.5 sm:mb-2">
                            Playback Speed: {currentSpeed}x
                        </label>
                        <input
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.1"
                            value={currentSpeed}
                            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                            className="w-full h-2 sm:h-2.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-primary"
                            style={{
                                background: `linear-gradient(to right, #22c55e 0%, #22c55e ${((currentSpeed - 0.5) / 1.5) * 100}%, #E2E8F0 ${((currentSpeed - 0.5) / 1.5) * 100}%, #E2E8F0 100%)`,
                            }}
                        />
                        <div className="flex justify-between text-[10px] sm:text-xs text-neutral-400 mt-0.5 sm:mt-1">
                            <span>0.5x</span>
                            <span>1x</span>
                            <span>2x</span>
                        </div>
                    </div>

                    {/* Language Selector */}
                    <div className="mb-3 sm:mb-3.5 md:mb-4.5">
                        <label className="block text-xs sm:text-sm font-semibold text-neutral-42 mb-1.5 sm:mb-2">
                            Language
                        </label>
                        <select
                            value={currentLanguage || 'en'}
                            onChange={(e) => onLanguageChange(e.target.value)}
                            className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 md:px-4 md:py-3 border-2 border-neutral-200 rounded-[16px] sm:rounded-[18px] md:rounded-[20px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200 text-xs sm:text-sm"
                        >
                            {Object.keys(voicesByLanguage).map((lang) => (
                                <option key={lang} value={lang}>
                                    {lang.toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Voice Selector */}
                    <div className="mb-3 sm:mb-3.5 md:mb-4.5">
                        <label className="block text-xs sm:text-sm font-semibold text-neutral-42 mb-1.5 sm:mb-2">
                            Voice
                        </label>
                        <div className="space-y-1.5 sm:space-y-2 max-h-32 sm:max-h-40 md:max-h-48 overflow-y-auto pr-1">
                            {voices
                                .filter((voice) => !currentLanguage || voice.lang.startsWith(currentLanguage))
                                .map((voice, index) => (
                                    <button
                                        key={index}
                                        onClick={() => onVoiceChange(voice)}
                                        className={`w-full text-left p-3 sm:p-3.5 md:p-4 rounded-[14px] sm:rounded-[16px] md:rounded-[18px] transition-all duration-200 hover:scale-[1.02] ${currentVoice?.name === voice.name
                                            ? 'bg-primary/20 border-2 border-primary shadow-sm'
                                            : 'bg-neutral-50 hover:bg-neutral-100 border-2 border-transparent hover:border-primary/20'
                                            }`}
                                    >
                                        <div className="font-semibold text-xs sm:text-sm text-neutral-42">{voice.name}</div>
                                        <div className="text-[10px] sm:text-xs text-neutral-400">{voice.lang}</div>
                                    </button>
                                ))}
                        </div>
                    </div>

                    {/* Preview Button */}
                    <button
                        onClick={handlePreview}
                        disabled={!currentVoice}
                        className="w-full px-4 py-2.5 sm:px-5 sm:py-3 md:px-6 md:py-3.5 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white text-xs sm:text-sm md:text-base font-semibold rounded-full transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
                        style={{
                            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                        }}
                    >
                        🔊 Preview Voice
                    </button>
                </div>
            </div>
        </div>
    );
}

