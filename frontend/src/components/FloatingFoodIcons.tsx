import { useEffect, useRef } from "react";

interface FloatingFoodIconsProps {
    icons?: string[];
}

export default function FloatingFoodIcons({ 
    icons = ["🍳", "🥗", "🍕", "🌮", "🍜", "🍔", "🥘", "🍝", "🍰", "🥑"]
}: FloatingFoodIconsProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;
            const scrolled = window.pageYOffset;
            const icons = containerRef.current.querySelectorAll('.floating-icon');
            
            icons.forEach((icon, index) => {
                const element = icon as HTMLElement;
                const speed = 0.3 + (index % 3) * 0.2; // Varying speeds for parallax
                const yPos = -(scrolled * speed * 0.1); // Light parallax effect
                element.style.transform = `translateY(${yPos}px)`;
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div 
            ref={containerRef}
            className="fixed inset-0 pointer-events-none overflow-hidden z-0"
            aria-hidden="true"
        >
            {icons.map((icon, index) => {
                const left = 10 + (index * 12) % 80; // Distribute across width
                const top = 15 + (index * 15) % 70; // Distribute across height
                const delay = index * 0.5; // Stagger animation delays
                const duration = 8 + (index % 4) * 2; // Varying animation durations
                
                return (
                    <div
                        key={index}
                        className="floating-icon absolute text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl opacity-5 sm:opacity-8 md:opacity-10 lg:opacity-15"
                        style={{
                            left: `${left}%`,
                            top: `${top}%`,
                            animation: `float ${duration}s ease-in-out infinite`,
                            animationDelay: `${delay}s`,
                        }}
                    >
                        {icon}
                    </div>
                );
            })}
        </div>
    );
}

