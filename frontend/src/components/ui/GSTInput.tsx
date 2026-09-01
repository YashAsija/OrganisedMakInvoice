import React, { useState, useEffect, useRef } from 'react';
import { Check, X, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';

export interface GSTData {
  gstin: string;
  legalName: string;
  tradeName: string;
  companyName?: string;
  customerName?: string;
  address: {
    building?: string;
    street?: string;
    locality?: string;
    city?: string;
    state?: string;
    pincode?: string;
    full?: string;
  };
  businessType?: string;
  status?: string;
  registrationDate?: string;
  stateCode?: string;
  state?: string;
  country?: string;
  pan?: string;
}

interface GSTInputProps {
  value?: string;
  onChange?: (val: string) => void;
  onDataFetched?: (data: GSTData) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours TTL

export const GSTInput: React.FC<GSTInputProps> = ({
  value = '',
  onChange,
  onDataFetched,
  onClear,
  placeholder = 'Enter 15-digit GSTIN...',
  className = '',
  disabled = false
}) => {
  const [gstin, setGstin] = useState(value);
  const [statusState, setStatusState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [fetchedData, setFetchedData] = useState<GSTData | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setGstin(value);
  }, [value]);

  const validateAndFetch = (val: string) => {
    const cleanGst = val.trim().toUpperCase();
    setErrorMessage('');

    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!cleanGst) {
      setStatusState('idle');
      setFetchedData(null);
      return;
    }

    if (cleanGst.length === 15 && !gstRegex.test(cleanGst)) {
      setStatusState('error');
      setErrorMessage('Invalid GSTIN format');
      return;
    }

    if (cleanGst.length === 15 && gstRegex.test(cleanGst)) {
      setStatusState('success');
    } else {
      setStatusState('idle');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value.toUpperCase();

    // If clearing field when data was previously auto-filled
    if (gstin && !newVal && fetchedData) {
      setShowClearModal(true);
    }

    setGstin(newVal);
    if (onChange) onChange(newVal);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      validateAndFetch(newVal);
    }, 400); // 400ms Debounce
  };

  const confirmClearAll = () => {
    setShowClearModal(false);
    setGstin('');
    setStatusState('idle');
    setFetchedData(null);
    if (onChange) onChange('');
    if (onClear) onClear();
  };

  const keepExistingDetails = () => {
    setShowClearModal(false);
    setGstin('');
    setStatusState('idle');
    if (onChange) onChange('');
  };

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          value={gstin}
          onChange={handleInputChange}
          placeholder={placeholder}
          maxLength={15}
          disabled={disabled}
          className={`w-full px-3.5 py-2.5 pr-10 text-[13px] font-medium tracking-wider uppercase rounded-lg border transition-all duration-200 outline-none ${
            statusState === 'error'
              ? 'border-red-500 bg-red-50/20 text-red-900 focus:ring-2 focus:ring-red-500/20'
              : statusState === 'success'
              ? 'border-emerald-500 bg-emerald-50/10 text-emerald-950 focus:ring-2 focus:ring-emerald-500/20'
              : 'border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 text-slate-800 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
          } ${className}`}
        />

        {/* Status Icons */}
        <div className="absolute right-3 flex items-center space-x-1.5 pointer-events-auto">
          {statusState === 'success' && (
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          )}

          {statusState === 'error' && (
            <X className="w-4 h-4 text-red-500" />
          )}
        </div>
      </div>

      {/* Inline Error Message */}
      {statusState === 'error' && errorMessage && (
        <p className="mt-1 text-[11px] font-medium text-red-600 dark:text-red-400 flex items-center space-x-1">
          <span>✗ {errorMessage}</span>
        </p>
      )}

    </div>
  );
};
