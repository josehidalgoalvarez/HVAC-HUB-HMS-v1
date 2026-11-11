import React, { useEffect, useRef, useId } from 'react';

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  zIndexClass?: string;
  title?: string;
}

export const Modal: React.FC<ModalProps> = ({
  onClose,
  children,
  className = 'max-w-md',
  zIndexClass = 'z-[60]',
  title,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Focus management and Escape key handler
  useEffect(() => {
    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;

    // Focus the dialog container or first focusable element inside dialog
    const dialogElement = dialogRef.current;
    if (dialogElement) {
      const focusableSelector =
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const focusableElements = dialogElement.querySelectorAll<HTMLElement>(focusableSelector);

      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        dialogElement.focus();
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab' && dialogElement) {
        const focusableSelector =
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const focusables = Array.from(dialogElement.querySelectorAll<HTMLElement>(focusableSelector));

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || document.activeElement === dialogElement) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to trigger element on close
      if (previouslyFocusedElementRef.current && typeof previouslyFocusedElementRef.current.focus === 'function') {
        previouslyFocusedElementRef.current.focus();
      }
    };
  }, [onClose]);

  return (
    <div className={`fixed inset-0 ${zIndexClass} flex items-end sm:items-center justify-center p-4 sm:p-0`}>
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`relative w-full ${className} bg-white dark:bg-background-dark rounded-t-3xl sm:rounded-3xl p-6 pb-safe shadow-2xl flex flex-col animate-[slideUp_0.3s_ease-out] max-h-[90vh] overflow-y-auto focus:outline-none`}
      >
        {/* Accessible dialog title */}
        {title && (
          <h2 id={titleId} className="sr-only">
            {title}
          </h2>
        )}
        {/* Drag Handle (Visual indicator for Mobile) */}
        <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-6 shrink-0 sm:hidden" aria-hidden="true" />
        {children}
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
