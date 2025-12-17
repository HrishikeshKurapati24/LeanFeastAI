import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
    message: string;
    type?: ToastType;
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
}

export default function Toast({
    message,
    type = "success",
    isVisible,
    onClose,
    duration = 3000,
}: ToastProps & { type?: ToastType }) {
    useEffect(() => {
        if (isVisible && duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    const getToastStyles = () => {
        switch (type) {
            case "success":
                return "bg-primary text-white";
            case "error":
                return "bg-red-500 text-white";
            case "info":
                return "bg-blue-500 text-white";
            default:
                return "bg-primary text-white";
        }
    };

    const getIcon = () => {
        switch (type) {
            case "success":
                return "✓";
            case "error":
                return "✕";
            case "info":
                return "ℹ";
            default:
                return "✓";
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -100 }}
                    transition={{ duration: 0.3 }}
                    className={`fixed top-2 right-2 sm:top-4 sm:right-4 z-[9999] px-3 py-2 sm:px-5 sm:py-3 rounded-lg sm:rounded-xl shadow-2xl flex items-center gap-2 sm:gap-3 text-xs sm:text-sm ${getToastStyles()}`}
                    role="alert"
                    aria-live="polite"
                >
                    <span className="text-base sm:text-xl font-bold">{getIcon()}</span>
                    <span className="font-semibold leading-snug">{message}</span>
                    <button
                        onClick={onClose}
                        className="ml-1 sm:ml-2 text-white/80 hover:text-white transition-colors text-base sm:text-lg"
                        aria-label="Close notification"
                    >
                        ×
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

