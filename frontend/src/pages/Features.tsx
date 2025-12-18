import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Features = () => {
    const features = [
        {
            title: "AI-Powered Recipe Generation",
            description: "Generate unique, personalized recipes instantly based on your dietary preferences, allergies, and available ingredients using advanced LLMs.",
            icon: "🤖"
        },
        {
            title: "Smart FeastGuide",
            description: "Cook hands-free with our intelligent voice assistant. Navigate steps, set timers, and get answers to cooking questions without touching your screen.",
            icon: "🎙️"
        },
        {
            title: "Real-time Nutrition Analysis",
            description: "Get accurate, detailed nutritional breakdowns for every recipe, empowering you to make informed decisions about your diet.",
            icon: "📊"
        },
        {
            title: "Community Hub",
            description: "Share your culinary creations, discover recipes from other users, and engage with a vibrant community of healthy food enthusiasts.",
            icon: "🌍"
        },
        {
            title: "Pantry Management",
            description: "Reduce food waste by generating recipes based on what you already have in your kitchen/pantry.",
            icon: "🥗"
        },
        {
            title: "Visual Delight",
            description: "Experience food before you cook it with stunning, AI-generated images for every recipe created on the platform.",
            icon: "🎨"
        }
    ];

    return (
        <div className="min-h-screen bg-neutral-50 pt-20 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-12 md:mb-20"
                >
                    <h1 className="text-3xl md:text-5xl font-bold text-neutral-900 mb-4 md:mb-6 font-display">
                        Powerful <span className="text-primary">Features</span>
                    </h1>
                    <p className="text-lg md:text-xl text-neutral-600 max-w-3xl mx-auto px-2">
                        Discover the tools that make LeanFeastAI the ultimate companion for your nutrition journey.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-16 md:mb-20">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.5 }}
                            className="bg-white rounded-2xl p-8 shadow-sm border border-neutral-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                        >
                            <div className="text-5xl mb-6">{feature.icon}</div>
                            <h3 className="text-2xl font-bold text-neutral-900 mb-4">{feature.title}</h3>
                            <p className="text-neutral-600 leading-relaxed">{feature.description}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Feature Highlight Section */}
                <div className="bg-white rounded-3xl overflow-hidden shadow-xl mb-20">
                    <div className="max-w-4xl mx-auto p-12 flex flex-col justify-center text-center">
                        <h3 className="text-3xl font-bold text-neutral-900 mb-6">Experience the FeastGuide</h3>
                        <p className="text-lg text-neutral-600 mb-8">
                            Our flagship voice-controlled cooking assistant changes the game. No more messy screens or losing your place. Just speak naturally, and let FeastGuide lead the way.
                        </p>
                        <ul className="space-y-4 mb-8 text-left max-w-md mx-auto">
                            <li className="flex items-center text-neutral-700">
                                <span className="text-primary mr-3">✓</span> Voice-activated navigation ("Next", "Back")
                            </li>
                            <li className="flex items-center text-neutral-700">
                                <span className="text-primary mr-3">✓</span> Smart Timer control
                            </li>
                            <li className="flex items-center text-neutral-700">
                                <span className="text-primary mr-3">✓</span> Step-by-step reading
                            </li>
                        </ul>
                        <div>
                            <Link to="/feast-studio" className="text-primary font-bold hover:text-primary-dark inline-flex items-center">
                                Try it in Feast Studio <span className="ml-2">→</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Features;
