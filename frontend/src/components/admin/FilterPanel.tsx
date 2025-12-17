import { ReactNode, useState } from 'react';

interface FilterPanelProps {
    title: string;
    children: ReactNode;
    defaultOpen?: boolean;
}

export default function FilterPanel({ title, children, defaultOpen = false }: FilterPanelProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div
            className="rounded-lg md:rounded-xl p-1.5 md:p-4 mb-1.5 md:mb-4"
            style={{
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 4px 16px rgba(34, 197, 94, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05)',
            }}
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between text-left py-0.5 md:py-1"
            >
                <h3 className="text-xs md:text-sm font-semibold text-neutral-42">{title}</h3>
                <span className="text-xs md:text-sm text-neutral-61">{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && <div className="mt-1.5 md:mt-4 space-y-1.5 md:space-y-3">{children}</div>}
        </div>
    );
}

