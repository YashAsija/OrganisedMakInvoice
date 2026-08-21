'use client';

import React, { useState, useCallback } from 'react';
import { Sparkles, Loader2, X, Undo2, Redo2 } from 'lucide-react';
import {
  buildTemplateFieldSchema,
  extractInvoiceData,
  applySmartBillingData,
  SmartBillingSetters,
  SmartBillingExistingState,
} from '../lib/smartBilling';
import { InvoiceTemplate } from '../types';
import { emitNotification } from '../lib/notifications';
import { supabase } from '../lib/supabase';

interface SmartBillingBoxProps {
  activeTemplate: InvoiceTemplate;
  setters: SmartBillingSetters;
  existingState: SmartBillingExistingState;
}

interface InvoiceSnapshot {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  clientGstin: string;
  clientPan: string;
  clientState: string;
  clientCountry: string;
  shippedToName: string;
  shippedToPhone: string;
  shippedToEmail: string;
  shippedToAddress: string;
  shippedToGstin: string;
  shippedToPan: string;
  shippedToState: string;
  shippedToCountry: string;
  transport: string;
  vehicleNo: string;
  grRrNo: string;
  driverMobile: string;
  station: string;
  ewayBillNo: string;
  placeOfSupply: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  poNumber: string;
  referenceNumber: string;
  deliveryNote: string;
  notes: string;
  invoiceTerms: string;
  items: any[];
  discountValue: number;
  discountType: string;
  freightCharges: number;
  isFreightAdded: boolean;
  invoiceType: string;
  status: string;
  taxMode: string;
  customTaxName: string;
  customTaxPercentage: number;
  promptText: string;
}

/**
 * SmartBillingBox — self-contained UI for AI Smart Billing.
 *
 * Surface area into InvoiceModal:
 *   • ONE <SmartBillingBox /> component tag
 *   • setters prop (all form state setters bundled)
 *   • existingState prop (current field values for merge logic)
 */
