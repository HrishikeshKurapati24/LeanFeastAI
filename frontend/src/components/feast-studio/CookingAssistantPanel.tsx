import React from 'react';

interface CookingAssistantPanelProps {
    summaryText: string;
}

export default function CookingAssistantPanel({ summaryText }: CookingAssistantPanelProps) {
    return (
        <div className="md:col-span-1">
            <div className="md:sticky md:top-8">
                {/* Chat Bubble */}
                <div
                    className="relative rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-6 shadow-lg transition-all duration-300 hover:shadow-xl"
                    style={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05)',
                    }}
                >
                    {/* Chat bubble tail */}
                    <div
                        className="absolute -bottom-2 left-4 sm:left-6 md:left-8 w-3 h-3 sm:w-4 sm:h-4"
                        style={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                            transform: 'rotate(45deg)',
                            boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.1)',
                        }}
                    />

                    {/* Chef Avatar */}
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 md:mb-4">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-md">
                            <span className="text-lg sm:text-xl md:text-2xl">👨‍🍳</span>
                        </div>
                        <h3 className="text-sm sm:text-base md:text-lg font-semibold text-neutral-42">Cooking Assistant</h3>
                    </div>

                    {/* Message Text with Emojis */}
                    <p className="text-neutral-61 text-xs sm:text-sm md:text-base leading-relaxed">
                        {summaryText}
                    </p>
                </div>
            </div>
        </div>
    );
}