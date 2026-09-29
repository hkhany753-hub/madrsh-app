import { useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[] | string[];
  placeholder?: string;
  icon?: ReactNode;
}

export function Select({ value, onChange, options, placeholder, icon }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-surface-2 border border-border rounded-xl text-white text-sm interactive"
      >
        <span className="flex items-center gap-2">
          {icon}
          <span className={value ? '' : 'text-zinc-500'}>{value || placeholder}</span>
        </span>
        <ChevronDown
          size={18}
          className={`text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full bg-surface border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto fade-in">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`w-full text-right px-4 py-2.5 text-sm hover:bg-surface-2 transition-base ${
                  value === opt ? 'text-primary bg-primary-5' : 'text-zinc-300'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface InputProps {
  type?: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: ReactNode;
  min?: number;
  max?: number;
}

export function Input({ type = 'text', value, onChange, placeholder, icon, min, max }: InputProps) {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
          {icon}
        </div>
      )}
      <input
        type={type}
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full ${icon ? 'pr-10' : 'pr-4'} pl-4 py-3 bg-surface-2 border border-border rounded-xl text-white text-sm placeholder:text-zinc-500 focus:border-primary focus:outline-none transition-base`}
      />
    </div>
  );
}

interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export function TextArea({ value, onChange, placeholder, rows = 3 }: TextAreaProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-4 py-3 bg-surface-2 border border-border rounded-xl text-white text-sm placeholder:text-zinc-500 focus:border-primary focus:outline-none transition-base resize-none"
    />
  );
}

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
}

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  fullWidth = false,
}: ButtonProps) {
  const variants = {
    primary: 'bg-primary hover:bg-primary-hover text-white shadow-primary hover:shadow-primary-lg',
    secondary: 'bg-surface-2 hover:bg-zinc-700 text-zinc-200 border border-border',
    danger: 'bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20',
    ghost: 'hover:bg-surface-2 text-zinc-300',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold interactive disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:shadow-none ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
}
