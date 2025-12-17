import { Link } from "react-router-dom";
import logo1 from "../assets/logos/logo-1.png";

export default function Footer() {
    return (
        <footer className="bg-secondary-light">
            <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-5 md:py-8 lg:py-12">
                {/* Logo */}
                <div className="text-center mb-2 sm:mb-4 md:mb-6 lg:mb-8">
                    <Link to="/" className="flex items-center justify-center">
                        <img
                            src={logo1}
                            alt="LeanFeastAI Logo"
                            className="h-5 sm:h-8 md:h-10 w-auto"
                        />
                        <span className="ml-1 sm:ml-2 text-sm sm:text-xl md:text-2xl font-bold text-primary">LeanFeastAI</span>
                    </Link>
                </div>

                {/* Navigation Links */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 md:gap-6 lg:gap-8 mb-2 sm:mb-4 md:mb-6 lg:mb-8">
                    <div className="text-center md:text-left">
                        <Link
                            to="/about"
                            className="text-neutral-61 hover:text-primary transition-colors duration-200 block py-0.5 sm:py-1 md:py-2 text-[11px] sm:text-sm"
                        >
                            About us
                        </Link>
                        <Link
                            to="/features"
                            className="text-neutral-61 hover:text-primary transition-colors duration-200 block py-0.5 sm:py-1 md:py-2 text-[11px] sm:text-sm"
                        >
                            Features
                        </Link>
                    </div>
                    <div className="text-center md:text-left">
                        <Link
                            to="/community"
                            className="text-neutral-61 hover:text-primary transition-colors duration-200 block py-0.5 sm:py-1 md:py-2 text-[11px] sm:text-sm"
                        >
                            Community
                        </Link>
                        <Link
                            to="/contact"
                            className="text-neutral-61 hover:text-primary transition-colors duration-200 block py-0.5 sm:py-1 md:py-2 text-[11px] sm:text-sm"
                        >
                            Contact
                        </Link>
                    </div>
                    <div className="text-center md:text-left">
                        <Link
                            to="/terms"
                            className="text-neutral-61 hover:text-primary transition-colors duration-200 block py-0.5 sm:py-1 md:py-2 text-[11px] sm:text-sm"
                        >
                            Terms & conditions
                        </Link>
                        <Link
                            to="/privacy"
                            className="text-neutral-61 hover:text-primary transition-colors duration-200 block py-0.5 sm:py-1 md:py-2 text-[11px] sm:text-sm"
                        >
                            Privacy policy
                        </Link>
                    </div>
                    <div className="text-center md:text-left">
                        <Link
                            to="/support"
                            className="text-neutral-61 hover:text-primary transition-colors duration-200 block py-0.5 sm:py-1 md:py-2 text-xs sm:text-sm"
                        >
                            Support
                        </Link>
                    </div>
                </div>

                {/* Social Media Icons */}
                <div className="flex justify-center space-x-1 sm:space-x-2 md:space-x-4 mb-2 sm:mb-4 md:mb-6 lg:mb-8">
                    <a
                        href="#"
                        className="bg-neutral-255 rounded-full p-1.5 sm:p-2 hover:bg-secondary-lighter transition-colors duration-200"
                        aria-label="Facebook"
                    >
                        <svg className="h-4 w-4 sm:h-5 sm:w-5 text-neutral-61" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                    </a>
                    <a
                        href="#"
                        className="bg-neutral-255 rounded-full p-1.5 sm:p-2 hover:bg-neutral-245 transition-colors duration-200"
                        aria-label="Instagram"
                    >
                        <svg className="h-4 w-4 sm:h-5 sm:w-5 text-neutral-61" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323c-.875.807-2.026 1.297-3.323 1.297zm7.718-1.297c-.875.807-2.026 1.297-3.323 1.297s-2.448-.49-3.323-1.297c-.807-.875-1.297-2.026-1.297-3.323s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323z" />
                        </svg>
                    </a>
                    <a
                        href="#"
                        className="bg-neutral-255 rounded-full p-1.5 sm:p-2 hover:bg-neutral-245 transition-colors duration-200"
                        aria-label="Twitter"
                    >
                        <svg className="h-4 w-4 sm:h-5 sm:w-5 text-neutral-61" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                        </svg>
                    </a>
                    <a
                        href="#"
                        className="bg-neutral-255 rounded-full p-1.5 sm:p-2 hover:bg-neutral-245 transition-colors duration-200"
                        aria-label="Pinterest"
                    >
                        <svg className="h-4 w-4 sm:h-5 sm:w-5 text-neutral-61" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323c-.875.807-2.026 1.297-3.323 1.297zm7.718-1.297c-.875.807-2.026 1.297-3.323 1.297s-2.448-.49-3.323-1.297c-.807-.875-1.297-2.026-1.297-3.323s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323z" />
                        </svg>
                    </a>
                    <a
                        href="#"
                        className="bg-neutral-255 rounded-full p-1.5 sm:p-2 hover:bg-neutral-245 transition-colors duration-200"
                        aria-label="YouTube"
                    >
                        <svg className="h-4 w-4 sm:h-5 sm:w-5 text-neutral-61" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                    </a>
                    <a
                        href="mailto:contact@leanfeastai.com"
                        className="bg-neutral-255 rounded-full p-1.5 sm:p-2 hover:bg-neutral-245 transition-colors duration-200"
                        aria-label="Email"
                    >
                        <svg className="h-4 w-4 sm:h-5 sm:w-5 text-neutral-61" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </a>
                </div>

                {/* Copyright */}
                <div className="text-center text-neutral-61 text-[11px] sm:text-sm">
                    <p>&copy; 2025 LeanFeastAI. All Rights Reserved.</p>
                </div>
            </div>
        </footer>
    );
}