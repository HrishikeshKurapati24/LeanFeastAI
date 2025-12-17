import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface DeleteRecipeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    recipeTitle: string;
    loading?: boolean;
}

export default function DeleteRecipeModal({
    isOpen,
    onClose,
    onConfirm,
    recipeTitle,
    loading = false,
}: DeleteRecipeModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    // Close modal on ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen && !loading) {
                onClose();
            }
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [isOpen, onClose, loading]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    // Focus trap
    useEffect(() => {
        if (isOpen && modalRef.current) {
            const focusableElements = modalRef.current.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

            const handleTab = (e: KeyboardEvent) => {
                if (e.key !== "Tab") return;

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            };

            document.addEventListener("keydown", handleTab);
            firstElement?.focus();

            return () => {
                document.removeEventListener("keydown", handleTab);
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[10001] flex items-center justify-center p-2 sm:p-3 md:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
        >
            <motion.div
                ref={modalRef}
                className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl w-full max-w-md p-4 sm:p-5 md:p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
            >
                {/* Header */}
                <div className="mb-4 sm:mb-5">
                    <div className="flex items-center gap-3 mb-2 sm:mb-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xl sm:text-2xl">⚠️</span>
                        </div>
                        <h2 id="delete-modal-title" className="text-lg sm:text-xl md:text-2xl font-bold text-neutral-42">
                            Remove Recipe from Community
                        </h2>
                    </div>
                    <p className="text-sm sm:text-base text-neutral-61">
                        Are you sure you want to remove this recipe from the community hub?
                    </p>
                </div>

                {/* Recipe Title */}
                <div className="mb-4 sm:mb-5 p-3 sm:p-4 bg-neutral-50 rounded-lg">
                    <p className="text-xs sm:text-sm text-neutral-61 mb-1">Recipe:</p>
                    <p className="text-sm sm:text-base md:text-lg font-semibold text-neutral-42 line-clamp-2">
                        {recipeTitle}
                    </p>
                </div>

                {/* Warning Message */}
                <div className="mb-4 sm:mb-5 p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs sm:text-sm text-yellow-800">
                        This will remove the recipe from the community hub. The recipe will no longer be visible to other users, but it will remain in your saved recipes.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 sm:px-5 py-2 sm:py-2.5 border-2 border-neutral-200 hover:border-neutral-300 text-neutral-42 font-semibold rounded-lg transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Cancel"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="px-4 sm:px-5 py-2 sm:py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex items-center justify-center gap-2"
                        aria-label="Remove from community"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Removing...</span>
                            </>
                        ) : (
                            <>
                                <span>🗑️</span>
                                <span>Remove from Community</span>
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

