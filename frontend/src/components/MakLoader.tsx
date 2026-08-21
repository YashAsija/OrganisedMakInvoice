import React from 'react';

interface MakLoaderProps {
  variant?: 'spinner' | 'dots' | 'full-screen' | 'card';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  className?: string;
}

export const MakLoader: React.FC<MakLoaderProps> = ({
  variant = 'spinner',
  size = 'md',
  label,
  className = ''
}) => {
  const sizeMap = {
    sm: 'w-4 h-4 border-[1.75px]',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-[2.25px]',
    xl: 'w-10 h-10 border-[2.5px]',
  }[size];

  if (variant === 'full-screen') {
    return (
      <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#f4f9ff]/95 dark:bg-[#0b1329]/95 backdrop-blur-xs transition-opacity duration-300 ${className}`}>
        <div className="flex flex-col items-center gap-3.5">
          <div className="relative flex items-center justify-center">
            <div 
              className="w-9 h-9 rounded-full border-2 border-[#bae6fd]/70 dark:border-[#223269]/70 border-t-[#0284c7] dark:border-t-[#38bdf8] animate-spin" 
              style={{ animationDuration: '0.7s' }} 
            />
          </div>
          {label && (
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#0284c7] dark:text-[#38bdf8]">
              {label}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`flex flex-col items-center justify-center py-10 px-4 text-center ${className}`}>
        <div 
          className={`${sizeMap} rounded-full border-[#bae6fd]/70 dark:border-[#223269]/70 border-t-[#0284c7] dark:border-t-[#38bdf8] animate-spin`} 
          style={{ animationDuration: '0.7s' }} 
        />
        {label && (
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#0284c7] dark:text-[#38bdf8] mt-2.5">
            {label}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        {label && <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</span>}
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7] dark:bg-[#38bdf8] animate-pulse" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7] dark:bg-[#38bdf8] animate-pulse" style={{ animationDelay: '200ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7] dark:bg-[#38bdf8] animate-pulse" style={{ animationDelay: '400ms' }} />
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div 
        className={`${sizeMap} rounded-full border-[#bae6fd]/70 dark:border-[#223269]/70 border-t-[#0284c7] dark:border-t-[#38bdf8] animate-spin shrink-0`} 
        style={{ animationDuration: '0.7s' }} 
      />
      {label && <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</span>}
    </div>
  );
};
