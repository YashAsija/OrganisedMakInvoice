import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, MoreVertical, Loader2, Bot, User as UserIcon, AlertTriangle, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  features?: { name: string, route: string }[];
  created_at?: string;
}

const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'Hindi (हिंदी)' },
  { id: 'hi-en', label: 'Hinglish' },
  { id: 'es', label: 'Español' },
  { id: 'fr', label: 'Français' },
  { id: 'de', label: 'Deutsch' },
];

const SUGGESTED_FAQS: Record<string, string[]> = {
  'en': [
    "How do I create an invoice?",
    "How does cloud sync work?",
    "How do I add GST to invoices?",
    "Can I export my data in bulk?",
    "How do I enable PIN lock?"
  ],
  'hi': [
    "मैं चालान कैसे बनाऊं?",
    "क्लाउड सिंक कैसे काम करता है?",
    "चालान में GST कैसे जोड़ें?",
    "क्या मैं अपना डेटा निर्यात कर सकता हूँ?",
    "पिन लॉक कैसे सक्षम करें?"
  ],
  'hi-en': [
    "Invoice kaise banaye?",
    "Cloud sync kaise kaam karta hai?",
    "Invoice me GST kaise add karein?",
    "Data bulk me kaise export karein?",
    "PIN lock kaise enable karein?"
  ],
  'es': [
    "¿Cómo creo una factura?",
    "¿Cómo funciona la sincronización en la nube?",
    "¿Cómo agrego GST a las facturas?",
    "¿Puedo exportar mis datos en masa?",
    "¿Cómo habilito el bloqueo por PIN?"
  ],
  'fr': [
    "Comment créer une facture ?",
    "Comment fonctionne la synchronisation cloud ?",
    "Comment ajouter la TPS aux factures ?",
    "Puis-je exporter mes données en vrac ?",
    "Comment activer le verrouillage par code PIN ?"
  ],
  'de': [
    "Wie erstelle ich eine Rechnung?",
    "Wie funktioniert die Cloud-Synchronisation?",
    "Wie füge ich Rechnungen GST hinzu?",
    "Kann ich meine Daten massenhaft exportieren?",
    "Wie aktiviere ich die PIN-Sperre?"
  ]
};

const GREETINGS: Record<string, string> = {
  'en': "Hello! I'm MakInvoices AI. How can I help you today?",
  'hi': "नमस्ते! मैं MakInvoices AI हूँ। मैं आज आपकी कैसे मदद कर सकता हूँ?",
  'hi-en': "Hello! Main MakInvoices AI hoon. Aaj main aapki kaise madad kar sakta hoon?",
  'es': "¡Hola! Soy MakInvoices AI. ¿Cómo puedo ayudarte hoy?",
  'fr': "Bonjour ! Je suis MakInvoices AI. Comment puis-je vous aider aujourd'hui ?",
  'de': "Hallo! Ich bin MakInvoices AI. Wie kann ich Ihnen heute helfen?"
};

interface SupportChatPageProps {
  userEmail: string | null;
  onBack: () => void;
  onEscalate: (subject: string, description: string) => void;
}

