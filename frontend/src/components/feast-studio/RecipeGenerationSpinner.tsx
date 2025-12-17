export default function RecipeGenerationSpinner() {
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-md animate-fadeIn">
            <div className="bg-white rounded-3xl p-12 shadow-2xl max-w-md w-full mx-4 text-center animate-fadeInUp">
                {/* Animated gradient spinner */}
                <div className="relative w-24 h-24 mx-auto mb-6">
                    {/* Outer rotating ring */}
                    <div 
                        className="absolute inset-0 rounded-full border-4 border-transparent"
                        style={{
                            borderTopColor: '#22c55e',
                            borderRightColor: '#22c55e',
                            animation: 'spin 1s linear infinite',
                        }}
                    />
                    {/* Inner pulsing circle */}
                    <div className="absolute inset-3 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 animate-pulse" />
                    {/* Center dot */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-primary animate-ping" />
                    </div>
                </div>

                {/* Text with gradient */}
                <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent mb-2">
                    Crafting Your Feast
                </h3>
                <p className="text-neutral-61 text-sm">
                    Our AI chef is working their magic... ✨
                </p>

                {/* Animated dots */}
                <div className="flex justify-center gap-2 mt-4">
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0s' }} />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
            </div>
        </div>
    );
}

