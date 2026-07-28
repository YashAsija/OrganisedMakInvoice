"use client";
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LivePreview } from '../../../components/TemplateBuilder/LivePreview';
import { Invoice, BusinessProfile } from '../../../types';
import { Loader2 } from 'lucide-react';
import { exportInvoicePDFAsync } from '../../../lib/pdfExporter';

function InvoicePreviewContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewScale, setPreviewScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const padding = window.innerWidth < 768 ? 16 : 48;
      const containerWidth = Math.min(794, window.innerWidth - padding);
      setPreviewScale(containerWidth / 794);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!id) {
      setError('No invoice ID provided in the URL.');
      setLoading(false);
      return;
    }

    const fetchInvoice = async () => {
      try {
        const res = await fetch(`/api/invoice/preview?id=${id}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to load document preview.');
        }
        const data = await res.json();
        setInvoice(data.invoice);
        setProfile(data.profile);
      } catch (err: any) {
        setError(err.message || 'An error occurred while loading the preview.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 text-sky-650 animate-spin" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-3">Loading document preview...</span>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-zinc-950 p-6 text-center">
        <div className="max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-8 rounded-3xl shadow-sm space-y-4">
          <h2 className="text-base font-black text-rose-650 uppercase tracking-wide">Document Load Error</h2>
          <p className="text-xs text-slate-650 dark:text-zinc-400">{error || 'The requested document could not be found.'}</p>
        </div>
      </div>
    );
  }

  // Derive currency symbol
  const currencySymbol = profile?.currencySymbol || (profile?.currency === 'GBP' ? '£' : profile?.currency === 'EUR' ? '€' : profile?.currency === 'JPY' ? '¥' : profile?.currency === 'INR' ? '₹' : '$');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 py-8 px-4 flex flex-col items-center">
      {/* Top Banner */}
      <div className="w-full max-w-[794px] flex items-center justify-between mb-6 bg-white dark:bg-zinc-900 p-4 border border-slate-205 dark:border-zinc-800 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-xs font-black uppercase tracking-wider text-slate-805 dark:text-white">Document Preview Portal</h1>
          <p className="text-[10px] text-slate-400 mt-0.5">{invoice.invoiceType.toUpperCase()} #{invoice.invoiceNumber}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={async () => {
              try {
                await exportInvoicePDFAsync(invoice, profile || {}, 'save', invoice.embeddedTemplate || undefined);
              } catch (err: any) {
                alert('Failed to export PDF: ' + (err.message || err.toString()));
              }
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
          >
            Download PDF
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-805 hover:bg-slate-750 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
          >
            Print Document
          </button>
        </div>
      </div>

      {/* Styled Printable Preview Container */}
      <div 
        className="bg-white shadow-xl border border-slate-205 dark:border-zinc-800 relative rounded-none md:rounded-3xl overflow-hidden"
        style={{ 
          width: 794 * previewScale, 
          height: 1123 * previewScale,
          transition: 'all 0.2s ease'
        }}
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            width: '794px',
            minHeight: '1123px',
            transform: `scale(${previewScale})`,
            transformOrigin: 'top left',
            transition: 'transform 0.2s ease',
          }}
        >
          <LivePreview
            template={invoice.embeddedTemplate || getDefaultTemplatePreset()}
            invoiceData={invoice}
            businessProfile={profile || {}}
            currencySymbol={currencySymbol}
            isInteractive={false}
            clients={[]}
          />
        </div>
      </div>
    </div>
  );
}

// Helper: import default preset fallback (so we don't compile error if undefined)
function getDefaultTemplatePreset() {
  return {
    id: 'preset_modal_classic',
    name: 'Classic Standard',
    style: 'Modern',
    branding: {
      primaryColor: '#0f172a',
      secondaryColor: '#FCFAF7',
      fontFamily: 'Inter',
      showLogo: true,
      titleAlignment: 'Right',
    },
    sections: {
      company: { visible: true },
      billTo: { visible: true },
      shipTo: { visible: false },
      transport: { visible: false },
      payment: { visible: true },
      itemsTable: { visible: true },
      summary: { visible: true },
      qrCode: { visible: false },
      signature: { visible: true },
      terms: { visible: true },
      notes: { visible: true },
    },
    config: {
      invoiceInfo: { fields: ['invoiceNumber', 'invoiceDate', 'dueDate'] },
      company: { fields: ['name', 'address', 'phone', 'email'] },
      client: { fields: ['name', 'address', 'phone', 'email'] },
      shipping: { fields: ['name', 'address', 'phone', 'email'] },
      transport: { fields: ['transportName', 'vehicleNo'] },
      table: { columns: ['index', 'name', 'rate', 'quantity', 'amount'] },
    }
  } as any;
}

export default function InvoicePreviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 text-sky-655 animate-spin" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-3">Loading portal...</span>
      </div>
    }>
      <InvoicePreviewContent />
    </Suspense>
  );
}
