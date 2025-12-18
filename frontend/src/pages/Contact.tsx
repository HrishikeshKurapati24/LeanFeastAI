
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import emailjs from '@emailjs/browser';

const Contact = () => {
  const form = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState({
    user_name: '', // Changed to match standard EmailJS template
    user_email: '', // Changed to match standard EmailJS template
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // EMAILJS CONFIGURATION
  // Keys should be in .env file
  const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.current) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Sending email using EmailJS
      await emailjs.sendForm(
        SERVICE_ID,
        TEMPLATE_ID,
        form.current,
        PUBLIC_KEY
      );

      console.log('Email sent successfully!');
      setSubmitStatus('success');
      setFormData({ user_name: '', user_email: '', message: '' });
      // alert('Thank you for your message! We will get back to you soon.'); // Using UI feedback instead
    } catch (error) {
      console.error('Failed to send email:', error);
      setSubmitStatus('error');
      // alert('Failed to send message. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            Get in <span className="text-primary">Touch</span>
          </h1>
          <p className="text-lg md:text-xl text-neutral-600 px-2">
            Have questions, suggestions, or feedback? We'd love to hear from you.
          </p>
        </motion.div>

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-6 sm:p-8 md:p-12 bg-primary/5">
              <h3 className="text-2xl font-bold text-neutral-900 mb-6">Contact Information</h3>

              <div className="space-y-8">
                <div className="flex items-start">
                  <div className="text-2xl mr-4">📧</div>
                  <div>
                    <h4 className="font-bold text-neutral-900">Email</h4>
                    <p className="text-neutral-600">contact@leanfeastai.com</p>
                    <p className="text-neutral-600">support@leanfeastai.com</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="text-2xl mr-4">📍</div>
                  <div>
                    <h4 className="font-bold text-neutral-900">Location</h4>
                    <p className="text-neutral-600">Digital First Headquarters</p>
                    <p className="text-neutral-600">Nizamabad, Telangana, India</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="text-2xl mr-4">🕒</div>
                  <div>
                    <h4 className="font-bold text-neutral-900">Support Hours</h4>
                    <p className="text-neutral-600">Mon - Fri: 9am - 6pm EST</p>
                    <p className="text-neutral-600">Weekend: Closed</p>
                  </div>
                </div>
              </div>

              <div className="mt-12">
                <h4 className="font-bold text-neutral-900 mb-4">Follow Us</h4>
                <div className="flex space-x-4">
                  {/* Social icons placeholder */}
                  {['Twitter', 'Facebook', 'Instagram', 'LinkedIn'].map((social) => (
                    <a key={social} href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-neutral-600 hover:text-primary hover:shadow-md transition-all">
                      {social[0]}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 md:p-12">
              <form ref={form} onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="user_name" className="block text-sm font-medium text-neutral-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="user_name" // Name attribute required for EmailJS
                    id="user_name"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="Your name"
                    value={formData.user_name}
                    onChange={(e) => setFormData({ ...formData, user_name: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="user_email" className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="user_email" // Name attribute required for EmailJS
                    id="user_email"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="your@email.com"
                    value={formData.user_email}
                    onChange={(e) => setFormData({ ...formData, user_email: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-neutral-700 mb-1">Message</label>
                  <textarea
                    name="message" // Name attribute required for EmailJS
                    id="message"
                    required
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                    placeholder="How can we help?"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full font-bold py-4 rounded-xl transition-all shadow-lg transform hover:-translate-y-0.5 ${isSubmitting
                    ? 'bg-neutral-300 cursor-not-allowed text-neutral-500'
                    : 'bg-primary text-white hover:bg-primary-dark hover:shadow-xl'
                    }`}
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>

                {submitStatus === 'success' && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-green-600 text-center font-medium mt-4 bg-green-50 p-3 rounded-lg"
                  >
                    ✨ Thank you! We received your message and will get back to you soon.
                  </motion.p>
                )}

                {submitStatus === 'error' && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-center font-medium mt-4 bg-red-50 p-3 rounded-lg"
                  >
                    ❌ Oops! Something went wrong. Please try again or email us directly at contact@leanfeastai.com.
                  </motion.p>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