export default function SupportChatPage({ userEmail, onBack, onEscalate }: SupportChatPageProps) {
  const [language, setLanguage] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mak_ai_chat_lang');
      if (saved && LANGUAGES.some(l => l.id === saved)) return saved;
    }
    return 'en';
  });
  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mak_ai_chat_session');
      if (saved) return saved;
      const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      try { localStorage.setItem('mak_ai_chat_session', newId); } catch (_) {}
      return newId;
    }
    return `session_${Date.now()}`;
  });
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('mak_ai_chat_messages');
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSelectingLanguage, setIsSelectingLanguage] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync to local storage whenever messages or language change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mak_ai_chat_messages', JSON.stringify(messages));
      } catch (_) {}
    }
  }, [messages]);

  useEffect(() => {
    if (typeof window !== 'undefined' && language) {
      try {
        localStorage.setItem('mak_ai_chat_lang', language);
      } catch (_) {}
    }
  }, [language]);

  // Load session or background sync history without blocking the UI
  useEffect(() => {
    let isMounted = true;
    const initChat = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || null;

        if (userId) {
          const res = await fetch(`/api/chat/history?userId=${userId}`);
          if (res.ok) {
            const data = await res.json();
            if (isMounted && data.sessionId) {
              setSessionId(data.sessionId);
              if (data.language && LANGUAGES.some(l => l.id === data.language)) {
                setLanguage(data.language);
              }
              if (Array.isArray(data.messages) && data.messages.length > 0) {
                setMessages(data.messages);
              }
            }
          }
        }
      } catch (err) {
        console.warn("Background chat sync skipped", err);
      }
    };
    initChat();
    return () => { isMounted = false; };
  }, []);

  const handleStartSession = async (lang: string) => {
    setLanguage(lang);
    setIsSelectingLanguage(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mak_ai_chat_lang', lang);
      } catch (_) {}
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      fetch('/api/chat/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session?.user?.id, language: lang })
      }).then(r => r.json()).then(data => {
        if (data.sessionId) {
          setSessionId(data.sessionId);
          try { localStorage.setItem('mak_ai_chat_session', data.sessionId); } catch (_) {}
        }
      }).catch(() => {});
    } catch (err) {
      console.warn("Error registering session language", err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent, textOverride?: string) => {
    if (e) e.preventDefault();
    const text = textOverride || input;
    if (!text.trim() || isLoading) return;

    setInput('');
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: text }]);
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId, userId: session?.user?.id, language })
      });
      const data = await res.json();
      
      if (data.reply) {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: data.reply, features: data.features }]);
      } else {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: "Sorry, I encountered an error." }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: "Sorry, I couldn't reach the server right now." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const [isEscalating, setIsEscalating] = useState(false);

  const handleEscalate = async () => {
    if (isEscalating) return;
    setIsEscalating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      const email = user?.email || userEmail || 'support-user@makinvoices.com';
      const name = user?.user_metadata?.full_name || email.split('@')[0] || 'User';
      
      const transcript = messages.length > 0
        ? messages.map(m => `${m.role === 'user' ? 'User' : 'MakInvoices AI'}: ${m.content}`).join('\n\n')
        : 'User requested direct escalation from Live Chat Support.';
      
      const subject = `Live Chat Escalation – ${name} (${email})`;
      
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          name,
          email,
          category: 'technical',
          priority: 'high',
          subject,
          message: `This ticket was escalated from a live chat session.\n\n--- Chat Transcript ---\n\n${transcript}`,
          user_id: user?.id || null
        }),
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        let errorMsg = 'Escalation failed';
        if (typeof errData?.detail === 'string') {
          errorMsg = errData.detail;
        } else if (Array.isArray(errData?.detail)) {
          errorMsg = errData.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
        }
        throw new Error(errorMsg);
      }
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mak_notification', {
          detail: {
            title: 'Escalated to Human Support 🎧',
            message: 'Your live chat transcript has been forwarded to our support team as a high-priority ticket.',
            type: 'success'
          }
        }));
      }
      
      onEscalate(subject, "Escalated from Live Chat. See ticket for full transcript.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Escalation failed';
      console.warn("Escalation failed:", msg);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mak_notification', {
          detail: {
            title: 'Escalation Notice',
            message: msg,
            type: 'error'
          }
        }));
      }
    } finally {
      setIsEscalating(false);
    }
  };

  // --- Optional Language Modal / View ---
  if (isSelectingLanguage) {
    return (
      <div className="animate-in fade-in duration-150 w-full max-w-2xl mx-auto mt-4">
        <div>
          <button onClick={() => setIsSelectingLanguage(false)} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#64748b] hover:text-[#0f172a] mb-4 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Chat
          </button>
          <h1 className="text-base font-black text-[#0f172a] dark:text-white uppercase tracking-tight">Select Chat Language</h1>
          <p className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 mt-0.5">Choose your preferred language for MakInvoices AI assistance</p>
        </div>

        <div className="bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl shadow-xs p-6 space-y-4 mt-3">
          <label className="block text-[9.5px] font-extrabold uppercase tracking-widest text-[#0284c7] dark:text-[#38bdf8]">Select Language</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LANGUAGES.map(lang => (
              <button
                key={lang.id}
                onClick={() => handleStartSession(lang.id)}
                className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all text-left flex justify-between items-center group cursor-pointer ${
                  language === lang.id
                    ? 'border-[#0284c7] bg-[#0284c7] text-white shadow-sm'
                    : 'border-[#bae6fd]/50 dark:border-[#223269]/50 bg-[#f4f9ff] dark:bg-[#0b1329] text-[#0284c7] dark:text-[#38bdf8] hover:border-[#0284c7]/50 hover:bg-[#e0f2fe]/50'
                }`}
              >
                {lang.label}
                <ArrowLeft className={`w-4 h-4 rotate-180 transition-opacity ${language === lang.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Step 2: Chat Interface ---
  const isFirstAssistantMsg = messages.filter(m => m.role === 'assistant').length === 0;

  return (
    <div className="animate-in fade-in duration-200 w-full max-w-3xl mx-auto h-[calc(100vh-140px)] flex flex-col bg-[#f4f9ff] dark:bg-[#0b1329] rounded-2xl border border-[#bae6fd]/60 dark:border-[#223269]/60 shadow-sm overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-white dark:bg-[#111a36] border-b border-[#bae6fd]/30 dark:border-[#223269]/30 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-[#64748b] hover:text-[#0f172a] transition-colors p-1 -ml-1 rounded-lg hover:bg-[#e0f2fe] dark:hover:bg-[#1b264f] cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-[#e0f2fe] dark:bg-[#1b264f] flex items-center justify-center text-[#0284c7] dark:text-[#38bdf8]">
              <Bot className="w-5 h-5" />
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900" />
          </div>
          <div>
            <h2 className="text-xs font-black text-[#0f172a] dark:text-white uppercase tracking-wider">MakInvoices AI</h2>
            <p className="text-[10px] text-[#64748b] dark:text-zinc-500 flex items-center gap-1.5">
              Online • {LANGUAGES.find(l => l.id === language)?.label}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSelectingLanguage(true)} 
            className="hidden sm:flex px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd]/50 dark:border-[#223269]/50 text-[#0284c7] dark:text-[#38bdf8] hover:border-[#0284c7]/40 cursor-pointer"
          >
            Change Language
          </button>
          <button 
            onClick={handleEscalate}
            disabled={isEscalating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-[#0284c7] text-white hover:bg-[#0369a1] disabled:opacity-60 transition-colors cursor-pointer"
          >
            {isEscalating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <AlertTriangle className="w-3 h-3" />
            )}
            <span className="hidden sm:inline">{isEscalating ? 'Escalating...' : 'Talk to Human'}</span>
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {messages.length === 0 && (
          <div className="space-y-6">
            <div className="flex justify-start">
              <div className="flex gap-2.5 max-w-[85%] sm:max-w-[75%]">
                <div className="w-6 h-6 rounded-full bg-[#e0f2fe] dark:bg-[#1b264f] flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-3.5 h-3.5 text-[#0284c7] dark:text-[#38bdf8]" />
                </div>
                <div className="p-3.5 rounded-2xl text-xs leading-relaxed bg-white dark:bg-[#111a36] border border-[#bae6fd]/40 dark:border-[#223269]/40 text-[#0f172a] dark:text-zinc-200 rounded-tl-sm shadow-xs">
                  {GREETINGS[language || 'en']}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {(SUGGESTED_FAQS[language || 'en']).map((faq, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(undefined, faq)}
                  className="px-3 py-1.5 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd]/50 dark:border-[#223269]/50 text-[#0284c7] dark:text-[#38bdf8] hover:text-[#0f172a] dark:hover:text-white hover:border-[#0284c7]/50 rounded-full text-[10px] font-bold cursor-pointer transition-colors text-left"
                >
                  {faq}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id || i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-2.5 max-w-[85%] sm:max-w-[75%] ${isUser ? 'flex-row-reverse' : ''}`}>
                {!isUser && (
                  <div className="w-6 h-6 rounded-full bg-[#e0f2fe] dark:bg-[#1b264f] flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5 text-[#0284c7] dark:text-[#38bdf8]" />
                  </div>
                )}
                
                <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                  isUser 
                    ? 'bg-[#0284c7] text-white rounded-tr-sm' 
                    : 'bg-white dark:bg-[#111a36] border border-[#bae6fd]/40 dark:border-[#223269]/40 text-[#0f172a] dark:text-zinc-200 rounded-tl-sm shadow-xs'
                }`}>
                  <ReactMarkdown 
                    components={{
                      a: ({node, ...props}) => <a {...props} className="text-[#0284c7] dark:text-[#38bdf8] hover:underline" target="_blank" rel="noreferrer" />,
                      ul: ({node, ...props}) => <ul {...props} className="list-disc pl-4 my-2 space-y-1" />,
                      ol: ({node, ...props}) => <ol {...props} className="list-decimal pl-4 my-2 space-y-1" />,
                      strong: ({node, ...props}) => <strong {...props} className="font-black" />,
                      p: ({node, ...props}) => <p {...props} className="mb-2 last:mb-0" />
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                  
                  {msg.features && msg.features.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {msg.features.map((feature, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            window.history.pushState(null, '', feature.route);
                            window.dispatchEvent(new Event('popstate'));
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-[#0284c7] text-white hover:bg-[#0369a1] transition-colors cursor-pointer w-fit"
                        >
                          {feature.name} <ArrowRight className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-2.5 max-w-[85%]">
              <div className="w-6 h-6 rounded-full bg-[#e0f2fe] dark:bg-[#1b264f] flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-3.5 h-3.5 text-[#0284c7] dark:text-[#38bdf8]" />
              </div>
              <div className="p-3.5 rounded-2xl rounded-tl-sm bg-white dark:bg-[#111a36] border border-[#bae6fd]/40 dark:border-[#223269]/40 shadow-xs flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-[#0284c7] dark:bg-[#38bdf8] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-[#0284c7] dark:bg-[#38bdf8] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-[#0284c7] dark:bg-[#38bdf8] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {isFirstAssistantMsg && messages.length > 0 && !isLoading && (
          <div className="flex flex-wrap gap-2 mt-4 ml-8">
            {(SUGGESTED_FAQS[language || 'en'] || []).map(faq => (
              <button
                key={faq}
                onClick={() => handleSend(undefined, faq)}
                className="px-3 py-1.5 rounded-full bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd]/50 dark:border-[#223269]/50 text-[10px] font-bold text-[#0284c7] dark:text-[#38bdf8] hover:bg-[#e0f2fe] dark:hover:bg-[#1b264f] hover:text-[#0f172a] dark:hover:text-white hover:border-[#0284c7]/40 transition-colors cursor-pointer"
              >
                {faq}
              </button>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white dark:bg-[#111a36] border-t border-[#bae6fd]/30 dark:border-[#223269]/30 shrink-0">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Type your message here..."
            className="w-full pl-4 pr-12 py-3 bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd]/50 dark:border-[#223269]/50 rounded-xl text-xs text-[#0f172a] dark:text-white placeholder-[#0284c7]/30 focus:outline-none focus:border-[#0284c7] dark:focus:border-[#38bdf8] focus:ring-2 focus:ring-[#0284c7]/15 transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 w-8 h-8 rounded-lg bg-[#0284c7] text-white flex items-center justify-center hover:bg-[#0369a1] disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </form>
      </div>
      
    </div>
  );
}
