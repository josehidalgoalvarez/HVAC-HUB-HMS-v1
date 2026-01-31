
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  fullWidth?: boolean;
  icon?: string;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  icon, 
  className = '', 
  ...props 
}) => {
  
  const baseStyles = "font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20",
    secondary: "bg-white dark:bg-card-dark text-brand-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700",
    outline: "bg-transparent border-2 border-primary text-primary hover:bg-primary/10",
    ghost: "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-brand-black dark:text-white",
    danger: "bg-brand-red text-white hover:bg-red-600 shadow-lg shadow-brand-red/20"
  };

  const padding = "py-3.5 px-6";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${padding} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {icon && <span className="material-symbols-outlined text-[20px]">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
