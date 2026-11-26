import React from 'react';

const BASE_FIELD_CLASSES =
  'w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-neutral-800 focus:outline-none focus:border-primary';

const SIZE_CLASSES: Record<'xs' | 'sm', string> = {
  xs: 'text-xs',
  sm: 'text-sm',
};

export interface TextInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'xs' | 'sm';
}

export const TextInput: React.FC<TextInputProps> = ({
  size = 'xs',
  className = '',
  ...props
}) => {
  return (
    <input
      {...props}
      className={`${BASE_FIELD_CLASSES} ${SIZE_CLASSES[size]}${className ? ` ${className}` : ''}`}
    />
  );
};

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: 'xs' | 'sm';
}

export const Select: React.FC<SelectProps> = ({
  size = 'xs',
  className = '',
  children,
  ...props
}) => {
  return (
    <select
      {...props}
      className={`${BASE_FIELD_CLASSES} ${SIZE_CLASSES[size]}${className ? ` ${className}` : ''}`}
    >
      {children}
    </select>
  );
};

export interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({ label, required = false, children }) => {
  return (
    <>
      <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
        {label}
        {required && (
          <>
            {' '}
            <span className="text-brand-red">*</span>
          </>
        )}
      </label>
      {children}
    </>
  );
};
