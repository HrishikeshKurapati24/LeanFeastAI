import { type ReactNode } from 'react';

interface Column<T> {
    key: string;
    header: string;
    render?: (item: T) => ReactNode;
    sortable?: boolean;
    hiddenOnMobile?: boolean;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    onRowClick?: (item: T) => void;
    actions?: (item: T) => ReactNode;
    loading?: boolean;
}

export default function DataTable<T extends { id?: string }>({
    data,
    columns,
    onRowClick,
    actions,
    loading,
}: DataTableProps<T>) {
    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="text-5xl mb-4 animate-pulse">⏳</div>
                <p className="text-neutral-61">Loading...</p>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-5xl mb-4">📭</div>
                <p className="text-neutral-61">No data available</p>
            </div>
        );
    }

    return (
        <div
            className="rounded-2xl overflow-hidden"
            style={{
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05)',
            }}
        >
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr
                            style={{
                                background: 'rgba(34, 197, 94, 0.05)',
                                borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                            }}
                        >
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={`px-2 py-1 md:px-4 md:py-3 text-left text-xs font-semibold text-neutral-42 uppercase tracking-wider ${column.hiddenOnMobile ? 'hidden md:table-cell' : ''} ${column.key === 'email' || column.key === 'title' ? 'max-w-[200px] md:max-w-[300px]' : ''}`}
                                >
                                    {column.header}
                                </th>
                            ))}
                            {actions && <th className="px-2 py-1 md:px-4 md:py-3 text-left text-xs font-semibold text-neutral-42 uppercase tracking-wider">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {data.map((item, index) => (
                            <tr
                                key={item.id || index}
                                onClick={() => onRowClick?.(item)}
                                className={`hover:bg-neutral-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''
                                    }`}
                            >
                                {columns.map((column) => (
                                    <td key={column.key} className={`px-2 py-1 md:px-4 md:py-3 text-xs md:text-sm text-neutral-61 ${column.hiddenOnMobile ? 'hidden md:table-cell' : ''} ${column.key === 'email' || column.key === 'title' ? 'max-w-[200px] md:max-w-[300px]' : ''}`}>
                                        <div className="max-w-full">
                                            {column.render
                                                ? column.render(item)
                                                : (item as any)[column.key]}
                                        </div>
                                    </td>
                                ))}
                                {actions && (
                                    <td className="px-2 py-1 md:px-4 md:py-3 whitespace-nowrap text-xs md:text-sm">
                                        {actions(item)}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

