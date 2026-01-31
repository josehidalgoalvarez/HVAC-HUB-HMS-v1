
import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  variant?: 'ghost' | 'glass' | 'solid' | 'primary';
  size?: 'sm' | 'md' | 'lg';
}

const IconButton: React.FC<IconButtonProps> = ({ 
  icon, 
  variant = 'ghost', 
  size = 'md',
  className = '', 
  ...props 
}) => {
  
  const baseStyles = "rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    ghost: "hover:bg-gray-100 dark:hover:bg-gray-800 text-brand-black dark:text-white",
    glass: "bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30 shadow-sm",
    solid: "bg-white dark:bg-card-dark text-brand-black dark:text-white shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700",
    primary: "bg-primary text-white hover:bg-primary/90 shadow-md"
  };

  const sizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12"
  };

  const iconSizes = {
    sm: "text-[18px]",
    md: "text-[20px]",
    lg: "text-[24px]"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      <span className={`material-symbols-outlined ${iconSizes[size]}`}>{icon}</span>
    </button>
  );
};

export default IconButton;
