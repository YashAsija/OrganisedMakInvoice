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
  const [language, setLanguage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load session or initialize
  useEffect(() => {
    const initChat = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || null;

        if (userId) {
          const res = await fetch(`/api/chat/history?userId=${userId}`);
          const data = await res.json();
          if (data.sessionId) {
            setSessionId(data.sessionId);
            setLanguage(data.language);
            setMessages(data.messages);
            setIsInitializing(false);
            return;
          }
        }
        setIsInitializing(false);
      } catch (err) {
        console.error("Failed to load chat history", err);
        setIsInitializing(false);
      }
    };
    initChat();
  }, []);

  const handleStartSession = async (lang: string) => {
    setLanguage(lang);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch('/api/chat/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, language: lang })
      });
      const data = await res.json();
      if (data.sessionId) setSessionId(data.sessionId);
    } catch (err) {
      console.error("Error starting session", err);
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
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId, userId: user?.id, language })
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

  const handleEscalate = async () => {
    try {
      const transcript = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
      const subject = `Chat Escalation${userEmail ? ` – ${userEmail}` : ''}`;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: userEmail ? userEmail.split('@')[0] : 'Chat User',
          email: userEmail || 'user@example.com',
          category: 'technical',
          priority: 'high',
          subject,
          message: `This ticket was escalated from a live chat session.\n\n--- Chat Transcript ---\n\n${transcript}`,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.detail || 'Escalation failed');
      }
      onEscalate(subject, "Escalated from Live Chat. See ticket for full transcript.");
    } catch (err) {
      console.error("Escalation failed", err);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-96 w-full">
        <Loader2 className="w-8 h-8 animate-spin text-[#0284c7]" />
      </div>
    );
  }

  // --- Step 1: Language Selection ---
  if (!language) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200 w-full max-w-2xl mx-auto mt-4">
        <div>
          <button onClick={onBack} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#64748b] hover:text-[#0f172a] mb-4 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Support
          </button>
          <h1 className="text-base font-black text-[#0f172a] dark:text-white uppercase tracking-tight">Live Chat Support</h1>
          <p className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 mt-0.5">Please choose your preferred language to begin</p>
        </div>

        <div className="bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl shadow-xs p-6 space-y-4">
          <label className="block text-[9.5px] font-extrabold uppercase tracking-widest text-[#0284c7] dark:text-[#38bdf8]">Select Language</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LANGUAGES.map(lang => (
              <button
                key={lang.id}
                onClick={() => handleStartSession(lang.id)}
                className="py-3 px-4 rounded-xl text-xs font-bold border border-[#bae6fd]/50 dark:border-[#223269]/50 bg-[#f4f9ff] dark:bg-[#0b1329] text-[#0284c7] dark:text-[#38bdf8] hover:border-[#0284c7]/50 hover:bg-[#e0f2fe]/50 transition-all text-left flex justify-between items-center group cursor-pointer"
              >
                {lang.label}
                <ArrowLeft className="w-4 h-4 rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
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
            onClick={() => setLanguage(null)} 
            className="hidden sm:flex px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-[#f4f9ff] dark:bg-[#0b1329] border border-[#bae6fd]/50 dark:border-[#223269]/50 text-[#0284c7] dark:text-[#38bdf8] hover:border-[#0284c7]/40 cursor-pointer"
          >
            Change Language
          </button>
          <button 
            onClick={handleEscalate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-[#0284c7] text-white hover:bg-[#0369a1] transition-colors cursor-pointer"
          >
            <AlertTriangle className="w-3 h-3" /> <span className="hidden sm:inline">Talk to Human</span>
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
