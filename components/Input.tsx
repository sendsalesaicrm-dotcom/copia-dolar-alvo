import React, { useMemo, useState } from 'react';
import { Eye, EyeOff, HelpCircle } from 'lucide-react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  inputPrefix?: React.ReactNode;
  type?: string;
  showPasswordToggle?: boolean;
  labelClassName?: string;
  labelTooltip?: string;
}

export const Input: React.FC<InputProps> = ({ id, label, value, onChange, placeholder, error, helperText, icon, inputPrefix, type = 'text', showPasswordToggle = false, labelClassName = '', labelTooltip, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const effectiveType = useMemo(() => {
    if (showPasswordToggle && type === 'password') {
      return showPassword ? 'text' : 'password';
    }
    return type;
  }, [showPasswordToggle, type, showPassword]);
  return (
    <div className="w-full">
      <label htmlFor={id} className={`flex items-center justify-center gap-1.5 text-sm font-medium text-foreground mb-1 ${labelClassName}`}>
        {label}
        {labelTooltip && (
          <div className="group relative">
            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help hover:text-primary transition-colors" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-card border border-border text-[10px] text-foreground rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl z-50 font-bold">
              {labelTooltip}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-card" />
            </div>
          </div>
        )}
      </label>
      <div className="relative rounded-md shadow-sm">
        {inputPrefix ? (
          <div className="absolute inset-y-0 left-0 flex items-center">
            {inputPrefix}
          </div>
        ) : (
          icon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
              {icon}
            </div>
          )
        )}
        <input
          {...props}
          type={effectiveType}
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`block w-full ${inputPrefix ? 'pl-14' : (icon ? 'pl-10' : (props.className?.includes('text-center') ? 'px-0' : 'px-4'))} ${showPasswordToggle && type === 'password' ? 'pr-10' : (props.className?.includes('text-center') ? 'pr-0' : 'pr-4')} py-2 border rounded-lg bg-background text-foreground focus:outline-none sm:text-sm ${error
            ? 'border-destructive focus:ring-destructive focus:border-destructive'
            : 'border-input focus:ring-ring focus:border-ring'
            } ${props.className || ''}`}
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