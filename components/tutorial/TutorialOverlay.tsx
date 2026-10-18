import React from 'react';
import { TutorialStep } from '../../tutorial';

interface TutorialOverlayProps {
    step: TutorialStep;
    onNext: () => void;
    onPrev: () => void;
    onExit: () => void;
    stepIndex: number;
    totalSteps: number;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ step, onNext, onPrev, onExit, stepIndex, totalSteps }) => {

    // Simple positioning logic
    const getPositionClass = (position: string) => {
        switch (position) {
            case 'center': return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
            case 'top': return 'top-10 left-1/2 -translate-x-1/2';
            case 'bottom': return 'bottom-10 left-1/2 -translate-x-1/2';
            case 'left': return 'left-10 top-1/2 -translate-y-1/2';
            case 'right': return 'right-10 top-1/2 -translate-y-1/2';
            default: return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
            {/* Backdrop with 60% opacity */}
            <div className="absolute inset-0 bg-black/60 pointer-events-auto" onClick={onExit} />

            {/* Tutorial Card */}
            <div className={`absolute ${getPositionClass(step.position)} bg-white dark:bg-card-dark p-6 rounded-2xl shadow-2xl max-w-sm w-full pointer-events-auto border border-gray-100 dark:border-gray-700 animate-fade-in`}>
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-brand-black dark:text-white">{step.title}</h3>
                    <button onClick={onExit} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                    {step.content}
                </p>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-700/50">
                    <span className="text-xs font-medium text-gray-400">Step {stepIndex + 1} of {totalSteps}</span>

                    <div className="flex gap-2">
                        {stepIndex > 0 && (
                            <button
                                onClick={onPrev}
                                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                Previous
                            </button>
                        )}
                        <button
                            onClick={onNext}
                            className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-95"
                        >
                            {stepIndex === totalSteps - 1 ? 'Finish' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
