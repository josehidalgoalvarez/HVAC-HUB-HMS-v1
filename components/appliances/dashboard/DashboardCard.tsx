import React from 'react';

interface DashboardCardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    action?: React.ReactNode;
    bgColor?: string; // Optional override for background color
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
    children,
    className = '',
    title,
    action,
    bgColor
}) => {
    const bgClass = bgColor ? bgColor : 'bg-white dark:bg-card-dark';
    const borderClass = bgColor ? 'border-transparent' : 'border-gray-100 dark:border-gray-800';

    return (
        <div className={`${bgClass} rounded-2xl p-5 shadow-sm border ${borderClass} ${className} transition-all`}>
            {(title || action) && (
                <div className="flex justify-between items-center mb-4">
                    {title && <h3 className={`font-bold text-lg ${bgColor ? 'text-white' : 'text-brand-black dark:text-white'}`}>{title}</h3>}
                    {action}
                </div>
            )}
            {children}
        </div>
    );
};