export function SmartBillingBox({ activeTemplate, setters, existingState }: SmartBillingBoxProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastFilledCount, setLastFilledCount] = useState<number | null>(null);

  // Undo / Redo history stack
  const [history, setHistory] = useState<InvoiceSnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Helper to capture current invoice form state snapshot
  const captureSnapshot = useCallback((promptText = prompt): InvoiceSnapshot => {
    const s = existingState as any;
    return {
      clientName: s.clientName || '',
      clientEmail: s.clientEmail || '',
      clientPhone: s.clientPhone || '',
      clientAddress: s.clientAddress || '',
      clientGstin: s.clientGstin || '',
      clientPan: s.clientPan || '',
      clientState: s.clientState || '',
      clientCountry: s.clientCountry || '',

      shippedToName: s.shippedToName || '',
      shippedToPhone: s.shippedToPhone || '',
      shippedToEmail: s.shippedToEmail || '',
      shippedToAddress: s.shippedToAddress || '',
      shippedToGstin: s.shippedToGstin || '',
      shippedToPan: s.shippedToPan || '',
      shippedToState: s.shippedToState || '',
      shippedToCountry: s.shippedToCountry || '',

      transport: s.transport || '',
      vehicleNo: s.vehicleNo || '',
      grRrNo: s.grRrNo || '',
      driverMobile: s.driverMobile || '',
      station: s.station || '',
      ewayBillNo: s.ewayBillNo || '',
      placeOfSupply: s.placeOfSupply || '',

      invoiceNumber: s.invoiceNumber || '',
      date: s.date || '',
      dueDate: s.dueDate || '',
      poNumber: s.poNumber || '',
      referenceNumber: s.referenceNumber || '',
      deliveryNote: s.deliveryNote || '',

      notes: s.notes || '',
      invoiceTerms: s.invoiceTerms || '',
      items: s.items ? JSON.parse(JSON.stringify(s.items)) : [],

      discountValue: s.discountValue || 0,
      discountType: s.discountType || 'none',
      freightCharges: s.freightCharges || 0,
      isFreightAdded: s.isFreightAdded || false,
      invoiceType: s.invoiceType || 'invoice',
      status: s.status || 'pending',
      taxMode: s.taxMode || 'dynamic',
      customTaxName: s.customTaxName || '',
      customTaxPercentage: s.customTaxPercentage || 0,
      promptText,
    };
  }, [existingState, prompt]);

  // Helper to restore snapshot back to form setters
  const restoreSnapshot = useCallback((snap: InvoiceSnapshot) => {
    setters.setClientName(snap.clientName);
    setters.setClientEmail(snap.clientEmail);
    setters.setClientPhone(snap.clientPhone);
    setters.setClientAddress(snap.clientAddress);
    setters.setClientGstin(snap.clientGstin);
    setters.setClientPan(snap.clientPan);
    setters.setClientState(snap.clientState);
    setters.setClientCountry(snap.clientCountry);

    setters.setShippedToName(snap.shippedToName);
    setters.setShippedToPhone(snap.shippedToPhone);
    setters.setShippedToEmail(snap.shippedToEmail);
    setters.setShippedToAddress(snap.shippedToAddress);
    setters.setShippedToGstin(snap.shippedToGstin);
    setters.setShippedToPan(snap.shippedToPan);
    setters.setShippedToState(snap.shippedToState);
    setters.setShippedToCountry(snap.shippedToCountry);

    setters.setTransport(snap.transport);
    setters.setVehicleNo(snap.vehicleNo);
    setters.setGrRrNo(snap.grRrNo);
    setters.setDriverMobile(snap.driverMobile);
    setters.setStation(snap.station);
    setters.setEwayBillNo(snap.ewayBillNo);
    setters.setPlaceOfSupply(snap.placeOfSupply);

    setters.setInvoiceNumber(snap.invoiceNumber);
    setters.setDate(snap.date);
    setters.setDueDate(snap.dueDate);
    setters.setPoNumber(snap.poNumber);
    setters.setReferenceNumber(snap.referenceNumber);
    setters.setDeliveryNote(snap.deliveryNote);

    setters.setNotes(() => snap.notes);
    setters.setInvoiceTerms(snap.invoiceTerms);
    setters.setItems(() => JSON.parse(JSON.stringify(snap.items)));

    setters.setDiscountValue(snap.discountValue);
    setters.setDiscountType(snap.discountType as any);
    setters.setFreightCharges(snap.freightCharges);
    setters.setIsFreightAdded(snap.isFreightAdded);
    setters.setInvoiceType(snap.invoiceType as any);
    setters.setStatus(snap.status as any);
    setters.setTaxMode(snap.taxMode as any);
    setters.setCustomTaxName(snap.customTaxName);
    setters.setCustomTaxPercentage(snap.customTaxPercentage);

    if (snap.promptText !== undefined) {
      setPrompt(snap.promptText);
    }
  }, [setters]);

  const handleGenerate = useCallback(async (overwrite = false) => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      emitNotification('AI Smart Billing', 'Please type a billing description first.', 'info');
      return;
    }

    setIsLoading(true);
    setLastFilledCount(null);

    // Snapshot state BEFORE applying prompt
    const beforeSnap = captureSnapshot(trimmed);

    try {
      const schema = buildTemplateFieldSchema(activeTemplate);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const extracted = await extractInvoiceData(trimmed, schema, token, existingState);

      if (!extracted) {
        emitNotification('AI Smart Billing', 'Could not parse your description. Please try again or be more specific.', 'info');
        return;
      }

      const filled = applySmartBillingData(extracted, setters, existingState, trimmed, overwrite);
      setLastFilledCount(filled.size);

      if (filled.size === 0) {
        emitNotification('AI Smart Billing', 'No new fields were detected in your description.', 'info');
      } else {
        // Snapshot state AFTER applying prompt
        const afterSnap = captureSnapshot(trimmed);

        setHistory((prevHistory) => {
          const currentHistory = historyIndex >= 0 ? prevHistory.slice(0, historyIndex + 1) : [];
          if (currentHistory.length === 0) {
            return [beforeSnap, afterSnap];
          }
          return [...currentHistory, afterSnap];
        });

        setHistoryIndex((prevIdx) => {
          const baseIdx = prevIdx >= 0 ? prevIdx : 0;
          return baseIdx + 1;
        });

        emitNotification(
          'AI Smart Billing',
          `Auto-filled ${filled.size} field${filled.size === 1 ? '' : 's'} from your description.`,
          'success'
        );
        setPrompt('');
      }
    } catch (err) {
      console.error('[SmartBilling] Unexpected error:', err);
      emitNotification('AI Smart Billing', 'An unexpected error occurred. Please try again.', 'info');
    } finally {
      setIsLoading(false);
    }
  }, [prompt, activeTemplate, setters, existingState, captureSnapshot, historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0 || history.length === 0) return;
    const targetIdx = historyIndex - 1;
    const snap = history[targetIdx];
    if (snap) {
      restoreSnapshot(snap);
      setHistoryIndex(targetIdx);
      setLastFilledCount(null);
      emitNotification('AI Smart Billing', 'Undid last AI prompt change.', 'info');
    }
  }, [historyIndex, history, restoreSnapshot]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1 || history.length === 0) return;
    const targetIdx = historyIndex + 1;
    const snap = history[targetIdx];
    if (snap) {
      restoreSnapshot(snap);
      setHistoryIndex(targetIdx);
      setLastFilledCount(null);
      emitNotification('AI Smart Billing', 'Redid AI prompt change.', 'info');
    }
  }, [historyIndex, history, restoreSnapshot]);

  return (
    <div className="mx-1 mb-2.5 sm:mb-3 shrink-0">
      {/* Header */}
      <div className="p-2.5 sm:p-3 bg-gradient-to-br from-[#f4f9ff] via-[#f4f9ff] to-[#e0f2fe] dark:from-[#0f172a] dark:via-[#111827] dark:to-[#1e293b] border border-[#bae6fd] dark:border-[#0284c7]/40 rounded-xl sm:rounded-2xl shadow-xs">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#0284c7] to-[#2563eb] flex items-center justify-center shadow-xs shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-[#0284c7] dark:text-[#38bdf8]">
              AI Smart Billing
            </span>
            <span className="ml-1.5 text-[9.5px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#e0f2fe] dark:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8]">
              {activeTemplate.name}
            </span>
          </div>
          {lastFilledCount !== null && (
            <span className="ml-auto text-[9.5px] sm:text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50">
              ✓ {lastFilledCount} filled
            </span>
          )}
        </div>

        <p className="text-[10.5px] sm:text-[11px] text-slate-600 dark:text-slate-300 mb-2 font-medium leading-tight">
          Describe your invoice in plain English — client, items, tax, dates, transport. AI fills fields in your template.
        </p>

        {/* Input row */}
        <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); setLastFilledCount(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleGenerate(); } }}
              placeholder="e.g. Bill Sharma Traders ₹45000 for 5 laptops HSN 84713, GST 18%, vehicle DL9SAK2211, due in 30 days..."
              disabled={isLoading}
              className="smart-billing-prompt-input w-full pl-3 pr-7 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl border border-[#bae6fd] dark:border-[#0284c7]/50 focus:outline-none focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/30 disabled:opacity-60 transition-all shadow-xs"
            />
            {prompt && !isLoading && (
              <button
                type="button"
                onClick={() => { setPrompt(''); setLastFilledCount(null); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
            {/* Separate Undo Arrow Button */}
            <button
              type="button"
              onClick={handleUndo}
              disabled={isLoading || historyIndex <= 0}
              title="Undo AI Prompt (Revert last AI prompt change)"
              className="p-1.5 sm:p-2 bg-white dark:bg-slate-900 border border-[#bae6fd]/60 dark:border-[#223269]/60 hover:border-[#0284c7]/50 dark:hover:border-[#38bdf8]/50 text-[#0284c7] dark:text-[#38bdf8] disabled:opacity-35 disabled:cursor-not-allowed rounded-lg sm:rounded-xl transition-all shadow-xs flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
            >
              <Undo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Separate Redo Arrow Button */}
            <button
              type="button"
              onClick={handleRedo}
              disabled={isLoading || historyIndex >= history.length - 1}
              title="Redo AI Prompt (Re-apply next AI prompt change)"
              className="p-1.5 sm:p-2 bg-white dark:bg-slate-900 border border-[#bae6fd]/60 dark:border-[#223269]/60 hover:border-[#0284c7]/50 dark:hover:border-[#38bdf8]/50 text-[#0284c7] dark:text-[#38bdf8] disabled:opacity-35 disabled:cursor-not-allowed rounded-xl transition-all shadow-xs flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
            >
              <Redo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Generate Button */}
            <button
              type="button"
              onClick={() => handleGenerate(false)}
              disabled={isLoading || !prompt.trim()}
              className="flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 sm:py-2 bg-gradient-to-r from-[#0284c7] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8] shadow-[#0284c7]/15 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg sm:rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
            >
              {isLoading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Sparkles className="w-3.5 h-3.5" />
              }
              <span>{isLoading ? 'Generating…' : 'Generate'}</span>
            </button>

            {lastFilledCount !== null && (
              <button
                type="button"
                onClick={() => handleGenerate(true)}
                disabled={isLoading || !prompt.trim()}
                title="Regenerate and overwrite all fields"
                className="px-2.5 py-1.5 sm:py-2 border border-[#bae6fd] dark:border-[#223269] hover:border-[#0284c7] dark:hover:border-[#38bdf8] text-[#0284c7] dark:text-[#38bdf8] font-bold text-xs rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer"
              >
                <span>↺ All</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AI Loading overlay (inside the box, not full-modal) */}
      {isLoading && (
        <div className="mt-1.5 px-3 py-2 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd]/50 dark:border-[#223269]/50 rounded-lg sm:rounded-xl flex items-center gap-2 text-xs font-semibold text-[#0284c7] dark:text-[#38bdf8]">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>Scanning template schema &amp; extracting invoice data…</span>
        </div>
      )}
    </div>
  );
}
