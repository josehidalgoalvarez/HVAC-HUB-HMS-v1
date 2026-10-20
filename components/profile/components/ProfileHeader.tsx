import React from 'react';
import { ASSETS } from '../../../utils/assets';

interface ProfileHeaderProps {
    isEditMode: boolean;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ isEditMode }) => {
    return (
        <div className="flex flex-col items-center gap-4 py-8">
            <div className="h-24 w-24 rounded-full bg-primary p-1 ring-2 ring-primary/20">
                <img
                    className="h-full w-full rounded-full object-cover border-4 border-white dark:border-brand-black"
                    src={ASSETS.DEFAULT_AVATAR}
                    alt="User"
                />
            </div>
            <div className="text-center">
                <h2 className="text-xl font-bold text-brand-black dark:text-white">Patry Maintenance</h2>
                <p className="text-xs text-text-sub-light dark:text-text-sub-dark font-medium mt-0.5">
                    Field Technician {isEditMode && <span className="text-primary font-bold text-xs ml-2 border border-primary/30 px-2 py-0.5 rounded-full">ADMIN</span>}
                </p>
            </div>
        </div>
    );
};
