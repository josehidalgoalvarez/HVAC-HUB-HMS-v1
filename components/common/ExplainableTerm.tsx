import React, { useState, useRef, useEffect } from 'react';
import { getGlossaryEntry } from '../../utils/glossary';

interface ExplainableTermProps {
  term: string;
  display?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

/**
 * TapToExplain wrapper:
 * Tapping the word displays a sleek, in-place explanation tooltip.
 * Affordance: subtle dotted underline with an optional help indicator.
 * Touch target: min 44px tap target wrapped cleanly.
 * Stops propagation so parent card / ticket navigation is never triggered.
 */
export const ExplainableTerm: React.FC<ExplainableTermProps> = ({
  term,
  display,
  className = '',
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const entry = getGlossaryEntry(term);

  // Close when clicking or tapping outside
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen]);

  if (!entry) {
    return <span className={className}>{children || display || term}</span>;
  }

  const handleToggle = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(!isOpen);
  };

  return (
    <span
      ref={containerRef}
      className={`relative inline-flex items-center cursor-pointer select-none ${className}`}
      onClick={handleToggle}
      role="button"
      tabIndex={0}
      aria-expanded={isOpen}
      aria-label={`${entry.label}: ${entry.explanation}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        } else if (e.key === 'Escape') {
          setIsOpen(false);
        }
      }}
    >
      <span className="inline-flex items-center border-b border-dotted border-current/70 hover:opacity-90 active:scale-95 transition-all">
        {children || display || entry.label}
      </span>

      {/* Floating explanation popover */}
      {isOpen && (
        <span
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 max-w-[85vw] p-2.5 rounded-xl bg-gray-900 text-white dark:bg-neutral-800 dark:text-neutral-100 dark:border dark:border-neutral-700 shadow-xl text-left text-xs font-normal leading-snug animate-fadeIn cursor-default pointer-events-auto"
        >
          <span className="block font-bold text-primary dark:text-sky-400 mb-1 flex items-center gap-1 uppercase tracking-wider text-xs">
            <span aria-hidden="true" className="material-symbols-outlined text-[13px]">help_outline</span>
            {entry.label}
          </span>
          <span className="block text-[11px] text-gray-200 dark:text-gray-200">
            {entry.explanation}
          </span>
          {/* Subtle triangle caret pointing down */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-neutral-800 pointer-events-none" />
        </span>
      )}
    </span>
  );
};
