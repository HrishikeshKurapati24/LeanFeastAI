import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const About = () => {
    return (
        <div className="min-h-screen bg-neutral-50 pt-20 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-12 md:mb-16"
                >
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 mb-4 md:mb-6 font-display">
                        About <span className="text-primary">LeanFeastAI</span>
                    </h1>
                    <p className="text-lg md:text-xl text-neutral-600 max-w-3xl mx-auto px-4">
                        Empowering healthy living through AI-driven nutrition and culinary innovation.
                    </p>
                </motion.div>

                {/* Mission Section */}
                <div className="max-w-4xl mx-auto mb-16 md:mb-24 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                    >
                        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Our Mission</h2>
                        <p className="text-lg text-neutral-600 mb-6 leading-relaxed">
                            At LeanFeastAI, we believe that eating healthy shouldn't be a chore. Our mission is to revolutionize personal nutrition by combining cutting-edge Artificial Intelligence with culinary expertise.
                        </p>
                        <p className="text-lg text-neutral-600 mb-6 leading-relaxed">
                            We strive to make personalized meal planning accessible, affordable, and adaptable to every lifestyle. Whether you're an athlete, a busy professional, or someone looking to improve their health, LeanFeastAI is your intelligent companion in the kitchen.
                        </p>
                    </motion.div>
                </div>

                {/* Values Section */}
                <div className="mb-24">
                    <h2 className="text-3xl font-bold text-neutral-900 mb-12 text-center">Our Core Values</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                title: "Innovation",
                                description: "Leveraging the latest in AI technology to solve real-world nutrition challenges.",
                                icon: "💡"
                            },
                            {
                                title: "Personalization",
                                description: "Recognizing that every body is unique and requires tailored nutritional solutions.",
                                icon: "🎯"
                            },
                            {
                                title: "Community",
                                description: "Building a supportive ecosystem where users inspire and help each other grow.",
                                icon: "🤝"
                            }
                        ].map((value, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
                                className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-100 text-center hover:shadow-md transition-shadow"
                            >
                                <div className="text-4xl mb-4">{value.icon}</div>
                                <h3 className="text-xl font-bold text-neutral-900 mb-3">{value.title}</h3>
                                <p className="text-neutral-600">{value.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* CTA Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="bg-primary/10 rounded-3xl p-12 text-center"
                >
                    <h2 className="text-3xl font-bold text-neutral-900 mb-6">Join the Revolution</h2>
                    <p className="text-xl text-neutral-600 mb-8 max-w-2xl mx-auto">
                        Ready to transform your relationship with food? Start your journey with LeanFeastAI today.
                    </p>
                    <Link
                        to="/signup"
                        className="inline-block bg-primary text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-primary-dark transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                        Get Started Free
                    </Link>
                </motion.div>
            </div>
        </div>
    );
};

export default About;
