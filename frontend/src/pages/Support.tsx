import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-neutral-200 rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-6 text-left bg-white hover:bg-neutral-50 transition-colors"
            >
                <span className="font-bold text-neutral-900 text-lg">{question}</span>
                <span className={`text-2xl text-primary transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}>+</span>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="p-6 pt-0 bg-white text-neutral-600 leading-relaxed border-t border-neutral-100">
                            {answer}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const Support = () => {
    const faqs = [
        {
            question: "How does the AI recipe generation work?",
            answer: "We use advanced Large Language Models (LLMs) specifically tuned for culinary tasks. When you input your ingredients or preferences, the AI constructs a valid, creative recipe while ensuring nutritional balance."
        },
        {
            question: "Is FeastGuide available offline?",
            answer: "Currently, FeastGuide requires an active internet connection to process voice commands and retrieve recipe steps. We are exploring offline capabilities for future updates."
        },
        {
            question: "Can I save my favorite recipes?",
            answer: "Yes! Once you create an account, you can save any generated or community recipe to your profile for easy access later."
        },
        {
            question: "How accurate is the nutritional information?",
            answer: "We use standard nutritional databases and AI estimation to provide detailed breakdowns. While highly accurate for general planning, please consult a professional for strict medical dietary requirements."
        },
        {
            question: "Is LeanFeastAI free to use?",
            answer: "Yes, the core features of LeanFeastAI, including recipe generation and community access, are free to use. Premium features may be added in the future."
        }
    ];

    return (
        <div className="min-h-screen bg-neutral-50 pt-20 pb-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-12 md:mb-16"
                >
                    <h1 className="text-3xl md:text-5xl font-bold text-neutral-900 mb-4 md:mb-6 font-display">
                        Support <span className="text-primary">Center</span>
                    </h1>
                    <p className="text-lg md:text-xl text-neutral-600 px-2">
                        Find answers to common questions and get help with your LeanFeastAI experience.
                    </p>
                </motion.div>

                <div className="space-y-4 mb-20">
                    {faqs.map((faq, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.5 }}
                        >
                            <FAQItem {...faq} />
                        </motion.div>
                    ))}
                </div>

                <div className="bg-primary/5 rounded-2xl p-8 md:p-12 text-center border border-primary/10">
                    <h3 className="text-2xl font-bold text-neutral-900 mb-4">Still need help?</h3>
                    <p className="text-neutral-600 mb-8 max-w-xl mx-auto">
                        Can't find what you're looking for? Our dedicated support team is here to assist you.
                    </p>
                    <a
                        href="/contact"
                        className="inline-block bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-dark transition-colors shadow-md hover:shadow-lg"
                    >
                        Contact Support
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Support;
