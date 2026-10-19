
import React from 'react';

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  zIndexClass?: string;
  title?: string;
}

export const Modal: React.FC<ModalProps> = ({ onClose, children, className = 'max-w-md', zIndexClass = 'z-[60]', title }) => {
  return (
    <div className={`fixed inset-0 ${zIndexClass} flex items-end sm:items-center justify-center p-4 sm:p-0`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className={`relative w-full ${className} bg-white dark:bg-background-dark rounded-t-3xl sm:rounded-3xl p-6 pb-safe shadow-2xl flex flex-col animate-[slideUp_0.3s_ease-out] max-h-[90vh] overflow-y-auto`}>
        {/* Drag Handle (Visual indicator for Mobile) */}
        <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-6 shrink-0 sm:hidden"></div>
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
