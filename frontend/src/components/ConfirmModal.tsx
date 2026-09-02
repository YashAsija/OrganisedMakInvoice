import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsRendered(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isRendered) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 pb-[env(safe-area-inset-bottom)] overflow-y-auto">
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onCancel}
      />
      
      <div 
        className={`bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl sm:rounded-3xl shadow-2xl border border-[#bae6fd]/60 dark:border-[#223269]/60 overflow-hidden relative z-10 max-h-[92vh] sm:max-h-[88vh] flex flex-col transition-all duration-200 ${
          isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'
        }`}
      >
        <div className="p-4 sm:p-6 pb-5 sm:pb-7 overflow-y-auto flex-1">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3.5 sm:mb-5">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          
          <h3 className="text-base sm:text-[19px] font-black text-slate-900 dark:text-white mb-2 sm:mb-2.5 tracking-tight">
            {title}
          </h3>
          
          <p className="text-xs sm:text-[13px] text-slate-500 dark:text-zinc-400 font-medium leading-relaxed">
            {message}
          </p>
        </div>

        <div className="p-3.5 sm:px-6 sm:py-5 bg-slate-50 dark:bg-zinc-800/50 flex flex-wrap items-center justify-end gap-2.5 sm:gap-3 rounded-b-2xl sm:rounded-b-3xl shrink-0 border-t border-slate-100 dark:border-zinc-800">
          <button
            onClick={onCancel}
            className="flex-1 sm:flex-none px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 sm:flex-none px-5 sm:px-6 py-2 sm:py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/20 hover:shadow-lg hover:shadow-rose-600/30 rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
