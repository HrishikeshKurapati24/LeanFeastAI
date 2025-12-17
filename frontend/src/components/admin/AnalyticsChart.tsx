import { ReactNode } from 'react';

interface AnalyticsChartProps {
    title: string;
    children: ReactNode;
    height?: number;
}

export default function AnalyticsChart({ title, children, height = 300 }: AnalyticsChartProps) {
    return (
        <div
            className="rounded-lg md:rounded-xl p-1.5 md:p-6"
            style={{
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 4px 16px rgba(34, 197, 94, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05)',
            }}
        >
            <h3 className="text-xs md:text-lg font-semibold text-neutral-42 mb-1.5 md:mb-4">{title}</h3>
            <div style={{ height: `${height}px` }}>{children}</div>
        </div>
    );
}

