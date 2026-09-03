import React, { useState, useEffect, useRef } from 'react';

interface EditableFieldProps {
  value: string | number;
  onSave: (val: string) => void;
  type?: 'text' | 'number' | 'textarea' | 'select';
  options?: { value: string, label: string }[];
  className?: string;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
}

export function EditableField({ 
  value, 
  onSave, 
  type = 'text', 
  options = [],
  className = '', 
  placeholder = '...',
  prefix,
  suffix
}: EditableFieldProps) {
  const [editingValue, setEditingValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditingValue(value);
  }, [value]);

  useEffect(() => {
    if (type === 'textarea' && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [editingValue, type]);

  const handleBlur = () => {
    if (editingValue.toString() !== value.toString()) {
      onSave(editingValue.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      (e.currentTarget as HTMLElement).blur();
    }
  };

  // The print:border-transparent prevents borders from showing up during actual PDF printing
  const commonClasses = `bg-transparent border border-transparent hover:border-slate-200 hover:bg-slate-50/50 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 focus:bg-white rounded transition-colors w-full outline-none print:border-transparent print:bg-transparent ${className}`;

  return (
    <div className="relative inline-flex items-center w-full group">
      {prefix && <span className="absolute left-1 pointer-events-none text-slate-400">{prefix}</span>}
      
      {type === 'textarea' ? (
        <textarea
          ref={textareaRef}
          value={editingValue || ''}
          onChange={(e) => setEditingValue(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`${commonClasses} resize-none overflow-hidden block ${prefix ? 'pl-5' : ''} ${suffix ? 'pr-5' : ''}`}
          rows={1}
        />
      ) : type === 'select' ? (
        <select
          value={editingValue}
          onChange={(e) => {
            setEditingValue(e.target.value);
            onSave(e.target.value);
          }}
          onBlur={handleBlur}
          className={`${commonClasses} appearance-none cursor-pointer ${prefix ? 'pl-5' : ''} ${suffix ? 'pr-5' : ''}`}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`${commonClasses} ${prefix ? 'pl-5' : ''} ${suffix ? 'pr-5' : ''}`}
        />
      )}
      
      {suffix && <span className="absolute right-1 pointer-events-none text-slate-400">{suffix}</span>}
    </div>
  );
}
