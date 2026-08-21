"use client";
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LivePreview } from '../../../components/TemplateBuilder/LivePreview';
import { Invoice, BusinessProfile } from '../../../types';
import { Loader2 } from 'lucide-react';
import { exportInvoicePDFAsync, resolveTemplateForInvoice } from '../../../lib/pdfExporter';
import { MakLoader } from '../../../components/MakLoader';

function InvoicePreviewContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const autoPrint = searchParams.get('print') === '1';
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const previewRef = React.useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState(1123);
  const [printPageChunks, setPrintPageChunks] = useState<any[][] | null>(null);

  useEffect(() => {
    const element = previewRef.current;
    if (!element) return;
    setMeasuredHeight(element.scrollHeight || 1123);

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setMeasuredHeight(entry.target.scrollHeight || 1123);
      }
    });

    resizeObserver.observe(element);
    return () => {
      resizeObserver.disconnect();
    };
  }, [invoice]);

  useEffect(() => {
    if (!invoice || !profile || !previewRef.current || printPageChunks !== null) return;

    const calculatePreviewChunks = async () => {
      await new Promise(r => setTimeout(r, 50));
      const container = previewRef.current;
      if (!container) return;

      try {
        const activeTemplate = resolveTemplateForInvoice(invoice);
        const pageHeight = activeTemplate.layout.pageSize === 'A4' ? 1123 : 1056;

        const footerEl = container.querySelector('#pinned-footer-container') as HTMLElement;
        const footerHeight = footerEl && footerEl.offsetHeight > 50 ? footerEl.offsetHeight : 240;

        const tableEl = container.querySelector('table') as HTMLElement;
        let tableTop = tableEl ? tableEl.getBoundingClientRect().top - container.getBoundingClientRect().top : 450;
        if (tableTop < 100) {
           tableTop = 450;
        }

        const theadEl = container.querySelector('thead') as HTMLElement;
        const tableHeaderHeight = theadEl && theadEl.offsetHeight > 10 ? theadEl.offsetHeight : 35;

        const rows = Array.from(container.querySelectorAll('tbody tr')) as HTMLElement[];
        const rowHeights = rows.map(r => r.offsetHeight > 20 ? r.offsetHeight : 55);

        let totalsHeight = 0;
        const totalsEls = Array.from(container.querySelectorAll('#section-taxEngine, #section-payment, #section-amountInWords')) as HTMLElement[];
        if (totalsEls.length > 0) {
          let minTop = Infinity;
          let maxBottom = 0;
          totalsEls.forEach(el => {
            const rect = el.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const top = rect.top - containerRect.top;
            const bottom = rect.bottom - containerRect.top;
            if (top < minTop) minTop = top;
            if (bottom > maxBottom) maxBottom = bottom;
          });
          if (maxBottom > minTop && (maxBottom - minTop) > 50) {
            totalsHeight = maxBottom - minTop;
          }
        }

        const items = invoice.items || [];
        const N = items.length;
        const chunks: any[][] = [];
        const availablePageHeight = pageHeight - footerHeight - 20;
        const page1Budget = availablePageHeight - tableTop - tableHeaderHeight;
        const subsequentPageBudget = page1Budget;

        const totalRowsHeight = rowHeights.reduce((a, b) => a + b, 0);
        const singlePageBudget = page1Budget - totalsHeight;

        if (totalRowsHeight <= singlePageBudget || N === 0) {
          chunks.push(items);
        } else {
          let currentHeight = 0;
          let idx = 0;
          const p1Items: any[] = [];
          while (idx < N) {
            const isLastItem = (idx === N - 1);
            const requiredBudget = isLastItem ? rowHeights[idx] + totalsHeight : rowHeights[idx];
            if (currentHeight + requiredBudget <= page1Budget) {
              currentHeight += rowHeights[idx];
              p1Items.push(items[idx]);
              idx++;
            } else {
              break;
            }
          }
          if (p1Items.length === 0 && N > 0) {
            currentHeight += rowHeights[0];
            p1Items.push(items[0]);
            idx++;
          }
          chunks.push(p1Items);

          while (idx < N) {
            const pageItems: any[] = [];
            let curHeight = 0;
            let remainingRowsHeight = 0;
            for (let r = idx; r < N; r++) {
              remainingRowsHeight += rowHeights[r];
            }
            if (remainingRowsHeight + totalsHeight <= subsequentPageBudget) {
              chunks.push(items.slice(idx));
              break;
            }

            while (idx < N) {
              const isLastItem = (idx === N - 1);
              const requiredBudget = isLastItem ? rowHeights[idx] + totalsHeight : rowHeights[idx];
              if (curHeight + requiredBudget <= subsequentPageBudget) {
                curHeight += rowHeights[idx];
                pageItems.push(items[idx]);
                idx++;
              } else {
                break;
              }
            }
            if (pageItems.length === 0 && N > 0) {
              curHeight += rowHeights[idx];
              pageItems.push(items[idx]);
              idx++;
            }
            chunks.push(pageItems);
          }
        }

        setPrintPageChunks(chunks);
      } catch (err) {
        console.error('Failed to calculate preview chunks:', err);
      }
    };

    calculatePreviewChunks();
  }, [invoice, profile, printPageChunks]);

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
                  const match = list.find((inv: any) => inv && inv.id === targetId);
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
      setPrintPageChunks(null);
      const localMatch = findLocalInvoice(id);
      const localProf = findLocalProfile();

      try {
        const res = await fetch(`/api/invoice/preview?id=${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.invoice) {
            const cloudInv = data.invoice;
            // Merge local edits over cloud invoice so unsynced or fresh edits render immediately
            const mergedInvoice = {
              ...(localMatch ? { ...cloudInv, ...localMatch } : cloudInv),
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
      } catch (err: any) {
        console.warn('Cloud preview fetch error:', err);
      }

      // If cloud fetch failed or invoice not found in cloud, fall back to local storage match
      if (localMatch) {
        setInvoice({
          ...localMatch,
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

    // Listen for realtime updates from other tabs or local storage writes
    const handleStorageOrCustomEvent = (e: any) => {
      const updatedMatch = findLocalInvoice(id);
      if (updatedMatch) {
        setInvoice(updatedMatch);
      }
    };

    window.addEventListener('storage', handleStorageOrCustomEvent);
    window.addEventListener('invoice_updated', handleStorageOrCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageOrCustomEvent);
      window.removeEventListener('invoice_updated', handleStorageOrCustomEvent);
    };
  }, [id]);

  const logoBase64Ref = React.useRef<string | null>(null);
  const signatureBase64Ref = React.useRef<string | null>(null);

  useEffect(() => {
    const imageToBase64 = async (url: string): Promise<string> => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        return url;
      }
    };

    if (profile?.logoUrl || (profile as any)?.companyLogo) {
      imageToBase64(profile?.logoUrl || (profile as any)?.companyLogo).then(b64 => { logoBase64Ref.current = b64; });
    }
    if ((profile as any)?.signatureUrl || profile?.signature) {
      imageToBase64((profile as any)?.signatureUrl || profile?.signature || '').then(b64 => { signatureBase64Ref.current = b64; });
    }
  }, [profile]);

  // Auto-trigger print dialog when ?print=1 is in the URL
  useEffect(() => {
    if (autoPrint && invoice && !loading && profile) {
      const triggerPrint = () => {
        window.print();
      };
      const timer = setTimeout(triggerPrint, 300);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, invoice, loading, profile]);

  if (loading) {
    return <MakLoader variant="full-screen" label="Preparing Document Preview..." />;
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
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pt-8 pb-10 px-4 flex flex-col items-center">
      {/* Top Banner */}
      <div className="w-full max-w-[794px] flex items-center justify-between mb-6 bg-white dark:bg-zinc-900 p-4 border border-slate-205 dark:border-zinc-800 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-xs font-black uppercase tracking-wider text-slate-805 dark:text-white">Document Preview Portal</h1>
          <p className="text-[10px] text-slate-400 mt-0.5">{invoice.invoiceType?.toUpperCase() ?? ''} #{invoice.invoiceNumber}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={async () => {
              try {
                const { pdf } = await import('@react-pdf/renderer');
                const { getPDFTemplate } = await import('../../../components/PDFTemplates');
                const PDFTemplate = getPDFTemplate(invoice.selectedTemplateStyle || (invoice.embeddedTemplate?.style));
                
                const blob = await pdf(
                  <PDFTemplate 
                    invoice={invoice}
                    profile={(profile ?? {}) as BusinessProfile}
                    logo={logoBase64Ref.current}
                    signature={signatureBase64Ref.current}
                  />
                ).toBlob();
                
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `invoice-${invoice.invoiceNumber}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              } catch (err: any) {
                alert('Failed to export PDF: ' + (err.message || err.toString()));
              }
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
          >
            Download PDF
          </button>
          <button
            onClick={() => {
              try {
                const styleId = 'preview-print-style';
                let styleEl = document.getElementById(styleId);
                if (!styleEl) {
                  styleEl = document.createElement('style');
                  styleEl.id = styleId;
                  styleEl.innerHTML = `
                    @media print {
                      body > *:not(.invoice-print-sheet) { display: none !important; }
                      .invoice-print-sheet { display: block !important; position: static !important; transform: none !important; }
                      @page { size: A4; margin: 10mm; }
                      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                  `;
                  document.head.appendChild(styleEl);
                }
                window.onafterprint = () => {
                  const injected = document.getElementById(styleId);
                  if (injected) injected.remove();
                };
                window.print();
              } catch (err: any) {
                alert('Failed to print: ' + (err.message || err.toString()));
              }
            }}
            className="px-4 py-2 bg-slate-805 hover:bg-slate-750 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
          >
            Print Document
          </button>
        </div>
      </div>

      {/* Styled Printable Preview Container */}
      {(() => {
        const previewHeight = measuredHeight;
        return (
          <div 
            className="relative"
            style={{ 
              width: 794 * previewScale, 
              height: previewHeight * previewScale,
              transition: 'all 0.2s ease'
            }}
          >
            <style dangerouslySetInnerHTML={{ __html: `
              .invoice-print-sheet .invoice-pdf-page {
                border: 1px solid #e2e8f0 !important;
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
                border-radius: 8px !important;
              }
            `}} />
            <div
              ref={previewRef}
              className="invoice-print-sheet absolute top-0 left-0 origin-top-left"
              style={{
                width: '794px',
                height: 'auto',
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left',
                transition: 'transform 0.2s ease',
              }}
            >
              <LivePreview
                template={resolveTemplateForInvoice(invoice)}
                invoiceData={invoice}
                businessProfile={(profile ?? {}) as Partial<BusinessProfile>}
                currencySymbol={currencySymbol}
                isInteractive={false}
                isPrintMode={true}
                printPageChunks={printPageChunks || undefined}
                clients={[]}
              />
            </div>
          </div>
        );
      })()}
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
    <Suspense fallback={<MakLoader variant="full-screen" label="Loading portal..." />}>
      <InvoicePreviewContent />
    </Suspense>
  );
}
