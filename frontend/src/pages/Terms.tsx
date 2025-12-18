import React from 'react';
import { motion } from 'framer-motion';

const Terms = () => {
    return (
        <div className="min-h-screen bg-neutral-50 pt-20 pb-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-neutral-100"
                >
                    <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-8 border-b border-neutral-100 pb-6">
                        Terms and Conditions
                    </h1>

                    <div className="prose prose-neutral max-w-none text-neutral-600">
                        <p className="mb-6">Last updated: December 18, 2025</p>

                        <h3 className="text-xl font-bold text-neutral-900 mt-8 mb-4">1. Acceptance of Terms</h3>
                        <p className="mb-4">
                            By accessing and using LeanFeastAI, you accept and agree to be bound by the terms and provision of this agreement.
                        </p>

                        <h3 className="text-xl font-bold text-neutral-900 mt-8 mb-4">2. Use License</h3>
                        <p className="mb-4">
                            Permission is granted to temporarily download one copy of the materials (information or software) on LeanFeastAI's website for personal, non-commercial transitory viewing only.
                        </p>

                        <h3 className="text-xl font-bold text-neutral-900 mt-8 mb-4">3. User Account</h3>
                        <p className="mb-4">
                            To access certain features of the platform, you may be required to create an account. You are responsible for maintaining the confidentiality of your account and password.
                        </p>

                        <h3 className="text-xl font-bold text-neutral-900 mt-8 mb-4">4. Content Guidelines</h3>
                        <p className="mb-4">
                            Users may post recipes, comments, and other content. You retain ownership of your content, but grant LeanFeastAI a license to use, display, and distribute such content. Content must not be illegal, offensive, or violate others' rights.
                        </p>

                        <h3 className="text-xl font-bold text-neutral-900 mt-8 mb-4">5. Disclaimer</h3>
                        <p className="mb-4">
                            The materials on LeanFeastAI's website are provided on an 'as is' basis. LeanFeastAI makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                        </p>

                        <h3 className="text-xl font-bold text-neutral-900 mt-8 mb-4">6. Nutritional Information</h3>
                        <p className="mb-4">
                            Nutritional data provided by LeanFeastAI is for informational purposes only and should not be considered medical advice. Always consult with a healthcare professional for dietary advice.
                        </p>

                        <h3 className="text-xl font-bold text-neutral-900 mt-8 mb-4">7. Governing Law</h3>
                        <p>
                            These terms and conditions are governed by and construed in accordance with the laws and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Terms;
