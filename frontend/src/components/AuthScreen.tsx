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
    <div className={`min-h-screen w-full flex flex-col md:flex-row transition-colors duration-305 ${
      theme === 'dark' ? 'bg-neutral-950 text-neutral-100' : 'bg-slate-50 text-slate-805'
    }`}>
      
      {/* Left side: Premium Grid Marketing Panel */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-neutral-950 via-slate-900 to-indigo-950 p-12 text-white flex-col justify-between relative overflow-hidden border-r border-slate-200/10">
        {/* Glowing Ambient Mesh Points */}
        <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        
        {/* Subtle Tech Grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Logo Brand */}
        <div className="flex items-center gap-2.5 cursor-pointer z-10 hover:scale-102 transition-transform" onClick={() => window.location.href = '/'}>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-650 flex items-center justify-center text-white font-black text-lg shadow-md shadow-sky-500/20">
            MI
          </div>
          <div>
            <span className="text-base font-black tracking-tight text-white block">
              Mak<span className="text-sky-400">Invoices</span>
            </span>
            <span className="text-[9px] font-bold text-slate-400 block -mt-1.5 tracking-widest uppercase">Ledger Hub</span>
          </div>
        </div>

        {/* Key Features Pitch */}
        <div className="space-y-6 max-w-md z-10 my-auto">
          <span className="px-3 py-1 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">
            PRO ACCOUNT ENROLLMENT
          </span>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-tight uppercase">
            The Intelligent <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-sky-305 to-indigo-400">Billing & Estimate</span> <br />
            Platform.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed font-medium">
            Join thousands of creators automating their billing cycles. Generate beautiful signatures, visual analytics, and export premium invoice documents instantly.
          </p>

          <div className="space-y-4 pt-6 border-t border-slate-800/80">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 shrink-0 border border-sky-500/15">
                <ShieldCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Enterprise Security</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">Compliant end-to-end data encryption and Supabase Row Level Security.</p>
              </div>
            </div>
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0 border border-indigo-500/15">
                <CheckCircle className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Offline Capability</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">Fully operational local sandbox caching ensures 100% offline data durability.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider z-10">
          © {new Date().getFullYear()} MakInvoices. All rights reserved.
        </div>
      </div>

      {/* Right side: Auth Form Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 relative bg-slate-50 dark:bg-neutral-950 transition-colors">
        
        {/* Glow point behind card on mobile */}
        <div className="absolute top-[20%] left-[10%] w-72 h-72 bg-sky-500/5 rounded-full blur-[100px] pointer-events-none md:hidden" />

        {/* Mobile Header Row */}
        <div className="w-full max-w-md flex justify-between items-center mb-8 md:hidden z-10">
          <div className="flex items-center gap-2" onClick={() => window.location.href = '/'}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-650 flex items-center justify-center text-white font-black text-xs">
              MI
            </div>
            <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">MakInvoices</span>
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            className="text-xs font-bold text-slate-500 flex items-center gap-1 hover:text-sky-500"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        </div>

        {/* Desktop Back button */}
        <button 
          onClick={() => window.location.href = '/'}
          className="hidden md:flex absolute top-8 left-8 items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-sky-500 dark:hover:text-sky-405 hover:scale-105 active:scale-95 transition-all cursor-pointer z-10"
        >
          <ArrowLeft className="w-4 h-4" /> Return to landing page
        </button>

        {/* Form Container */}
        <div className="w-full max-w-md z-10">
          
          <div className={`w-full rounded-3xl border transition-all relative overflow-hidden shadow-2xl ${
            theme === 'dark' 
              ? 'bg-neutral-900/40 border-neutral-800/80 backdrop-blur-xl' 
              : 'bg-white/80 border-slate-200/60 backdrop-blur-xl shadow-slate-200/80'
          }`}>
            
            {/* Title */}
            <div className="text-center pt-8 pb-4 border-b border-slate-100 dark:border-neutral-800/60">
              <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider">
                {authMode === 'signup' ? 'Create Your Workspace' : 'Welcome Back'}
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 uppercase tracking-widest font-black">
                {authMode === 'signup' ? 'Get started for free' : 'Access your dashboard'}
              </p>
            </div>

            <div className="p-6 sm:p-8">
              {/* Mode Toggle Tabs */}
              <div className="flex border-b border-slate-100 dark:border-neutral-800/60 pb-3 mb-6">
                <button
                  type="button"
                  onClick={() => { setAuthMode('signup'); setOtpSent(false); setSuccessMsg(''); }}
                  className={`flex-1 pb-2 text-center text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    authMode === 'signup' 
                      ? 'text-sky-505 border-b-2 border-sky-500' 
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300'
                  }`}
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setOtpSent(false); setSuccessMsg(''); }}
                  className={`flex-1 pb-2 text-center text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    authMode === 'login' 
                      ? 'text-sky-505 border-b-2 border-sky-500' 
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300'
                  }`}
                >
                  Log In
                </button>
              </div>

              {/* Method Selector */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => { setLoginMethod('email'); setOtpSent(false); setSuccessMsg(''); }}
                  className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border transition-all cursor-pointer font-bold ${
                    loginMethod === 'email' 
                      ? 'border-sky-500 bg-sky-500/5 text-sky-500 shadow-md shadow-sky-500/5' 
                      : 'border-slate-200 dark:border-neutral-800 text-slate-400 hover:border-slate-300 dark:hover:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800/55'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span className="text-[9px] uppercase tracking-wider">Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginMethod('phone_otp'); setOtpSent(false); setFormErrors({}); setSuccessMsg(''); }}
                  className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border transition-all cursor-pointer font-bold ${
                    loginMethod === 'phone_otp' 
                      ? 'border-sky-500 bg-sky-500/5 text-sky-500 shadow-md shadow-sky-500/5' 
                      : 'border-slate-205 dark:border-neutral-800 text-slate-400 hover:border-slate-300 dark:hover:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800/55'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span className="text-[9px] uppercase tracking-wider">Guest Mode</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginMethod('google'); setOtpSent(false); setSuccessMsg(''); }}
                  className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border transition-all cursor-pointer font-bold ${
                    loginMethod === 'google' 
                      ? 'border-sky-500 bg-sky-500/5 text-sky-500 shadow-md shadow-sky-500/5' 
                      : 'border-slate-200 dark:border-neutral-800 text-slate-400 hover:border-slate-300 dark:hover:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800/55'
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  <span className="text-[9px] uppercase tracking-wider">Google</span>
                </button>
              </div>

              {/* Status Notifications */}
              {successMsg && (
                <div className="mb-5 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {formErrors.email && (
                <div className="mb-5 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold animate-fade-in">
                  {formErrors.email}
                </div>
              )}

              {/* Render Forms */}
              {loginMethod === 'google' ? (
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 text-xs font-black tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-3 border border-slate-200 dark:border-neutral-800 shadow-sm cursor-pointer animate-in fade-in duration-200 hover:scale-102 active:scale-98"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
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
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Your Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g. John Doe"
                          className={`w-full px-3.5 py-3 rounded-xl border bg-slate-50 dark:bg-neutral-950 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all ${
                            formData.name 
                              ? 'border-emerald-500/50 dark:border-emerald-500/30 focus:ring-emerald-500' 
                              : 'border-slate-205 dark:border-neutral-800'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Company Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          placeholder="e.g. Acme Tech Solutions"
                          className={`w-full px-3.5 py-3 rounded-xl border bg-slate-50 dark:bg-neutral-950 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all ${
                            formData.companyName 
                              ? 'border-emerald-500/50 dark:border-emerald-500/30 focus:ring-emerald-500' 
                              : 'border-slate-205 dark:border-neutral-800'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Phone Number *</label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="e.g. +91 98765 43210"
                          className={`w-full px-3.5 py-3 rounded-xl border bg-slate-50 dark:bg-neutral-950 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all ${
                            formData.phone 
                              ? 'border-emerald-500/50 dark:border-emerald-500/30 focus:ring-emerald-500' 
                              : 'border-slate-205 dark:border-neutral-800'
                          }`}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. sales@yourcompany.com"
                      className={`w-full px-3.5 py-3 rounded-xl border bg-slate-50 dark:bg-neutral-950 text-sm focus:outline-none focus:ring-1 transition-all ${
                        formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
                          ? 'border-emerald-500/50 dark:border-emerald-500/30 focus:ring-emerald-500'
                          : formData.email 
                          ? 'border-amber-500/50 focus:ring-amber-500' 
                          : 'border-slate-205 dark:border-neutral-800 focus:ring-sky-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Password *</label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className={`w-full px-3.5 py-3 rounded-xl border bg-slate-50 dark:bg-neutral-950 text-sm focus:outline-none focus:ring-1 transition-all ${
                        formData.password.length >= 6 
                          ? 'border-emerald-500/50 dark:border-emerald-500/30 focus:ring-emerald-500' 
                          : formData.password 
                          ? 'border-amber-500/50 focus:ring-amber-500' 
                          : 'border-slate-205 dark:border-neutral-800 focus:ring-sky-500'
                      }`}
                    />
                    {authMode === 'signup' && formData.password && (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[9px] font-bold text-slate-400">
                          <span>Password Strength:</span>
                          <span className={strength.score >= 3 ? 'text-emerald-500' : 'text-amber-500'}>{strength.label}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 h-1">
                          <div className={`rounded-full ${strength.score >= 1 ? strength.color : 'bg-slate-205 dark:bg-neutral-800'}`} />
                          <div className={`rounded-full ${strength.score >= 2 ? strength.color : 'bg-slate-205 dark:bg-neutral-800'}`} />
                          <div className={`rounded-full ${strength.score >= 3 ? strength.color : 'bg-slate-205 dark:bg-neutral-800'}`} />
                          <div className={`rounded-full ${strength.score >= 4 ? strength.color : 'bg-slate-205 dark:bg-neutral-800'}`} />
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:from-slate-400 disabled:to-slate-400 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-sky-500/10 hover:shadow-sky-500/25 hover:-translate-y-0.5 active:scale-95 transform"
                  >
                    {isLoading ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        <span>{authMode === 'signup' ? 'Create Account with Email' : 'Log In with Email'}</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. John Doe"
                      className={`w-full px-3.5 py-3 rounded-xl border bg-slate-50 dark:bg-neutral-950 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all ${
                        formData.name 
                          ? 'border-emerald-500/50 dark:border-emerald-500/30 focus:ring-emerald-500' 
                          : 'border-slate-205 dark:border-neutral-800'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Company Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="e.g. Acme Corporation"
                      className={`w-full px-3.5 py-3 rounded-xl border bg-slate-50 dark:bg-neutral-950 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all ${
                        formData.companyName 
                          ? 'border-emerald-500/50 dark:border-emerald-500/30 focus:ring-emerald-500' 
                          : 'border-slate-205 dark:border-neutral-800'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Local Workspace Identifier Key *</label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. guest-session"
                      className={`w-full px-3.5 py-3 rounded-xl border bg-slate-50 dark:bg-neutral-950 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all ${
                        formData.phone 
                          ? 'border-emerald-500/50 dark:border-emerald-500/30 focus:ring-emerald-500' 
                          : 'border-slate-205 dark:border-neutral-800'
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:from-slate-400 disabled:to-slate-400 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-sky-500/10 hover:shadow-sky-500/25 hover:-translate-y-0.5 active:scale-95 transform"
                  >
                    {isLoading ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <User className="w-4 h-4" />
                        <span>Enter Guest Workspace</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Guest / local mode separator */}
              <div className="relative flex items-center justify-center my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100 dark:border-neutral-800/80" />
                </div>
                <span className="relative px-3 text-[9px] font-black uppercase tracking-widest text-slate-400 bg-white dark:bg-neutral-900/90 rounded-full">OR</span>
              </div>

              {/* Sandbox Guest Mode Shortcut */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleGuestMode}
                  className="text-xs font-black text-slate-500 hover:text-sky-550 dark:hover:text-sky-400 hover:underline transition-all cursor-pointer hover:scale-102"
                >
                  Try instantly as Guest (Local Offline Mode)
                </button>
                <p className="text-[9px] text-slate-400 mt-1.5 font-medium leading-normal max-w-[280px] mx-auto">
                  * Note: Guest data is saved in your local browser storage only. No cloud account will be created.
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
