import React from 'react';

interface InputProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  prefix?: React.ReactNode;
  type?: string;
}

export const Input: React.FC<InputProps> = ({ id, label, value, onChange, placeholder, error, helperText, icon, prefix, type = 'text' }) => {
  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1">
        {label}
      </label>
      <div className="relative rounded-md shadow-sm">
        {prefix ? (
          <div className="absolute inset-y-0 left-0 flex items-center">
            {prefix}
          </div>
        ) : (
          icon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
              {icon}
            </div>
          )
        )}
        <input
          type={type}
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`block w-full ${prefix ? 'pl-14' : 'pl-10'} pr-4 py-2 border rounded-lg bg-background text-foreground focus:outline-none sm:text-sm ${
            error
              ? 'border-destructive focus:ring-destructive focus:border-destructive'
              : 'border-input focus:ring-ring focus:border-ring'
          }`}
          step="any"
        />
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      {!error && helperText && <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
};