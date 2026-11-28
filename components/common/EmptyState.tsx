import React from 'react';

const BASE_SHELL =
  'text-center px-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800';

const PADDING_CLASSES: Record<'md' | 'sm' | 'lg', string> = {
  md: 'py-12',
  sm: 'py-10',
  lg: 'py-16',
};

const SPACING_CLASSES: Record<'compact' | 'normal', string> = {
  compact: 'space-y-2',
  normal: 'space-y-3',
};

const TONE_CLASSES: Record<'transparent' | 'subtle' | 'faint', string> = {
  transparent: '',
  subtle: 'bg-white/50 dark:bg-card-dark/50',
  faint: 'bg-white/40 dark:bg-card-dark/40',
};

const TITLE_SIZE_CLASSES: Record<'sm' | 'base', string> = {
  sm: 'text-sm',
  base: 'text-base',
};

export interface EmptyStateProps {
  icon?: string;
  iconClassName?: string;
  iconWrapperClassName?: string;
  title: React.ReactNode;
  titleSize?: 'sm' | 'base';
  titleClassName?: string;
  subtitle?: React.ReactNode;
  subtitleClassName?: string;
  action?: React.ReactNode;
  spacing?: 'compact' | 'normal';
  padding?: 'md' | 'sm' | 'lg';
  tone?: 'transparent' | 'subtle' | 'faint';
  className?: string;
}

/**
 * Shared dashed-border empty state card for list, plan, and inventory views.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  iconClassName = 'text-4xl text-gray-300',
  iconWrapperClassName,
  title,
  titleSize = 'sm',
  titleClassName = 'font-bold text-gray-700 dark:text-gray-300',
  subtitle,
  subtitleClassName = 'text-xs text-gray-400',
  action,
  spacing = 'compact',
  padding = 'md',
  tone = 'transparent',
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

  const iconEl = icon ? (
    <span aria-hidden="true" className={`material-symbols-outlined ${iconClassName}`}>
      {icon}
    </span>
  ) : null;

  return (
    <div className={containerClasses}>
      {iconEl && (iconWrapperClassName ? <div className={iconWrapperClassName}>{iconEl}</div> : iconEl)}
      <p className={`${TITLE_SIZE_CLASSES[titleSize]} ${titleClassName}`}>{title}</p>
      {subtitle && <p className={subtitleClassName}>{subtitle}</p>}
      {action}
    </div>
  );
};
