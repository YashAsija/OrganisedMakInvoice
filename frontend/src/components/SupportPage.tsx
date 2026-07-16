import React, { useState } from 'react';
import {
  MessageCircle, Mail, Phone, FileText, ChevronRight, ChevronDown,
  ExternalLink, Search, Zap, BookOpen, AlertCircle, CheckCircle2,
  Star, ThumbsUp, Send, HelpCircle, Shield, Video, ArrowRight
} from 'lucide-react';
import { emitNotification } from '../lib/notifications';

type TicketCategory = 'billing' | 'technical' | 'account' | 'feature' | 'other';

const faqs = [
  {
    q: 'How do I create and send my first invoice?',
    a: 'Navigate to the Invoices tab from the sidebar, click "New Invoice", fill in the client details and line items, then use the "Download PDF" or "Print" option to share with your client. All invoices are automatically saved locally and synced to cloud if logged in.'
  },
  {
    q: 'Can I customise the invoice template and design?',
    a: 'Yes! Go to Invoice Templates in the sidebar. You can choose from multiple pre-built layouts (Modern, Classic, Minimal, Bold) and customise colors, fonts, logo, and footer text directly from the Template Builder.'
  },
  {
    q: 'How does cloud sync work and is my data secure?',
    a: 'When you sign in, your invoices and settings are encrypted and stored on Supabase (PostgreSQL). Data is synced in real-time with row-level security (RLS) policies — meaning only you can access your data.'
  },
  {
    q: 'How do I add GST/tax to invoices?',
    a: 'You can set a default tax rate in your company profile (Settings → Company Info → Default Tax Rate). Alternatively, per-line item tax rates can be set when creating invoices using HSN codes from the HSN Registry.'
  },
  {
    q: 'Can I export my data in bulk?',
    a: 'Yes. Go to the Reports tab and use the Export button to download all invoices as an Excel spreadsheet (.xlsx). You can also export individual invoices as PDF from the invoice list.'
  },
  {
    q: 'What happens to my data if I sign out?',
    a: 'All data remains safely stored in the cloud. Signing out only ends your local session — your invoices, clients, and company profile remain accessible when you sign back in.'
  },
  {
    q: 'How do I enable PIN lock for security?',
    a: 'Go to Settings → Security → PIN Passcode Lock and click Enable. You will be prompted to set a 4-digit PIN. The PIN is required each time the app is opened or refreshed.'
  },
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [ticketCategory, setTicketCategory] = useState<TicketCategory>('technical');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketBody, setTicketBody] = useState('');
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRating, setActiveRating] = useState<number | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const filteredFaqs = faqs.filter(faq =>
    searchQuery.length < 2 ||
    faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketBody.trim()) return;
    setTicketSubmitted(true);
    emitNotification('Support Ticket Submitted', `Your ticket "${ticketSubject}" has been received. Our team will contact you shortly.`, 'success');
    setTimeout(() => {
      setTicketSubmitted(false);
      setTicketSubject('');
      setTicketBody('');
    }, 4000);
  };

  const categories: { id: TicketCategory; label: string }[] = [
    { id: 'billing', label: 'Billing & Payments' },
    { id: 'technical', label: 'Technical Issue' },
    { id: 'account', label: 'Account & Access' },
    { id: 'feature', label: 'Feature Request' },
    { id: 'other', label: 'Other' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200 w-full">
      {/* Page header */}
      <div>
        <h1 className="text-base font-black text-[#0f172a] dark:text-white uppercase tracking-tight">Help & Support</h1>
        <p className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 mt-0.5">Find answers, contact our team, or submit a support ticket</p>
      </div>

      {/* Quick channels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: <Mail className="w-5 h-5" />, label: 'Email Support', value: 'support@makinvoices.com', sub: 'Response within 24h', color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-950/30' },
          { icon: <MessageCircle className="w-5 h-5" />, label: 'Live Chat', value: 'Available 9am–6pm IST', sub: 'Mon–Fri on web app', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
          { icon: <FileText className="w-5 h-5" />, label: 'Documentation', value: 'docs.makinvoices.com', sub: 'Full guides & API', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/30' },
        ].map(ch => (
          <div key={ch.label} className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl p-4 flex items-start gap-3 shadow-xs hover:border-[#64748b]/40 transition-colors cursor-pointer group">
            <div className={`w-9 h-9 rounded-xl ${ch.bg} flex items-center justify-center flex-shrink-0 ${ch.color}`}>
              {ch.icon}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black text-[#0f172a] dark:text-zinc-300 uppercase tracking-wider block">{ch.label}</span>
              <span className="text-[11px] font-bold text-[#0f172a] dark:text-white block mt-0.5 truncate">{ch.value}</span>
              <span className="text-[9.5px] text-[#64748b]/70 dark:text-zinc-500 block">{ch.sub}</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[#64748b]/40 group-hover:text-[#64748b] flex-shrink-0 ml-auto mt-1 transition-colors" />
          </div>
        ))}
      </div>

      {/* FAQ + Ticket in 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* FAQ */}
        <div className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#e2e8f0] via-[#C6A87D] to-[#64748b]" />
            <div className="p-5 pb-3">
              <h2 className="text-[10px] font-black text-[#0f172a] dark:text-white uppercase tracking-widest">Frequently Asked Questions</h2>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748b]/60" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search questions…"
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-[#e2e8f0] dark:border-zinc-700 bg-[#FCFAF7] dark:bg-zinc-950 text-[#0f172a] dark:text-white placeholder-[#64748b]/40 focus:outline-none focus:border-[#64748b]/50 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="px-5 pb-5 space-y-1.5 max-h-[480px] overflow-y-auto">
            {filteredFaqs.length === 0 ? (
              <div className="py-8 text-center text-[11px] text-[#64748b]/60 dark:text-zinc-500">
                <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No questions match your search
              </div>
            ) : filteredFaqs.map((faq, i) => (
              <div
                key={i}
                className={`border rounded-xl overflow-hidden transition-all ${
                  openFaq === i
                    ? 'border-[#64748b]/40 bg-[#FCFAF7] dark:bg-zinc-950'
                    : 'border-[#e2e8f0]/40 dark:border-zinc-800 hover:border-[#64748b]/30'
                }`}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left cursor-pointer"
                >
                  <span className="text-xs font-bold text-[#0f172a] dark:text-zinc-200 leading-snug">{faq.q}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#64748b] flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-3 text-[11px] text-[#64748b]/90 dark:text-zinc-400 leading-relaxed border-t border-[#e2e8f0]/30 dark:border-zinc-800 pt-2.5">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Support Ticket Form */}
        <div className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#e2e8f0] via-[#C6A87D] to-[#64748b]" />
            <div className="p-5 pb-3">
              <h2 className="text-[10px] font-black text-[#0f172a] dark:text-white uppercase tracking-widest">Submit a Support Ticket</h2>
              <p className="text-[10px] text-[#64748b]/70 dark:text-zinc-500 mt-0.5">Our team will respond within 1 business day</p>
            </div>
          </div>

          <div className="px-5 pb-5">
            {ticketSubmitted ? (
              <div className="py-10 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-black text-[#0f172a] dark:text-white">Ticket Submitted!</p>
                  <p className="text-[11px] text-[#64748b]/70 dark:text-zinc-500 mt-1">We&apos;ll reach back at your registered email shortly.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleTicketSubmit} className="space-y-3.5">
                {/* Category picker */}
                <div>
                  <label className="block text-[9.5px] font-extrabold uppercase tracking-widest text-[#64748b] mb-1.5">Issue Category</label>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setTicketCategory(cat.id)}
                        className={`px-2.5 py-1 rounded-lg text-[9.5px] font-bold transition-all cursor-pointer border ${
                          ticketCategory === cat.id
                            ? 'bg-[#0f172a] text-white border-[#0f172a]'
                            : 'bg-[#FCFAF7] dark:bg-zinc-950 border-[#e2e8f0]/60 dark:border-zinc-700 text-[#64748b] dark:text-zinc-400 hover:border-[#64748b]/50'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-[9.5px] font-extrabold uppercase tracking-widest text-[#64748b] mb-1.5">Subject *</label>
                  <input
                    type="text"
                    value={ticketSubject}
                    onChange={e => setTicketSubject(e.target.value)}
                    required
                    placeholder="Brief description of your issue"
                    className="w-full px-3.5 py-2.5 bg-[#FCFAF7] dark:bg-zinc-950 border border-[#e2e8f0]/60 dark:border-zinc-700 rounded-xl text-xs text-[#0f172a] dark:text-white placeholder-[#64748b]/40 focus:outline-none focus:border-[#64748b]/60 transition-colors"
                  />
                </div>

                {/* Body */}
                <div>
                  <label className="block text-[9.5px] font-extrabold uppercase tracking-widest text-[#64748b] mb-1.5">Detailed Description *</label>
                  <textarea
                    value={ticketBody}
                    onChange={e => setTicketBody(e.target.value)}
                    required
                    rows={5}
                    placeholder="Please describe the issue in detail. Include steps to reproduce, expected behavior, and what actually happened…"
                    className="w-full px-3.5 py-2.5 bg-[#FCFAF7] dark:bg-zinc-950 border border-[#e2e8f0]/60 dark:border-zinc-700 rounded-xl text-xs text-[#0f172a] dark:text-white placeholder-[#64748b]/40 focus:outline-none focus:border-[#64748b]/60 transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0f172a] hover:bg-[#5C5043] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit Ticket
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Feedback + resources footer row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Feedback */}
        <div className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <h3 className="text-[10px] font-black text-[#0f172a] dark:text-white uppercase tracking-widest mb-1">Rate Your Experience</h3>
          <p className="text-[10px] text-[#64748b]/70 dark:text-zinc-500 mb-3">How would you rate MakInvoices overall?</p>
          {feedbackSubmitted ? (
            <div className="flex items-center gap-2 text-emerald-500">
              <ThumbsUp className="w-4 h-4" />
              <span className="text-xs font-bold">Thank you for your feedback!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => { setActiveRating(star); setFeedbackSubmitted(true); }}
                  className={`transition-all cursor-pointer hover:scale-125 ${
                    activeRating !== null && star <= activeRating ? 'text-amber-400' : 'text-[#e2e8f0] dark:text-zinc-700 hover:text-amber-300'
                  }`}
                >
                  <Star className="w-6 h-6 fill-current" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Resources */}
        <div className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <h3 className="text-[10px] font-black text-[#0f172a] dark:text-white uppercase tracking-widest mb-3">Quick Resources</h3>
          <div className="space-y-2">
            {[
              { icon: <BookOpen className="w-3.5 h-3.5" />, label: 'Getting Started Guide', href: '#' },
              { icon: <Video className="w-3.5 h-3.5" />, label: 'Video Tutorials', href: '#' },
              { icon: <Shield className="w-3.5 h-3.5" />, label: 'Privacy & Security Policy', href: '#' },
              { icon: <FileText className="w-3.5 h-3.5" />, label: 'API Documentation', href: '#' },
            ].map(res => (
              <a
                key={res.label}
                href={res.href}
                className="flex items-center gap-2.5 text-xs font-bold text-[#0f172a] dark:text-zinc-300 hover:text-[#64748b] dark:hover:text-white transition-colors group"
              >
                <span className="text-[#64748b]">{res.icon}</span>
                {res.label}
                <ArrowRight className="w-3 h-3 ml-auto text-[#64748b]/40 group-hover:text-[#64748b] transition-colors" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
