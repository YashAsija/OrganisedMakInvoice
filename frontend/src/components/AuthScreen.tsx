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
  ShieldCheck,
  Eye,
  EyeOff,
  Zap,
  BarChart2
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { BusinessProfile } from '../types';

interface AuthScreenProps {
  defaultMode: 'login' | 'signup';
}

export default function AuthScreen({ defaultMode }: AuthScreenProps) {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot-password'>(defaultMode);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone' | 'google'>('email');
  
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    
    if (!formData.phone.trim()) {
      return setFormErrors({ phone: 'Please enter your Phone Number.' });
    }
    if (authMode === 'signup') {
      if (!formData.name.trim()) return setFormErrors({ phone: 'Please enter your Name.' });
      if (!formData.companyName.trim()) return setFormErrors({ phone: 'Please enter your Company Name.' });
    }

    setIsLoading(true);
    setSuccessMsg('');

    try {
      if (!isSupabaseConfigured) {
        throw new Error("Supabase is not configured. Service unavailable.");
      }
      const { error } = await supabase.auth.signInWithOtp({
        phone: formData.phone.trim(),
      });
      if (error) throw error;

      setOtpSent(true);
      setSuccessMsg(`Verification code sent to ${formData.phone}`);
      setIsLoading(false);
    } catch (err: any) {
      setFormErrors({ phone: err.message || 'Failed to send OTP.' });
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    if (!otpValue.trim()) {
      return setFormErrors({ otp: 'Please enter the verification code.' });
    }

    setIsLoading(true);
    setSuccessMsg('');

    try {
      if (!isSupabaseConfigured) {
        throw new Error("Supabase is not configured. Service unavailable.");
      }
      const { data: { session, user }, error } = await supabase.auth.verifyOtp({
        phone: formData.phone.trim(),
        token: otpValue.trim(),
        type: 'sms',
      });
      if (error) throw error;

      if (user) {
        if (authMode === 'signup') {
          const initProf: BusinessProfile = {
            uid: user.id,
            name: formData.companyName,
            email: '',
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
        }
        
        setSuccessMsg('Successfully authenticated! Redirecting...');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      }
    } catch (err: any) {
      setFormErrors({ otp: err.message || 'OTP verification failed.' });
      setIsLoading(false);
    }
  };

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
        if (formData.password !== formData.confirmPassword) return setFormErrors({ email: 'Passwords do not match.' });
      } else if (authMode === 'forgot-password') {
        if (!formData.email.trim()) return setFormErrors({ email: 'Please enter your Registered Email Address.' });
      } else {
        if (!formData.email.trim()) return setFormErrors({ email: 'Please enter your Registered Email Address.' });
        if (!formData.password.trim()) return setFormErrors({ email: 'Please enter your Password.' });
      }
    }

    setIsLoading(true);
    setSuccessMsg('');

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
            window.location.href = '/dashboard';
          }, 1500);
        }
      } else if (authMode === 'forgot-password') {
        if (!isSupabaseConfigured) {
          throw new Error("Supabase is not configured. Service unavailable.");
        }
        const { error } = await supabase.auth.resetPasswordForEmail(formData.email.trim(), {
          redirectTo: window.location.origin + '/reset-password',
        });
        if (error) throw error;
        setSuccessMsg("Password reset link sent to your email!");
        setIsLoading(false);
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
            window.location.href = '/dashboard';
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
          redirectTo: window.location.origin + '/auth/callback',
        },
      });
      if (error) throw error;
    } catch (err: any) {
      alert(err.message || "Google OAuth failed");
    }
  };




  return (
    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif" }} className={`min-h-screen w-full flex flex-col md:flex-row transition-all duration-300 ${
      theme === 'dark' ? 'bg-[#0b1329] text-slate-100' : 'bg-[#f4f9ff] text-slate-900'
    }`}>

      {/* Google Font imports */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;700&display=swap');
        .auth-input {
          width: 100%;
          padding: 11px 14px;
          border-radius: 10px;
          border: 1.5px solid ${theme === 'dark' ? '#223269' : '#bae6fd'};
          background: ${theme === 'dark' ? '#111a36' : '#ffffff'};
          color: ${theme === 'dark' ? '#f8fafc' : '#0f172a'};
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 0.88rem;
          outline: none;
          transition: border 0.18s, box-shadow 0.18s;
        }
        .auth-input:focus {
          border-color: #0284c7;
          box-shadow: 0 0 0 3px rgba(2,132,199,0.12);
        }
        .auth-input::placeholder { color: ${theme === 'dark' ? '#94a3b8' : '#94a3b8'}; }
        .auth-label {
          display: block;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: ${theme === 'dark' ? '#64748b' : '#64748b'};
          margin-bottom: 6px;
        }
        .auth-btn-primary {
          width: 100%;
          padding: 13px 20px;
          background: #0284c7;
          border: 1px solid #0369a1;
          color: #ffffff;
          border-radius: 10px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(2,132,199,0.2);
        }
        .auth-btn-primary:hover { background: #0369a1; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(2,132,199,0.3); }
        .auth-btn-primary:disabled { background: #94a3b8; border-color: #94a3b8; transform: none; box-shadow: none; cursor: not-allowed; }
        .auth-method-btn {
          flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px;
          padding: 10px 6px; border-radius: 10px; font-family: 'IBM Plex Mono', monospace;
          font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
          border: 1.5px solid; cursor: pointer; transition: all 0.18s;
        }
        .auth-method-btn.active {
          border-color: #0284c7;
          background: ${theme === 'dark' ? 'rgba(2,132,199,0.12)' : '#e0f2fe'};
          color: #0284c7;
        }
        .auth-method-btn.inactive {
          border-color: ${theme === 'dark' ? '#223269' : '#bae6fd'};
          background: transparent;
          color: ${theme === 'dark' ? '#64748b' : '#64748b'};
        }
        .auth-method-btn.inactive:hover {
          border-color: #0284c7;
          color: #0284c7;
        }
        .auth-tab-active {
          background: ${theme === 'dark' ? '#1b264f' : '#0284c7'};
          color: ${theme === 'dark' ? '#38bdf8' : '#ffffff'};
          border-radius: 8px;
        }
        .auth-tab-inactive {
          color: ${theme === 'dark' ? '#64748b' : '#64748b'};
        }
        .auth-tab-inactive:hover { color: ${theme === 'dark' ? '#f8fafc' : '#0f172a'}; }
      `}</style>

      {/* ====== LEFT: MARKETING PANEL ====== */}
      <div className="hidden md:flex md:w-[44%] flex-col justify-between relative overflow-hidden" style={{
        background: theme === 'dark' ? '#0b1329' : '#0f172a',
        padding: '52px 56px',
        borderRight: `1px solid ${theme === 'dark' ? '#223269' : '#1e3a5f'}`
      }}>
        {/* Background glow elements */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: 440, height: 440, background: 'rgba(2,132,199,0.06)', borderRadius: '50%', filter: 'blur(120px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: 440, height: 440, background: 'rgba(99,102,241,0.06)', borderRadius: '50%', filter: 'blur(120px)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer z-10"
          onClick={() => window.location.href = '/'}
          style={{ transition: 'opacity 0.2s' }}
          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = '0.8'}
          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = '1'}
        >
          <img src="/logo.svg" alt="MakInvoices Logo" style={{ width: 44, height: 44, objectFit: 'contain' }} />
          <div>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', display: 'block', lineHeight: 1 }}>
              Mak<span style={{ color: '#38bdf8' }}>Invoices</span>
            </span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', fontWeight: 700, color: '#475569', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginTop: 4 }}>Advanced Ledger Hub</span>
          </div>
        </div>

        {/* Marketing copy */}
        <div className="z-10" style={{ maxWidth: 360, margin: 'auto 0' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>
            AI-Powered Billing
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(1.8rem, 2.6vw, 2.5rem)', fontWeight: 500, color: '#f8fafc', lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 18 }}>
            Billing software that <em style={{ fontStyle: 'italic', color: '#38bdf8' }}>thinks</em> with you.
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.65, marginBottom: 32 }}>
            Build editable, interactive invoices layer by layer. Let AI draft line items. Manage invoices, quotations, purchase orders, and ledgers from one dashboard.
          </p>

          {/* Mini feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, borderTop: '1px solid #1e3a5f', paddingTop: 28 }}>
            {([
              { icon: <Zap style={{ width: 15, height: 15 }} />, title: 'Gemini Smart Billing', desc: 'Natural language invoice drafting in seconds.' },
              { icon: <BarChart2 style={{ width: 15, height: 15 }} />, title: 'Sales & Purchase Ledgers', desc: 'Full transaction history with multi-column filters.' },
              { icon: <Lock style={{ width: 15, height: 15 }} />, title: 'Bank-Grade Security', desc: '256-bit encrypted data via Supabase.' }
            ] as { icon: React.ReactNode; title: string; desc: string }[]).map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(2,132,199,0.1)', border: '1px solid rgba(2,132,199,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', flexShrink: 0 }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{f.title}</div>
                  <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Decorative mini invoice card */}
        <div className="z-10" style={{ background: 'rgba(17,26,54,0.8)', border: '1px solid #223269', borderRadius: 10, padding: '14px 18px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', color: '#64748b', backdropFilter: 'blur(8px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#94a3b8' }}>
            <span>INV-0148</span><span style={{ color: '#38bdf8', fontWeight: 700 }}>SENT</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #223269', paddingBottom: 8, marginBottom: 8 }}>
            <span>Design Services</span><span style={{ color: '#f8fafc' }}>$180.00</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total Due</span><span style={{ color: '#38bdf8', fontWeight: 700 }}>$215.28</span>
          </div>
        </div>
      </div>

      {/* ====== RIGHT: AUTH FORM PANEL ====== */}
      <div className="flex-1 flex flex-col justify-center items-center relative" style={{
        padding: 'clamp(28px, 5vw, 80px) clamp(20px, 4vw, 64px)',
        background: theme === 'dark' ? '#111a36' : '#ffffff'
      }}>
        {/* Subtle background glow (mobile) */}
        <div className="md:hidden" style={{ position: 'absolute', top: '15%', right: '5%', width: 280, height: 280, background: 'rgba(2,132,199,0.04)', borderRadius: '50%', filter: 'blur(90px)', pointerEvents: 'none' }} />

        {/* Back link */}
        <button
          type="button"
          onClick={() => window.location.href = '/'}
          className="hidden md:flex"
          style={{ position: 'absolute', top: 32, left: 32, alignItems: 'center', gap: 6, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', zIndex: 10, transition: 'color 0.2s' }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#0284c7'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#64748b'}
        >
          <ArrowLeft style={{ width: 13, height: 13 }} /> Return home
        </button>

        {/* Mobile logo */}
        <div className="md:hidden flex items-center gap-2 mb-8 cursor-pointer z-10" onClick={() => window.location.href = '/'}>
          <img src="/logo.svg" alt="MakInvoices Logo" style={{ width: 34, height: 34, objectFit: 'contain' }} />
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: '1.1rem', fontWeight: 700, color: theme === 'dark' ? '#f8fafc' : '#0f172a' }}>
            Mak<span style={{ color: '#0284c7' }}>Invoices</span>
          </span>
        </div>

        {/* FORM CARD */}
        <div className="w-full z-10" style={{ maxWidth: 400 }}>
          {/* Eyebrow */}
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.68rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 18, height: 1, background: '#0284c7', display: 'inline-block' }} />
            {authMode === 'signup' ? 'Create Your Free Account' : authMode === 'forgot-password' ? 'Password Recovery' : 'Welcome Back'}
          </div>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(1.5rem, 2.4vw, 2rem)', fontWeight: 500, color: theme === 'dark' ? '#f8fafc' : '#0f172a', lineHeight: 1.15, letterSpacing: '-0.01em', marginBottom: 6 }}>
            {authMode === 'signup' ? 'Start billing smarter.' : authMode === 'forgot-password' ? 'Reset your password.' : 'Log into your workspace.'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 28 }}>
            {authMode === 'signup' ? 'No credit card required. Free to get started.' : authMode === 'forgot-password' ? 'Enter your email to receive a reset link.' : 'Pick up right where you left off.'}
          </p>

          {/* Main card */}
          <div style={{
            background: theme === 'dark' ? '#1b264f' : '#f8fafc',
            border: `1.5px solid ${theme === 'dark' ? '#223269' : '#bae6fd'}`,
            borderRadius: 16,
            padding: '26px 24px',
            boxShadow: theme === 'dark' ? '0 8px 40px rgba(0,0,0,0.4)' : '0 8px 40px rgba(2,132,199,0.06)'
          }}>

            {/* Tab toggle */}
            {authMode === 'forgot-password' ? (
              <div style={{ display: 'flex', background: theme === 'dark' ? '#111a36' : '#e0f2fe', borderRadius: 10, padding: 4, marginBottom: 22 }}>
                <button type="button" onClick={() => { setAuthMode('login'); setOtpSent(false); setSuccessMsg(''); }}
                  style={{ flex: 1, padding: '9px', borderRadius: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', border: 'none', background: '#0284c7', color: '#ffffff', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <ArrowLeft style={{ width: 12, height: 12 }} /> Back to Login
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', background: theme === 'dark' ? '#111a36' : '#e0f2fe', borderRadius: 10, padding: 4, marginBottom: 22 }}>
                <button type="button" onClick={() => { setAuthMode('signup'); setOtpSent(false); setSuccessMsg(''); }}
                  style={{ flex: 1, padding: '9px', borderRadius: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', border: 'none', transition: 'all 0.2s', background: authMode === 'signup' ? '#0284c7' : 'transparent', color: authMode === 'signup' ? '#ffffff' : (theme === 'dark' ? '#64748b' : '#0284c7') }}>
                  Sign Up
                </button>
                <button type="button" onClick={() => { setAuthMode('login'); setOtpSent(false); setSuccessMsg(''); }}
                  style={{ flex: 1, padding: '9px', borderRadius: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', border: 'none', transition: 'all 0.2s', background: authMode === 'login' ? '#0284c7' : 'transparent', color: authMode === 'login' ? '#ffffff' : (theme === 'dark' ? '#64748b' : '#0284c7') }}>
                  Log In
                </button>
              </div>
            )}

            {/* Method selector (not on forgot-password) */}
            {authMode !== 'forgot-password' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
                {[
                  { key: 'email', icon: <Mail style={{ width: 14, height: 14 }} />, label: 'Email' },
                  { key: 'phone', icon: <Phone style={{ width: 14, height: 14 }} />, label: 'Phone' },
                  { key: 'google', icon: <LogIn style={{ width: 14, height: 14 }} />, label: 'Google' }
                ].map(m => (
                  <button key={m.key} type="button"
                    onClick={() => { setLoginMethod(m.key as any); setOtpSent(false); setFormErrors({}); setSuccessMsg(''); }}
                    className={`auth-method-btn ${loginMethod === m.key ? 'active' : 'inactive'}`}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            {/* Toast messages */}
            {successMsg && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#059669', borderRadius: 10, fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle style={{ width: 14, height: 14, flexShrink: 0 }} />{successMsg}
              </div>
            )}
            {(formErrors.email || formErrors.phone || formErrors.otp) && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', borderRadius: 10, fontSize: '0.82rem', fontWeight: 600 }}>
                {formErrors.email || formErrors.phone || formErrors.otp}
              </div>
            )}

            {/* ===== GOOGLE METHOD ===== */}
            {loginMethod === 'google' ? (
              <button type="button" onClick={handleGoogleLogin}
                style={{ width: '100%', padding: '12px 18px', background: theme === 'dark' ? '#111a36' : '#ffffff', border: `1.5px solid ${theme === 'dark' ? '#223269' : '#bae6fd'}`, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '0.85rem', fontWeight: 600, color: theme === 'dark' ? '#f8fafc' : '#0f172a', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(2,132,199,0.06)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#0284c7'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(2,132,199,0.12)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = theme === 'dark' ? '#223269' : '#bae6fd'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(2,132,199,0.06)'; }}
              >
                <svg style={{ width: 16, height: 16, flexShrink: 0 }} viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.09H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.91l2.85-2.22c-.1-.29-.19-.61-.25-.94z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.09l3.66 2.84c.87-2.6 3.3-4.55 6.16-4.55z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>

            ) : loginMethod === 'email' ? (
              /* ===== EMAIL METHOD ===== */
              <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {authMode === 'signup' && (
                  <>
                    <div>
                      <label className="auth-label">Your Name</label>
                      <input className="auth-input" type="text" required placeholder="e.g. John Doe" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="auth-label">Company Name</label>
                      <input className="auth-input" type="text" required placeholder="e.g. Acme Tech Solutions" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} />
                    </div>
                    <div>
                      <label className="auth-label">Phone Number</label>
                      <input className="auth-input" type="tel" required placeholder="e.g. +1 555 000 0000" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                  </>
                )}

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="auth-label" style={{ margin: 0 }}>Email Address</label>
                    {authMode === 'login' && (
                      <button type="button" onClick={() => { setAuthMode('forgot-password'); setFormErrors({}); setSuccessMsg(''); }}
                        style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', fontWeight: 700, color: '#0284c7', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <input className="auth-input" type="email" required placeholder="e.g. sales@yourcompany.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>

                {authMode !== 'forgot-password' && (
                  <div>
                    <label className="auth-label">Password</label>
                    <div style={{ position: 'relative' }}>
                      <input className="auth-input" type={showPassword ? 'text' : 'password'} required placeholder="Enter your password" style={{ paddingRight: 44 }} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                        {showPassword ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                      </button>
                    </div>
                    {authMode === 'signup' && formData.password && (
                      <div style={{ marginTop: 10, background: theme === 'dark' ? '#111a36' : '#f0f7ff', border: `1px solid ${theme === 'dark' ? '#223269' : '#bae6fd'}`, borderRadius: 8, padding: '8px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                          <span style={{ color: '#64748b' }}>Strength</span>
                          <span style={{ color: strength.score >= 3 ? '#059669' : '#d97706' }}>{strength.label}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4, height: 4 }}>
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{ borderRadius: 99, background: strength.score >= i ? (strength.score >= 4 ? '#059669' : strength.score >= 3 ? '#0284c7' : strength.score >= 2 ? '#d97706' : '#dc2626') : (theme === 'dark' ? '#223269' : '#bae6fd') }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {authMode === 'signup' && (
                  <div>
                    <label className="auth-label">Confirm Password</label>
                    <div style={{ position: 'relative' }}>
                      <input className="auth-input" type={showConfirmPassword ? 'text' : 'password'} required placeholder="Confirm your password" style={{ paddingRight: 44 }} value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                        {showConfirmPassword ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                      </button>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={isLoading} className="auth-btn-primary" style={{ marginTop: 4 }}>
                  {isLoading ? (
                    <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                  ) : (
                    <>
                      {authMode === 'signup' ? <UserPlus style={{ width: 15, height: 15 }} /> : authMode === 'forgot-password' ? <KeyRound style={{ width: 15, height: 15 }} /> : <ArrowRight style={{ width: 15, height: 15 }} />}
                      {authMode === 'signup' ? 'Create Free Account' : authMode === 'forgot-password' ? 'Send Reset Link' : 'Log In'}
                    </>
                  )}
                </button>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </form>

            ) : (
              /* ===== PHONE / OTP METHOD ===== */
              otpSent ? (
                <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label className="auth-label">Verification Code (OTP)</label>
                    <input className="auth-input" type="text" required placeholder="e.g. 123456" value={otpValue} onChange={e => setOtpValue(e.target.value)} />
                  </div>
                  <button type="submit" disabled={isLoading} className="auth-btn-primary">
                    {isLoading ? <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> : <><KeyRound style={{ width: 15, height: 15 }} />Verify & Proceed</>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {authMode === 'signup' && (
                    <>
                      <div><label className="auth-label">Your Name</label><input className="auth-input" type="text" required placeholder="e.g. John Doe" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
                      <div><label className="auth-label">Company Name</label><input className="auth-input" type="text" required placeholder="e.g. Acme Tech Solutions" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} /></div>
                    </>
                  )}
                  <div>
                    <label className="auth-label">Phone Number</label>
                    <input className="auth-input" type="tel" required placeholder="e.g. +1 555 000 0000" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                  <button type="submit" disabled={isLoading} className="auth-btn-primary">
                    {isLoading ? <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> : <><Phone style={{ width: 15, height: 15 }} />Send Verification Code</>}
                  </button>
                </form>
              )
            )}
          </div>

          {/* Footer hint */}
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.78rem', color: '#64748b', fontFamily: "'IBM Plex Mono', monospace" }}>
            {authMode === 'signup' ? 'Already have an account? ' : 'New to MakInvoices? '}
            <button type="button"
              onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setOtpSent(false); setSuccessMsg(''); setFormErrors({}); }}
              style={{ color: '#0284c7', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>
              {authMode === 'signup' ? (
                <>
                  Log in
                  <ArrowRight style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginLeft: 2 }} />
                </>
              ) : (
                <>
                  Create an account
                  <ArrowRight style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginLeft: 2 }} />
                </>
              )}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
