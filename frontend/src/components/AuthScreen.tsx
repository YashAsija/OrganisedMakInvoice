"use client";
import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Lock, 
  Phone, 
  User, 
  Building2, 
  ArrowLeft, 
  CheckCircle, 
  LogIn, 
  UserPlus, 
  KeyRound, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { BusinessProfile } from '../types';

interface AuthScreenProps {
  defaultMode: 'login' | 'signup';
}

export default function AuthScreen({ defaultMode }: AuthScreenProps) {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>(defaultMode);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone_otp' | 'google'>('email');
  
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    password: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Sync theme
  useEffect(() => {
    const cached = localStorage.getItem('invoice_maker_theme');
    if (cached === 'dark') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200 dark:bg-neutral-800' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    switch (score) {
      case 1:
        return { score, label: 'Weak', color: 'bg-rose-500' };
      case 2:
        return { score, label: 'Fair', color: 'bg-amber-500' };
      case 3:
        return { score, label: 'Good', color: 'bg-sky-500' };
      case 4:
        return { score, label: 'Strong', color: 'bg-emerald-500' };
      default:
        return { score, label: 'Too short', color: 'bg-rose-500' };
    }
  };

  const strength = getPasswordStrength(formData.password);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    if (loginMethod === 'email') {
      if (authMode === 'signup') {
        if (!formData.name.trim()) return setFormErrors({ email: 'Please fill out Your Name.' });
        if (!formData.companyName.trim()) return setFormErrors({ email: 'Please fill out Your Company Name.' });
        if (!formData.phone.trim()) return setFormErrors({ email: 'Please fill out your Phone Number.' });
        if (!formData.email.trim()) return setFormErrors({ email: 'Please fill out your Email Address.' });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) return setFormErrors({ email: 'Please enter a valid Email Address.' });
        if (!formData.password.trim()) return setFormErrors({ email: 'Please enter a Password.' });
        if (formData.password.length < 6) return setFormErrors({ email: 'Password must be at least 6 characters long.' });
      } else {
        if (!formData.email.trim()) return setFormErrors({ email: 'Please enter your Registered Email Address.' });
        if (!formData.password.trim()) return setFormErrors({ email: 'Please enter your Password.' });
      }
    } else if (loginMethod === 'phone_otp') {
      if (!formData.name.trim()) return setFormErrors({ email: 'Please fill out Your Name.' });
      if (!formData.companyName.trim()) return setFormErrors({ email: 'Please fill out Your Company Name.' });
      if (!formData.phone.trim()) return setFormErrors({ email: 'Please enter a local Workspace Key.' });
    }

    setIsLoading(true);
    setSuccessMsg('');

    if (loginMethod === 'phone_otp') {
      // Local/Offline Demo Guest fallback
      const sanitizedKey = formData.phone.replace(/[^a-zA-Z0-9]/g, '');
      const resolvedEmail = `${sanitizedKey}@makbills.local`;
      localStorage.setItem('makbills_custom_email', resolvedEmail);
      localStorage.setItem('makbills_custom_phone', formData.phone);
      localStorage.setItem('makbills_custom_brand', formData.companyName);
      localStorage.setItem('makbills_custom_owner', formData.name);
      
      const initProf: BusinessProfile = {
        uid: resolvedEmail,
        name: formData.companyName,
        email: resolvedEmail,
        phone: formData.phone,
        ownerName: formData.name,
        address: '',
        taxId: '',
        currency: 'INR',
        defaultTaxRate: 18,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('invoice_maker_biz_profile', JSON.stringify(initProf));
      
      setSuccessMsg('Guest session initialized! Redirecting...');
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      return;
    }

    try {
      if (authMode === 'signup') {

        if (!isSupabaseConfigured) {
          throw new Error("Supabase is not configured. Service unavailable.");
        }
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.name,
              phone: formData.phone,
              company_name: formData.companyName
            }
          }
        });

        if (error) throw error;

        if (data.user && !data.session) {
          setSuccessMsg("Account created! Please check your inbox to verify your email address.");
          setIsLoading(false);
        } else if (data.user) {
          const initProf: BusinessProfile = {
            uid: data.user.id,
            name: formData.companyName,
            email: formData.email,
            phone: formData.phone,
            ownerName: formData.name,
            address: '',
            taxId: '',
            currency: 'INR',
            defaultTaxRate: 18,
            updatedAt: new Date().toISOString()
          };
          await supabase.from('users').upsert(initProf);
          localStorage.setItem('invoice_maker_biz_profile', JSON.stringify(initProf));
          setSuccessMsg('Welcome aboard! Redirecting...');
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);
        }
      } else {
        if (loginMethod === 'email') {
          if (!isSupabaseConfigured) {
            throw new Error("Supabase is not configured. Service unavailable.");
          }
          const { error } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password
          });
          if (error) throw error;
          setSuccessMsg('Welcome back! Redirecting...');
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);
        }
      }
    } catch (err: any) {
      setFormErrors({ email: err.message || 'Authentication failed. Please try again.' });
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isSupabaseConfigured) {
      alert("Supabase service is not configured. Google login unavailable.");
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      alert(err.message || "Google OAuth failed");
    }
  };

  const handleGuestMode = () => {
    localStorage.setItem('makbills_custom_email', 'guest@makinvoices.local');
    localStorage.setItem('makbills_custom_brand', 'Acme Design Studio');
    localStorage.setItem('makbills_custom_owner', 'Guest User');
    localStorage.setItem('makbills_custom_phone', '+1 (555) 019-2834');
    window.location.href = '/';
  };

  return (
    <div className={`min-h-screen w-full flex flex-col md:flex-row transition-all duration-300 font-sans ${
      theme === 'dark' ? 'bg-neutral-955 text-slate-105' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Left side: Premium Minimalist Marketing Panel */}
      <div className="hidden md:flex md:w-[45%] bg-[#080808] p-16 text-white flex-col justify-between relative overflow-hidden border-r border-neutral-900/60">
        {/* Soft Modern Mesh Glows */}
        <div className="absolute -top-[10%] -left-[10%] w-[500px] h-[500px] bg-sky-500/8 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[500px] h-[500px] bg-indigo-500/8 rounded-full blur-[130px] pointer-events-none" />
        
        {/* Logo Brand */}
        <div className="flex items-center gap-3 cursor-pointer z-10 hover:opacity-90 transition-opacity" onClick={() => window.location.href = '/'}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-base shadow-lg shadow-sky-500/10">
            MI
          </div>
          <div>
            <span className="text-sm font-black tracking-tight text-white block">
              Mak<span className="text-sky-400">Invoices</span>
            </span>
            <span className="text-[9px] font-bold text-slate-400 block -mt-1 tracking-widest uppercase">Ledger Hub</span>
          </div>
        </div>

        {/* Marketing Pitch Section */}
        <div className="space-y-6 max-w-sm z-10 my-auto">
          <span className="inline-block px-2.5 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/15 rounded-full text-[9px] font-bold uppercase tracking-wider">
            Workspace Hub
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight leading-[1.15] text-white">
            The modern billing platform for <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">businesses & creators</span>.
          </h1>
          <p className="text-slate-400 text-[13px] leading-relaxed font-normal">
            Automate your estimates, track invoices in real-time, generate custom signatures, and export pixel-perfect PDF bills.
          </p>

          <div className="space-y-4 pt-6 border-t border-neutral-900">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-sky-500/5 flex items-center justify-center text-sky-400 shrink-0 border border-sky-500/10">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-200">Secure Storage</h4>
                <p className="text-[10.5px] text-slate-400 mt-0.5 leading-normal">Full database encryption and Supabase-secured user compartments.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/5 flex items-center justify-center text-indigo-400 shrink-0 border border-neutral-800/10">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-200">Always Available</h4>
                <p className="text-[10.5px] text-slate-400 mt-0.5 leading-normal">Offline sandbox technology keeps your draft data active at all times.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-[9px] text-slate-500 font-medium uppercase tracking-widest z-10">
          © {new Date().getFullYear()} MakInvoices Studio.
        </div>
      </div>

      {/* Right side: Auth Form Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-16 relative bg-slate-50 dark:bg-neutral-950 transition-colors duration-300">
        
        {/* Soft Background Mesh on mobile/light */}
        <div className="absolute top-[20%] right-[10%] w-80 h-80 bg-sky-500/5 rounded-full blur-[110px] pointer-events-none md:hidden" />

        {/* Desktop Return button */}
        <button 
          onClick={() => window.location.href = '/'}
          className="hidden md:flex absolute top-10 left-10 items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 transition-all cursor-pointer z-10"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to landing page
        </button>

        {/* Form Container Card */}
        <div className="w-full max-w-sm z-10">
          <div className={`w-full rounded-2xl border transition-all duration-300 shadow-xl shadow-slate-200/5 dark:shadow-none ${
            theme === 'dark' 
              ? 'bg-neutral-900 border-neutral-800/80' 
              : 'bg-white border-slate-200/50'
          }`}>
            
            {/* Header */}            <div className="text-center pt-8 pb-5 border-b border-slate-100 dark:border-neutral-800/40">
              <h2 className="text-base font-extrabold text-slate-805 uppercase tracking-wider">
                {authMode === 'signup' ? 'Create Workspace' : 'Welcome Back'}
              </h2>
              <p className="text-[9.5px] text-slate-600 dark:text-slate-500 mt-1 uppercase tracking-widest font-bold">
                {authMode === 'signup' ? 'Get started for free' : 'Access your billing portal'}
              </p>
            </div>

            <div className="p-6 sm:p-8">
              {/* Form Toggle Bar */}
              <div className="flex bg-slate-100/60 dark:bg-neutral-900/55 p-1 rounded-xl mb-6 border border-slate-200/10">
                <button
                  type="button"
                  onClick={() => { setAuthMode('signup'); setOtpSent(false); setSuccessMsg(''); }}
                  className={`flex-1 py-1.5 text-center text-[10.5px] font-extrabold uppercase tracking-wide rounded-lg transition-all cursor-pointer ${
                    authMode === 'signup' 
                      ? 'bg-white dark:bg-neutral-800 text-sky-600 dark:text-sky-400 shadow-xs' 
                      : 'text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setOtpSent(false); setSuccessMsg(''); }}
                  className={`flex-1 py-1.5 text-center text-[10.5px] font-extrabold uppercase tracking-wide rounded-lg transition-all cursor-pointer ${
                    authMode === 'login' 
                      ? 'bg-white dark:bg-neutral-800 text-sky-600 dark:text-sky-400 shadow-xs' 
                      : 'text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  Log In
                </button>
              </div>

              {/* Login Method Buttons */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => { setLoginMethod('email'); setOtpSent(false); setSuccessMsg(''); }}
                  className={`flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border transition-all cursor-pointer font-bold ${
                    loginMethod === 'email' 
                      ? 'border-sky-500/50 bg-sky-500/5 text-sky-600 dark:text-sky-400 shadow-xs' 
                      : 'border-slate-150 dark:border-neutral-800 text-slate-500 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/30'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span className="text-[8px] uppercase tracking-widest font-black">Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginMethod('phone_otp'); setOtpSent(false); setFormErrors({}); setSuccessMsg(''); }}
                  className={`flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border transition-all cursor-pointer font-bold ${
                    loginMethod === 'phone_otp' 
                      ? 'border-sky-500/50 bg-sky-500/5 text-sky-600 dark:text-sky-400 shadow-xs' 
                      : 'border-slate-150 dark:border-neutral-800 text-slate-500 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/30'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span className="text-[8px] uppercase tracking-widest font-black">Guest</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginMethod('google'); setOtpSent(false); setSuccessMsg(''); }}
                  className={`flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border transition-all cursor-pointer font-bold ${
                    loginMethod === 'google' 
                      ? 'border-sky-500/50 bg-sky-500/5 text-sky-600 dark:text-sky-400 shadow-xs' 
                      : 'border-slate-150 dark:border-neutral-800 text-slate-500 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/30'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="text-[8px] uppercase tracking-widest font-black">Google</span>
                </button>
              </div>

              {/* Toast Messages */}
              {successMsg && (
                <div className="mb-5 p-3 bg-emerald-550/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[11px] font-bold flex items-center gap-2 animate-in fade-in duration-200">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {formErrors.email && (
                <div className="mb-5 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-[11px] font-bold animate-in fade-in duration-200">
                  {formErrors.email}
                </div>
              )}

              {/* Render Selected Method Form */}
              {loginMethod === 'google' ? (
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full py-3 px-4 bg-white hover:bg-slate-55 dark:bg-neutral-900 dark:hover:bg-neutral-850 text-slate-700 dark:text-slate-200 text-[11px] font-bold tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-2.5 border border-slate-200 dark:border-neutral-800 shadow-xs cursor-pointer hover:scale-[1.01] active:scale-99"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.09H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.91l2.85-2.22c-.1-.29-.19-.61-.25-.94z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.09l3.66 2.84c.87-2.6 3.3-4.55 6.16-4.55z" fill="#EA4335" />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              ) : loginMethod === 'email' ? (
                <form onSubmit={handleFormSubmit} className="space-y-4 animate-in fade-in duration-200">
                  {authMode === 'signup' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Your Name</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g. John Doe"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/30 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all text-slate-805 dark:text-neutral-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Company Name</label>
                        <input
                          type="text"
                          required
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          placeholder="e.g. Acme Tech Solutions"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/30 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all text-slate-805 dark:text-neutral-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Phone Number</label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="e.g. +91 98765 43210"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/30 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all text-slate-805 dark:text-neutral-100"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. sales@yourcompany.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/30 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all text-slate-805 dark:text-neutral-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Password</label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/30 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all text-slate-805 dark:text-neutral-100"
                    />
                    {authMode === 'signup' && formData.password && (
                      <div className="mt-2.5 space-y-1 bg-slate-50 dark:bg-slate-900/20 p-2.5 rounded-xl border border-slate-200/5">
                        <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                          <span>Password Strength</span>
                          <span className={strength.score >= 3 ? 'text-emerald-500' : 'text-amber-500'}>{strength.label}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 h-1 mt-1">
                          <div className={`rounded-full ${strength.score >= 1 ? strength.color : 'bg-slate-200 dark:bg-neutral-800'}`} />
                          <div className={`rounded-full ${strength.score >= 2 ? strength.color : 'bg-slate-200 dark:bg-neutral-800'}`} />
                          <div className={`rounded-full ${strength.score >= 3 ? strength.color : 'bg-slate-200 dark:bg-neutral-800'}`} />
                          <div className={`rounded-full ${strength.score >= 4 ? strength.color : 'bg-slate-200 dark:bg-neutral-800'}`} />
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 mt-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:from-slate-400 disabled:to-slate-400 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 hover:scale-[1.01] active:scale-99"
                  >
                    {isLoading ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        <span>{authMode === 'signup' ? 'Create Account' : 'Log In'}</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. John Doe"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/30 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all text-slate-805 dark:text-neutral-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Company Name</label>
                    <input
                      type="text"
                      required
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="e.g. Acme Corporation"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/30 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all text-slate-805 dark:text-neutral-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Local Workspace Key</label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. guest-session"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/30 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all text-slate-805 dark:text-neutral-100"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 mt-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:from-slate-400 disabled:to-slate-400 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 hover:scale-[1.01] active:scale-99"
                  >
                    {isLoading ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <User className="w-3.5 h-3.5" />
                        <span>Enter Guest Workspace</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Divider */}
              <div className="relative flex items-center justify-center my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100 dark:border-neutral-800/40" />
                </div>
                <span className="relative px-2.5 text-[8px] font-black uppercase tracking-widest text-slate-450 bg-white dark:bg-neutral-900 rounded-full">OR</span>
              </div>

              {/* Instant Sandbox Entry */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleGuestMode}
                  className="text-xs font-extrabold text-sky-600 dark:text-sky-400 hover:underline transition-all cursor-pointer"
                >
                  Try instantly as Guest (Local Offline Mode)
                </button>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 leading-normal max-w-[280px] mx-auto font-medium">
                  Guest data is stored locally in your browser cache. No account credentials required.
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
