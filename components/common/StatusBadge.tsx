import React from 'react';

export interface StatusBadgeProps {
  status: string;
  classMap: Record<string, string>;
  label?: string;
  className?: string;
  testId?: string;
}

/**
 * Generic status pill rendering a caller-supplied classMap and shell with an
 * `'unknown'` fallback. Keeps colour/shell decisions at the call site.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  classMap,
  label,
  className = '',
  testId,
}) => {
  return (
    <span
      className={`${className} ${classMap[status] || classMap['unknown'] || ''}`}
      data-testid={testId}
    >
      {label ?? status}
    </span>
  );
};
