interface StatusBadgeProps {
    status: 'active' | 'suspended' | 'inactive' | 'featured' | 'deleted' | string;
    label?: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
    const getStatusConfig = () => {
        switch (status.toLowerCase()) {
            case 'active':
            case 'user':
                return {
                    bg: 'rgba(34, 197, 94, 0.1)',
                    text: 'text-green-700',
                    border: 'border-green-200',
                };
            case 'suspended':
                return {
                    bg: 'rgba(239, 68, 68, 0.1)',
                    text: 'text-red-700',
                    border: 'border-red-200',
                };
            case 'inactive':
                return {
                    bg: 'rgba(156, 163, 175, 0.1)',
                    text: 'text-gray-700',
                    border: 'border-gray-200',
                };
            case 'featured':
                return {
                    bg: 'rgba(59, 130, 246, 0.1)',
                    text: 'text-blue-700',
                    border: 'border-blue-200',
                };
            case 'deleted':
                return {
                    bg: 'rgba(107, 114, 128, 0.1)',
                    text: 'text-gray-600',
                    border: 'border-gray-300',
                };
            default:
                return {
                    bg: 'rgba(156, 163, 175, 0.1)',
                    text: 'text-gray-700',
                    border: 'border-gray-200',
                };
        }
    };

    const config = getStatusConfig();
    const displayLabel = label || status;

    return (
        <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${config.text} ${config.border}`}
            style={{ background: config.bg }}
        >
            {displayLabel}
        </span>
    );
}

