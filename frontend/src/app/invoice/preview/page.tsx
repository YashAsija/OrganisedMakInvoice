"use client";
import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { LivePreview } from '../../../components/TemplateBuilder/LivePreview';
import { Invoice, BusinessProfile } from '../../../types';
import { exportInvoicePDFAsync, resolveTemplateForInvoice } from '../../../lib/pdfExporter';
import { MakLoader } from '../../../components/MakLoader';
import { Download, Printer, Check, Copy } from 'lucide-react';

function InvoicePreviewContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const autoPrint = searchParams.get('print') === '1';

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [measuredHeight, setMeasuredHeight] = useState(1123);
  const [isCopied, setIsCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);

  // Measure actual height of the live document preview
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;

    const updateHeight = () => {
      if (el) {
        setMeasuredHeight(Math.max(el.offsetHeight, el.scrollHeight, 1123));
      }
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);

    return () => observer.disconnect();
  }, [invoice]);

  // Responsive scaling to fit mobile / tablet screens cleanly
  useEffect(() => {
    const handleResize = () => {
      const padding = window.innerWidth < 640 ? 16 : 48;
      const maxAvailableWidth = window.innerWidth - padding;
      const scale = Math.min(1, maxAvailableWidth / 794);
      setPreviewScale(scale > 0 ? scale : 1);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch invoice & profile
  useEffect(() => {
    if (!id) {
      setError('No document ID provided in the URL.');
      setLoading(false);
      return;
    }

    const findLocalInvoice = (targetId: string): Invoice | null => {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('invoice_maker_invoices')) {
            const raw = localStorage.getItem(key);
            if (raw) {
              try {
                const list = JSON.parse(raw);
                if (Array.isArray(list)) {
                  const match = list.find((inv: any) => inv && (inv.id === targetId || inv.invoiceNumber === targetId));
                  if (match) {
                    const cloned = { ...match };
                    if (cloned.selectedTemplateStyle && cloned.selectedTemplateStyle.startsWith('{')) {
                      try {
                        const embedded = JSON.parse(cloned.selectedTemplateStyle);
                        cloned.embeddedTemplate = embedded;
                        for (const k of Object.keys(embedded)) {
                          if (cloned[k] === undefined) {
                            cloned[k] = embedded[k];
                          }
                        }
                      } catch (e) {}
                    }
                    return cloned;
                  }
                }
              } catch (e) {}
            }
          }
        }
      } catch (e) {}
      return null;
    };

    const findLocalProfile = (): BusinessProfile | null => {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('invoice_maker_biz_profile')) {
            const rawProf = localStorage.getItem(key);
            if (rawProf) {
              try {
                const parsed = JSON.parse(rawProf);
                if (parsed) return parsed;
              } catch (e) {}
            }
          }
        }
      } catch (e) {}
      return null;
    };

    const fetchInvoice = async () => {
      const localMatch = findLocalInvoice(id);
      const localProf = findLocalProfile();

      try {
        const res = await fetch(`/api/invoice/preview?id=${encodeURIComponent(id)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.invoice) {
            const cloudInv = data.invoice;
            const mergedInvoice = {
              ...(localMatch ? { ...cloudInv, ...localMatch } : cloudInv),
              // Enforce strictly Original for Recipient copy
              selectedCopies: { customer: true, transport: false, supplier: false, challan: false }
            } as Invoice;
            const mergedProfile = data.profile || localProf || ({} as BusinessProfile);
            setInvoice(mergedInvoice);
            setProfile(mergedProfile);
            setError(null);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Cloud preview fetch error:', err);
      }

      if (localMatch) {
        setInvoice({
          ...localMatch,
          // Enforce strictly Original for Recipient copy
          selectedCopies: { customer: true, transport: false, supplier: false, challan: false }
        } as Invoice);
        setProfile(localProf || ({} as BusinessProfile));
        setError(null);
        setLoading(false);
        return;
      }

      setError('The requested document could not be found.');
      setLoading(false);
    };

    fetchInvoice();

    const handleStorageEvent = () => {
      const updatedMatch = findLocalInvoice(id);
      if (updatedMatch) {
        setInvoice({
          ...updatedMatch,
          selectedCopies: { customer: true, transport: false, supplier: false, challan: false }
        } as unknown as Invoice);
      }
    };

    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('invoice_updated', handleStorageEvent);

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('invoice_updated', handleStorageEvent);
    };
  }, [id]);

  // Handle automatic print trigger
  useEffect(() => {
    if (autoPrint && invoice && !loading && profile) {
      const recipientOnlyInvoice = {
        ...invoice,
        selectedCopies: { customer: true, transport: false, supplier: false, challan: false }
      } as unknown as Invoice;

      const triggerPrint = async () => {
        try {
          const pdfBlob = await exportInvoicePDFAsync(recipientOnlyInvoice, (profile ?? {}) as BusinessProfile, 'blob');
          if (pdfBlob instanceof Blob) {
            const blobUrl = URL.createObjectURL(pdfBlob);
            const existingFrame = document.getElementById('invoice-print-iframe');
            if (existingFrame) existingFrame.remove();

            const iframe = document.createElement('iframe');
            iframe.id = 'invoice-print-iframe';
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            iframe.src = blobUrl;

            iframe.onload = () => {
              setTimeout(() => {
                try {
                  iframe.contentWindow?.focus();
                  iframe.contentWindow?.print();
                } catch (e) {
                  window.open(blobUrl, '_blank');
                }
              }, 300);
            };

            document.body.appendChild(iframe);
          }
        } catch (e) {
          console.error('Auto print failed:', e);
        }
      };

      const timer = setTimeout(triggerPrint, 300);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, invoice, loading, profile]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadPDF = async () => {
    if (!invoice || isExporting) return;
    setIsExporting(true);
    try {
      const recipientOnlyInvoice = {
        ...invoice,
        selectedCopies: { customer: true, transport: false, supplier: false, challan: false }
      } as unknown as Invoice;
      await exportInvoicePDFAsync(recipientOnlyInvoice, (profile ?? {}) as BusinessProfile, 'save');
    } catch (err: any) {
      alert('Failed to download PDF: ' + (err.message || err.toString()));
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintDocument = async () => {
    if (!invoice || isExporting) return;
    setIsExporting(true);
    try {
      const recipientOnlyInvoice = {
        ...invoice,
        selectedCopies: { customer: true, transport: false, supplier: false, challan: false }
      } as unknown as Invoice;
      const pdfBlob = await exportInvoicePDFAsync(recipientOnlyInvoice, (profile ?? {}) as BusinessProfile, 'blob');
      if (pdfBlob instanceof Blob) {
        const blobUrl = URL.createObjectURL(pdfBlob);
        const existingFrame = document.getElementById('invoice-print-iframe');
        if (existingFrame) existingFrame.remove();

        const iframe = document.createElement('iframe');
        iframe.id = 'invoice-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.src = blobUrl;

        iframe.onload = () => {
          setTimeout(() => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch (e) {
              window.open(blobUrl, '_blank');
            }
          }, 300);
        };

        document.body.appendChild(iframe);
      }
    } catch (err: any) {
      alert('Failed to print document: ' + (err.message || err.toString()));
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return <MakLoader variant="full-screen" label="Loading Document Preview..." />;
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] dark:bg-[#070d1e] p-6 text-center">
        <div className="max-w-md bg-white dark:bg-[#0b1329] border border-[#bae6fd]/60 dark:border-[#223269]/60 p-8 rounded-3xl shadow-xl space-y-4">
          <h2 className="text-base font-black text-rose-600 uppercase tracking-wide">Document Not Available</h2>
          <p className="text-xs text-[#64748b] dark:text-zinc-400">{error || 'The requested document could not be found.'}</p>
        </div>
      </div>
    );
  }

  // Derive currency symbol & active template
  const currencySymbol = profile?.currencySymbol || (profile?.currency === 'GBP' ? '£' : profile?.currency === 'EUR' ? '€' : profile?.currency === 'JPY' ? '¥' : profile?.currency === 'INR' ? '₹' : '$');
  const resolvedTemplate = resolveTemplateForInvoice(invoice);

  // Ensure only Original for Recipient copy is passed
  const recipientOnlyInvoice = {
    ...invoice,
    selectedCopies: { customer: true, transport: false, supplier: false, challan: false }
  } as unknown as Invoice;

  return (
    <div className="min-h-screen bg-[#f1f5f9] dark:bg-[#070d1e] py-6 sm:py-10 px-3 sm:px-6 flex flex-col items-center">
      {/* Top Header Control Bar */}
      <div className="w-full max-w-[840px] flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 bg-white dark:bg-[#0b1329] p-4 border border-[#bae6fd]/80 dark:border-[#223269] rounded-2xl shadow-sm">
        <div className="text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h1 className="text-xs font-black uppercase tracking-wider text-[#0f172a] dark:text-white">
              Document Preview Portal
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
              Original for Recipient
            </span>
          </div>
          <p className="text-[11px] font-mono text-[#64748b] dark:text-zinc-400 mt-0.5">
            {invoice.invoiceType ? invoice.invoiceType.toUpperCase() : 'DOCUMENT'} #{invoice.invoiceNumber}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-center">
          {/* Copy Share Link */}
          <button
            onClick={handleCopyLink}
            title="Copy Preview Link"
            className="px-3.5 py-2 bg-slate-50 dark:bg-[#111a36] hover:bg-slate-100 dark:hover:bg-[#1b264f] text-[#0f172a] dark:text-zinc-200 rounded-xl text-xs font-bold border border-slate-200 dark:border-[#223269] transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-[#64748b]" />}
            <span>{isCopied ? 'Copied' : 'Copy Link'}</span>
          </button>

          {/* Download PDF */}
          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>

          {/* Print Document */}
          <button
            onClick={handlePrintDocument}
            disabled={isExporting}
            className="px-4 py-2 bg-gradient-to-r from-[#0284c7] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8] text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Live Document Preview Card Container */}
      <div className="w-full max-w-[840px] bg-white/40 dark:bg-[#0b1329]/40 p-2 sm:p-6 rounded-3xl border border-[#bae6fd]/40 dark:border-[#223269]/40 flex justify-center shadow-inner overflow-hidden">
        <div
          style={{
            width: `${794 * previewScale}px`,
            height: `${measuredHeight * previewScale}px`,
            transition: 'all 0.15s ease'
          }}
          className="relative shrink-0"
        >
          <div
            ref={previewRef}
            className="origin-top-left absolute top-0 left-0 bg-white shadow-2xl rounded-sm border border-slate-200/80"
            style={{
              width: '794px',
              height: 'auto',
              transform: `scale(${previewScale})`,
              transition: 'transform 0.15s ease'
            }}
          >
            <LivePreview
              template={resolvedTemplate}
              invoiceData={recipientOnlyInvoice}
              businessProfile={(profile ?? {}) as Partial<BusinessProfile>}
              currencySymbol={currencySymbol}
              isInteractive={false}
              forceFullHeight={true}
              clients={[]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvoicePreviewPage() {
  return (
    <Suspense fallback={<MakLoader variant="full-screen" label="Loading Document Preview..." />}>
      <InvoicePreviewContent />
    </Suspense>
  );
}
