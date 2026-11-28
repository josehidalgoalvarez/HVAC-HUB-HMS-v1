import React from 'react';

const BASE_SHELL = 'flex flex-col items-center justify-center';

const PADDING_CLASSES: Record<'lg' | 'md', string> = {
  lg: 'py-16',
  md: 'py-12',
};

const SPACING_CLASSES: Record<'normal' | 'compact', string> = {
  normal: 'gap-3',
  compact: 'gap-2',
};

const TONE_CLASSES: Record<'muted' | 'faint', string> = {
  muted: 'text-gray-500',
  faint: 'text-gray-400',
};

export interface LoadingStateProps {
  icon?: string;
  iconClassName?: string;
  message: React.ReactNode;
  messageClassName?: string;
  padding?: 'lg' | 'md';
  spacing?: 'normal' | 'compact';
  tone?: 'muted' | 'faint';
  className?: string;
}

/**
 * Shared centered spinner and message block for list, plan, and modal loading states.
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  icon = 'sync',
  iconClassName = 'text-4xl animate-spin text-primary',
  message,
  messageClassName = 'text-xs font-semibold',
  padding = 'lg',
  spacing = 'normal',
  tone = 'faint',
  className = '',
}) => {
  const containerClasses = [
    BASE_SHELL,
    PADDING_CLASSES[padding],
    SPACING_CLASSES[spacing],
    TONE_CLASSES[tone],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses}>
      <span aria-hidden="true" className={`material-symbols-outlined ${iconClassName}`}>
        {icon}
      </span>
      <p className={messageClassName}>{message}</p>
    </div>
  );
};
