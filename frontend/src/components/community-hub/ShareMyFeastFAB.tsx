import { useState } from "react";
import { motion } from "framer-motion";

interface ShareMyFeastFABProps {
    onClick: () => void;
    position?: "bottom-right" | "top-right";
}

export default function ShareMyFeastFAB({ onClick, position = "bottom-right" }: ShareMyFeastFABProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    const isTopRight = position === "top-right";
    const containerClasses = isTopRight
        ? "fixed top-4 right-4 sm:top-5 sm:right-5 md:top-6 md:right-6 z-50"
        : "fixed bottom-4 right-4 sm:bottom-5 sm:right-5 md:bottom-6 md:right-6 z-50";

    return (
        <div className={containerClasses}>
            <motion.button
                onClick={onClick}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full shadow-2xl flex items-center justify-center text-white text-xl sm:text-2xl font-bold transition-all duration-300 bg-gradient-to-br from-primary via-primary-light to-primary-dark shadow-primary/30 hover:scale-110 hover:shadow-primary/50"
                aria-label="Share My Feast"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
            >
                <span>+</span>
            </motion.button>

            {/* Tooltip */}
            {showTooltip && (
                <motion.div
                    initial={{ opacity: 0, y: isTopRight ? -10 : 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`absolute ${isTopRight ? "top-full mt-1.5 sm:mt-2" : "bottom-full mb-1.5 sm:mb-2"} right-0 px-2 py-1.5 sm:px-2.5 sm:py-2 md:px-3 bg-neutral-42 text-white text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap shadow-lg`}
                >
                    Share My Feast
                    <div className={`absolute ${isTopRight ? "bottom-full" : "top-full"} right-3 sm:right-4 w-0 h-0 border-l-4 border-r-4 ${isTopRight ? "border-b-4 border-transparent border-b-neutral-42" : "border-t-4 border-transparent border-t-neutral-42"}`}></div>
                </motion.div>
            )}
        </div>
    );
}

