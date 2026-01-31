import React from 'react';

export interface MenuItem {
    icon: string;
    label: string;
    action: () => void;
    color?: string;
}

interface ProfileMenuProps {
    items: MenuItem[];
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ items }) => {
    return (
        <div className="bg-card-light dark:bg-card-dark rounded-2xl p-2 shadow-ethereal border border-gray-100 dark:border-gray-800">
            {items.map((item, idx) => (
                <button
                    key={idx}
                    onClick={item.action}
                    className="w-full flex items-center justify-between p-4 hover:bg-background-light dark:hover:bg-gray-800/50 rounded-xl transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined ${item.color || 'text-text-sub-light group-hover:text-primary'}`}>
                            {item.icon}
                        </span>
                        <span className={`font-medium ${item.color || 'text-brand-black dark:text-white'}`}>
                            {item.label}
                        </span>
                    </div>
                    <span className="material-symbols-outlined text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all">
                        chevron_right
                    </span>
                </button>
            ))}
        </div>
    );
};
