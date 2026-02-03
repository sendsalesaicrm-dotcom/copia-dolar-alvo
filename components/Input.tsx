import React, { useMemo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

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
  showPasswordToggle?: boolean;
}

export const Input: React.FC<InputProps> = ({ id, label, value, onChange, placeholder, error, helperText, icon, prefix, type = 'text', showPasswordToggle = false }) => {
  const [showPassword, setShowPassword] = useState(false);
  const effectiveType = useMemo(() => {
    if (showPasswordToggle && type === 'password') {
      return showPassword ? 'text' : 'password';
    }
    return type;
  }, [showPasswordToggle, type, showPassword]);
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
          type={effectiveType}
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`block w-full ${prefix ? 'pl-14' : 'pl-10'} ${showPasswordToggle && type === 'password' ? 'pr-10' : 'pr-4'} py-2 border rounded-lg bg-background text-foreground focus:outline-none sm:text-sm ${
            error
              ? 'border-destructive focus:ring-destructive focus:border-destructive'
              : 'border-input focus:ring-ring focus:border-ring'
          }`}
          step="any"
        />
        {showPasswordToggle && type === 'password' && (
          <button
            type="button"
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            onClick={() => setShowPassword((s) => !s)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      {!error && helperText && <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
};