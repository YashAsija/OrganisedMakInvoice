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
  { id: 'es', label: 'Español' },
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
  'es': [
    "¿Cómo creo una factura?",
    "¿Cómo funciona la sincronización en la nube?",
    "¿Cómo agrego GST a las facturas?",
    "¿Puedo exportar mis datos en masa?",
    "¿Cómo habilito el bloqueo por PIN?"
  ]
};

const GREETINGS: Record<string, string> = {
  'en': "Hello! I'm your MakInvoices support assistant. How can I help you today?",
  'hi': "नमस्ते! मैं आपका MakInvoices सहायता सहायक हूँ। मैं आज आपकी कैसे मदद कर सकता हूँ?",
  'es': "¡Hola! Soy tu asistente de soporte de MakInvoices. ¿Cómo puedo ayudarte hoy?"
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
      await fetch('/api/chat/escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, sessionId, userEmail })
      });
      onEscalate("Escalated from Live Chat", "Please see the attached context.");
    } catch (err) {
      console.error("Escalation failed", err);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-96 w-full">
        <Loader2 className="w-8 h-8 animate-spin text-[#64748b]" />
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

        <div className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl shadow-xs p-6 space-y-4">
          <label className="block text-[9.5px] font-extrabold uppercase tracking-widest text-[#64748b]">Select Language</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LANGUAGES.map(lang => (
              <button
                key={lang.id}
                onClick={() => handleStartSession(lang.id)}
                className="py-3 px-4 rounded-xl text-xs font-bold border border-[#e2e8f0]/60 dark:border-zinc-700 bg-[#FCFAF7] dark:bg-zinc-950 text-[#64748b] dark:text-zinc-400 hover:border-[#64748b]/50 hover:bg-slate-50 transition-all text-left flex justify-between items-center group cursor-pointer"
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
    <div className="animate-in fade-in duration-200 w-full max-w-3xl mx-auto h-[calc(100vh-140px)] flex flex-col bg-[#F5F1EA] dark:bg-zinc-950 rounded-2xl border border-[#e2e8f0]/60 dark:border-zinc-800 shadow-sm overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-white dark:bg-zinc-900 border-b border-[#e2e8f0]/60 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-[#64748b] hover:text-[#0f172a] transition-colors p-1 -ml-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Bot className="w-5 h-5" />
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900" />
          </div>
          <div>
            <h2 className="text-xs font-black text-[#0f172a] dark:text-white uppercase tracking-wider">Support Assistant</h2>
            <p className="text-[10px] text-[#64748b] dark:text-zinc-500 flex items-center gap-1.5">
              Online • {LANGUAGES.find(l => l.id === language)?.label}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setLanguage(null)} 
            className="hidden sm:flex px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-[#FCFAF7] border border-[#e2e8f0]/60 text-[#64748b] hover:border-[#64748b]/40 cursor-pointer"
          >
            Change Language
          </button>
          <button 
            onClick={handleEscalate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-[#0f172a] text-white hover:bg-[#5C5043] transition-colors cursor-pointer"
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
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <div className="p-3.5 rounded-2xl text-xs leading-relaxed bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 text-[#0f172a] dark:text-zinc-200 rounded-tl-sm shadow-sm">
                  {GREETINGS[language || 'en']}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {(SUGGESTED_FAQS[language || 'en']).map((faq, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(undefined, faq)}
                  className="px-3 py-1.5 bg-[#FCFAF7] border border-[#e2e8f0]/60 text-[#64748b] hover:text-[#0f172a] hover:border-[#64748b]/40 rounded-full text-[10px] font-bold cursor-pointer transition-colors text-left"
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
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                )}
                
                <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                  isUser 
                    ? 'bg-[#14141F] text-white rounded-tr-sm' 
                    : 'bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 text-[#0f172a] dark:text-zinc-200 rounded-tl-sm shadow-sm'
                }`}>
                  <ReactMarkdown 
                    components={{
                      a: ({node, ...props}) => <a {...props} className="text-sky-500 hover:underline" target="_blank" rel="noreferrer" />,
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
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-[#0f172a] text-white hover:bg-[#5C5043] transition-colors cursor-pointer w-fit"
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
              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <div className="p-3.5 rounded-2xl rounded-tl-sm bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 shadow-sm flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-[#64748b] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-[#64748b] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-[#64748b] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
                className="px-3 py-1.5 rounded-full bg-[#FCFAF7] border border-[#e2e8f0]/80 text-[10px] font-bold text-[#64748b] hover:bg-white hover:text-[#0f172a] hover:border-[#64748b]/40 transition-colors cursor-pointer"
              >
                {faq}
              </button>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white dark:bg-zinc-900 border-t border-[#e2e8f0]/60 dark:border-zinc-800 shrink-0">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Type your message here..."
            className="w-full pl-4 pr-12 py-3 bg-[#FCFAF7] dark:bg-zinc-950 border border-[#e2e8f0]/60 dark:border-zinc-700 rounded-xl text-xs text-[#0f172a] dark:text-white placeholder-[#64748b]/50 focus:outline-none focus:border-[#64748b]/60 transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 w-8 h-8 rounded-lg bg-[#14141F] text-white flex items-center justify-center hover:bg-[#5C5043] disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </form>
      </div>
      
    </div>
  );
}
