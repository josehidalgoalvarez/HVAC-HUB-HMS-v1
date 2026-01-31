import React from 'react';
import { ASSETS } from '../../../utils/assets';

interface ProfileHeaderProps {
    isEditMode: boolean;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ isEditMode }) => {
    return (
        <div className="flex flex-col items-center gap-4 py-8">
            <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-primary via-brand-orange to-brand-red p-1 ring-4 ring-primary/10">
                <img
                    className="h-full w-full rounded-full object-cover border-4 border-white dark:border-brand-black"
                    src={ASSETS.DEFAULT_AVATAR}
                    alt="User"
                />
            </div>
            <div className="text-center">
                <h2 className="text-2xl font-bold text-brand-black dark:text-white">HVAC Home Manager</h2>
                <p className="text-text-sub-light dark:text-text-sub-dark font-medium">
                    Home Management {isEditMode && <span className="text-brand-orange font-bold text-xs ml-2 border border-brand-orange/30 px-2 py-0.5 rounded-full">ADMIN</span>}
                </p>
            </div>
        </div>
    );
};
