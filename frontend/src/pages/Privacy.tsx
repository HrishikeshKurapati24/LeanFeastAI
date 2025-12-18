import React from 'react';
import { motion } from 'framer-motion';

const Privacy = () => {
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
                        Privacy Policy
                    </h1>

                    <div className="prose prose-neutral max-w-none text-neutral-600">
                        <p className="mb-6">Last updated: December 18, 2025</p>

                        <h3 className="text-xl font-bold text-neutral-900 mt-8 mb-4">1. Information We Collect</h3>
                        <p className="mb-4">
                            We collect information you provide directly to us, such as when you create an account, create a recipe, or communicate with us. This may include your name, email address, and dietary preferences.
                        </p>

                        <h3 className="text-xl font-bold text-neutral-900 mt-8 mb-4">2. How We Use Your Information</h3>
                        <p className="mb-4">
                            We use the information we collect to provide, maintain, and improve our services, including generating personalized recipes, tracking your favorites, and facilitating community features.
                        </p>

                        <h3 className="text-xl font-bold text-neutral-900 mt-8 mb-4">3. Data Security</h3>
                        <p className="mb-4">
                            We implement reasonable security measures to protect the security of your personal information. However, please be aware that no method of transmission over the Internet is 100% secure.
                        </p>

                        <h3 className="text-xl font-bold text-neutral-900 mt-8 mb-4">4. Cookies and Tracking</h3>
                        <p className="mb-4">
                            We use cookies and similar tracking technologies to track the activity on our service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
                        </p>

                        <h3 className="text-xl font-bold text-neutral-900 mt-8 mb-4">5. Third-Party Services</h3>
                        <p className="mb-4">
                            We may employ third-party companies and individuals (such as Supabase for database, Google Gemini for AI) to facilitate our service. These third parties have access to your personal information only to perform these tasks on our behalf.
                        </p>

                        <h3 className="text-xl font-bold text-neutral-900 mt-8 mb-4">6. Children's Privacy</h3>
                        <p className="mb-4">
                            Our service does not address anyone under the age of 13. We do not knowingly collect personally identifiable information from children under 13.
                        </p>

                        <h3 className="text-xl font-bold text-neutral-900 mt-8 mb-4">7. Changes to This Privacy Policy</h3>
                        <p>
                            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Privacy;
