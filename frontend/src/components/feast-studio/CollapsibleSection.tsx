import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CollapsibleSectionProps {
    id: string;
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    icon: string;
}

export default function CollapsibleSection({
    id,
    title,
    isOpen,
    onToggle,
    children,
    icon,
}: CollapsibleSectionProps) {
    return (
        <div id={id} className="mb-3 sm:mb-4 md:mb-6">
            <motion.div
                className="rounded-lg sm:rounded-xl md:rounded-2xl overflow-hidden shadow-md sm:shadow-lg transition-all duration-300"
                style={{
                    background: isOpen
                        ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    boxShadow: isOpen
                        ? '0 8px 24px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.06)'
                        : '0 4px 12px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.03)',
                }}
                whileHover={{
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)',
                    scale: 1.005,
                }}
                transition={{ duration: 0.3 }}
            >
                <button
                    onClick={onToggle}
                    className="w-full p-2 sm:p-3 md:p-4 flex items-center justify-between transition-all duration-300 cursor-pointer group"
                    style={{
                        background: isOpen
                            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.05) 100%)'
                            : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                        if (!isOpen) {
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.03) 100%)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!isOpen) {
                            e.currentTarget.style.background = 'transparent';
                        }
                    }}
                    aria-expanded={isOpen}
                >
                    <div className="flex items-center gap-2 sm:gap-3">
                        <motion.span
                            className="text-2xl sm:text-3xl md:text-4xl"
                            animate={{
                                scale: isOpen ? [1, 1.15, 1] : 1,
                                rotate: isOpen ? [0, 5, -5, 0] : 0,
                            }}
                            transition={{
                                duration: 0.5,
                                ease: 'easeInOut',
                            }}
                        >
                            {icon}
                        </motion.span>
                        <h2 className="text-md sm:text-xl md:text-2xl lg:text-2xl font-bold text-primary text-left group-hover:text-primary-dark transition-colors">
                            {title}
                        </h2>
                    </div>
                    <motion.span
                        className="text-lg sm:text-xl text-neutral-61"
                        animate={{
                            rotate: isOpen ? 180 : 0,
                        }}
                        transition={{
                            duration: 0.4,
                            ease: 'easeInOut',
                        }}
                    >
                        ▼
                    </motion.span>
                </button>

                <AnimatePresence initial={false}>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{
                                duration: 0.5,
                                ease: 'easeInOut',
                            }}
                            className="overflow-hidden"
                        >
                            <motion.div
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -20, opacity: 0 }}
                                transition={{
                                    duration: 0.4,
                                    delay: 0.1,
                                    ease: 'easeOut',
                                }}
                                className="p-2 sm:p-3 md:p-4 lg:p-6"
                            >
                                {children}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}