import React, { useState } from 'react';
import {
  Moon, Sun, Bell, BellOff, Lock, Shield, Database,
  Trash2, Download, LogOut, ChevronRight, Check,
  Globe, Palette, FileText, RefreshCw, Eye, EyeOff,
  Smartphone, Monitor, Zap
} from 'lucide-react';
import { BusinessProfile } from '../types';

interface SettingsPageProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  profile: BusinessProfile;
  isPinLockEnabled: boolean;
  onToggleSecurity: (type: 'pin') => void;
  onLogout: () => void;
}

type SettingsSection = 'appearance' | 'notifications' | 'security' | 'data' | 'account';

const Row = ({ label, description, control }: { label: string; description?: string; control: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4 py-3.5 border-b border-[#e2e8f0]/30 dark:border-zinc-800 last:border-0">
    <div className="min-w-0 flex-1">
      <span className="text-xs font-bold text-[#0f172a] dark:text-zinc-200 block">{label}</span>
      {description && <span className="text-[10px] text-[#64748b]/75 dark:text-zinc-500 mt-0.5 block leading-normal">{description}</span>}
    </div>
    <div className="flex-shrink-0">{control}</div>
  </div>
);

const Toggle = ({ checked, onChange, onToggle }: { checked: boolean; onChange: () => void; onToggle?: () => void }) => (
  <button
    type="button"
    onClick={() => { onChange(); onToggle?.(); }}
    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer flex-shrink-0 ${
      checked ? 'bg-[#64748b]' : 'bg-[#e2e8f0] dark:bg-zinc-700'
    }`}
  >
    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
      checked ? 'translate-x-5' : 'translate-x-1'
    }`} />
  </button>
);

export default function SettingsPage({
  theme,
  toggleTheme,
  profile,
  isPinLockEnabled,
  onToggleSecurity,
  onLogout
}: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');
  const [notifInvoice, setNotifInvoice] = useState(true);
  const [notifReminders, setNotifReminders] = useState(true);
  const [notifCloud, setNotifCloud] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const showSaved = () => {
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  const sections: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
    { id: 'data', label: 'Data & Storage', icon: <Database className="w-4 h-4" /> },
    { id: 'account', label: 'Account', icon: <LogOut className="w-4 h-4" /> },
  ];





  return (
    <div className="space-y-6 animate-in fade-in duration-200 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-black text-[#0f172a] dark:text-white uppercase tracking-tight">App Settings</h1>
          <p className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 mt-0.5">Customize your workspace preferences</p>
        </div>
        {savedMsg && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-[10px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
            <Check className="w-3 h-3" /> Saved
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar navigation */}
        <div className="bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl shadow-xs p-3 h-fit">
          <nav className="space-y-0.5">
            {sections.map(sec => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all cursor-pointer ${
                  activeSection === sec.id
                    ? 'bg-[#EADFCF] dark:bg-zinc-800 text-[#0f172a] dark:text-white border-r-2 border-[#64748b]'
                    : 'text-[#64748b]/80 dark:text-zinc-400 hover:bg-[#f8fafc]/60 dark:hover:bg-zinc-800/40 hover:text-[#0f172a] dark:hover:text-white'
                }`}
              >
                {sec.icon}
                {sec.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content panel */}
        <div className="lg:col-span-3 bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-800 rounded-2xl shadow-xs p-6 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#e2e8f0] via-[#C6A87D] to-[#64748b]" />

          {/* APPEARANCE */}
          {activeSection === 'appearance' && (
            <div className="space-y-1">
              <h2 className="text-xs font-black text-[#0f172a] dark:text-white uppercase tracking-widest mb-5">Appearance</h2>
              <Row
                label="Theme Mode"
                description="Switch between light and dark workspace appearance"
                control={
                  <button
                    onClick={() => { toggleTheme(); showSaved(); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#e2e8f0] dark:border-zinc-700 bg-[#FCFAF7] dark:bg-zinc-950 text-xs font-bold text-[#0f172a] dark:text-zinc-200 hover:border-[#64748b] transition-colors cursor-pointer"
                  >
                    {theme === 'light' ? <><Moon className="w-3.5 h-3.5 text-[#64748b]" /> Dark Mode</> : <><Sun className="w-3.5 h-3.5 text-amber-500" /> Light Mode</>}
                  </button>
                }
              />
              <Row
                label="Compact Layout"
                description="Reduce spacing and padding for a denser workspace view"
                control={<Toggle checked={compactMode} onChange={() => setCompactMode(v => !v)} onToggle={showSaved} />}
              />
              <Row
                label="Invoice Font"
                description="Font applied to your generated invoice documents"
                control={
                  <span className="px-2.5 py-1 bg-[#FCFAF7] dark:bg-zinc-950 border border-[#e2e8f0]/60 dark:border-zinc-700 rounded-lg text-[10px] font-mono font-bold text-[#64748b]">
                    {profile.invoiceFont?.toUpperCase() || 'INTER'}
                  </span>
                }
              />
              <Row
                label="Invoice Layout Template"
                description="Design preset for your printable invoice sheets"
                control={
                  <span className="px-2.5 py-1 bg-[#FCFAF7] dark:bg-zinc-950 border border-[#e2e8f0]/60 dark:border-zinc-700 rounded-lg text-[10px] font-mono font-bold text-[#64748b] capitalize">
                    {profile.invoiceLayout || 'Modern'}
                  </span>
                }
              />
              <Row
                label="Currency Display"
                description="Primary currency used across invoices and reports"
                control={
                  <span className="px-2.5 py-1 bg-[#FCFAF7] dark:bg-zinc-950 border border-[#e2e8f0]/60 dark:border-zinc-700 rounded-lg text-[10px] font-mono font-bold text-[#64748b]">
                    {profile.currency || 'INR'}
                  </span>
                }
              />
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeSection === 'notifications' && (
            <div className="space-y-1">
              <h2 className="text-xs font-black text-[#0f172a] dark:text-white uppercase tracking-widest mb-5">Notifications</h2>
              <Row
                label="Invoice Activity Alerts"
                description="Get notified on invoice creation, edit, and deletion events"
                control={<Toggle checked={notifInvoice} onChange={() => setNotifInvoice(v => !v)} onToggle={showSaved} />}
              />
              <Row
                label="Payment Reminders"
                description="Receive smart reminders when invoices approach due dates"
                control={<Toggle checked={notifReminders} onChange={() => setNotifReminders(v => !v)} onToggle={showSaved} />}
              />
              <Row
                label="Cloud Sync Alerts"
                description="Notifications on successful or failed cloud synchronization"
                control={<Toggle checked={notifCloud} onChange={() => setNotifCloud(v => !v)} onToggle={showSaved} />}
              />
              <div className="mt-6 p-4 bg-[#FCFAF7] dark:bg-zinc-950 rounded-xl border border-[#e2e8f0]/40 dark:border-zinc-800">
                <span className="text-[9px] uppercase font-extrabold text-[#64748b] block mb-2">Notification Channels</span>
                <div className="flex gap-2 flex-wrap">
                  {['In-App', 'Browser Push', 'Email Digest'].map(ch => (
                    <span key={ch} className="px-2.5 py-1 bg-white dark:bg-zinc-900 border border-[#e2e8f0]/60 dark:border-zinc-700 rounded-lg text-[10px] font-bold text-[#0f172a] dark:text-zinc-300">
                      {ch}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECURITY */}
          {activeSection === 'security' && (
            <div className="space-y-1">
              <h2 className="text-xs font-black text-[#0f172a] dark:text-white uppercase tracking-widest mb-5">Security</h2>
              <Row
                label="PIN Passcode Lock"
                description="Require a 4-digit PIN each time the app is opened or refreshed"
                control={
                  <button
                    onClick={() => { onToggleSecurity('pin'); showSaved(); }}
                    className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      isPinLockEnabled
                        ? 'bg-rose-500 hover:bg-rose-600 text-white'
                        : 'bg-[#EADFCF] hover:bg-[#e2e8f0] text-[#0f172a]'
                    }`}
                  >
                    {isPinLockEnabled ? 'Disable' : 'Enable'}
                  </button>
                }
              />
              <Row
                label="Auto-Save Drafts"
                description="Automatically save invoice drafts while editing to prevent data loss"
                control={<Toggle checked={autoSave} onChange={() => setAutoSave(v => !v)} onToggle={showSaved} />}
              />
              <div className="mt-6 p-4 bg-[#FCFAF7] dark:bg-zinc-950 rounded-xl border border-[#e2e8f0]/40 dark:border-zinc-800 space-y-3">
                <span className="text-[9px] uppercase font-extrabold text-[#64748b] block">Active Session</span>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#f8fafc] dark:bg-zinc-800 flex items-center justify-center">
                    <Monitor className="w-4 h-4 text-[#64748b]" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#0f172a] dark:text-zinc-200 block">Web Browser</span>
                    <span className="text-[9.5px] text-[#64748b]/75 dark:text-zinc-500 font-mono">{profile.email || 'Local Session'}</span>
                  </div>
                  <span className="ml-auto text-[9px] font-bold text-emerald-500 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-full border border-emerald-200 dark:border-emerald-800">Active</span>
                </div>
              </div>
            </div>
          )}

          {/* DATA */}
          {activeSection === 'data' && (
            <div className="space-y-1">
              <h2 className="text-xs font-black text-[#0f172a] dark:text-white uppercase tracking-widest mb-5">Data & Storage</h2>
              <Row
                label="Local Database"
                description="Your invoices and settings stored in browser local storage"
                control={<span className="text-[10px] font-mono font-bold text-emerald-500">Active</span>}
              />
              <Row
                label="Cloud Synchronization"
                description="Real-time data backup across your devices via Supabase"
                control={<span className="text-[10px] font-mono font-bold text-emerald-500">Synced</span>}
              />
              <div className="mt-4 space-y-2">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#FCFAF7] dark:bg-zinc-950 border border-[#e2e8f0]/40 dark:border-zinc-800 rounded-xl hover:border-[#64748b]/40 transition-colors cursor-pointer group"
                  onClick={showSaved}
                >
                  <div className="flex items-center gap-3">
                    <Download className="w-4 h-4 text-[#64748b]" />
                    <div className="text-left">
                      <span className="text-xs font-bold text-[#0f172a] dark:text-zinc-200 block">Export All Data</span>
                      <span className="text-[9.5px] text-[#64748b]/70 dark:text-zinc-500">Download invoices, clients and settings as JSON</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#64748b]/50 group-hover:text-[#64748b] transition-colors" />
                </button>
                <button
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#FCFAF7] dark:bg-zinc-950 border border-[#e2e8f0]/40 dark:border-zinc-800 rounded-xl hover:border-[#64748b]/40 transition-colors cursor-pointer group"
                  onClick={showSaved}
                >
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-4 h-4 text-[#64748b]" />
                    <div className="text-left">
                      <span className="text-xs font-bold text-[#0f172a] dark:text-zinc-200 block">Force Cloud Sync</span>
                      <span className="text-[9.5px] text-[#64748b]/70 dark:text-zinc-500">Push all local changes to cloud immediately</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#64748b]/50 group-hover:text-[#64748b] transition-colors" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 rounded-xl hover:border-rose-400 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-4 h-4 text-rose-500" />
                    <div className="text-left">
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block">Clear Local Cache</span>
                      <span className="text-[9.5px] text-rose-400/70 dark:text-rose-600">Remove all locally cached data (irreversible)</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-400/50 group-hover:text-rose-500 transition-colors" />
                </button>
              </div>
              {showDeleteConfirm && (
                <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-xl">
                  <p className="text-xs font-bold text-rose-700 dark:text-rose-300 mb-3">Are you sure? This will remove all local data permanently.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { localStorage.clear(); setShowDeleteConfirm(false); showSaved(); }}
                      className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase rounded-xl cursor-pointer transition-colors"
                    >
                      Yes, Clear All
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-800 text-rose-600 text-[10px] font-black uppercase rounded-xl cursor-pointer transition-colors hover:bg-rose-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ACCOUNT */}
          {activeSection === 'account' && (
            <div className="space-y-1">
              <h2 className="text-xs font-black text-[#0f172a] dark:text-white uppercase tracking-widest mb-5">Account</h2>
              <div className="p-4 bg-[#FCFAF7] dark:bg-zinc-950 rounded-xl border border-[#e2e8f0]/40 dark:border-zinc-800 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0f172a] text-white flex items-center justify-center font-black text-sm flex-shrink-0">
                    {profile.name ? profile.name.charAt(0).toUpperCase() : 'M'}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#0f172a] dark:text-zinc-200 block">{profile.name || 'MakInvoice User'}</span>
                    <span className="text-[10px] text-[#64748b]/75 dark:text-zinc-500 font-mono">{profile.email || 'Local account'}</span>
                  </div>
                  <span className="ml-auto text-[9px] font-bold text-emerald-500 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-full border border-emerald-200 dark:border-emerald-800">
                    {profile.email ? 'Cloud' : 'Local'}
                  </span>
                </div>
              </div>
              <Row
                label="App Version"
                description="Current installed version of MakInvoices"
                control={<span className="text-[10px] font-mono font-bold text-[#64748b]">v1.2.0</span>}
              />
              <Row
                label="Platform"
                description="Application environment"
                control={<span className="text-[10px] font-mono font-bold text-[#64748b]">Web Browser</span>}
              />
              <div className="mt-6 pt-4 border-t border-[#e2e8f0]/30 dark:border-zinc-800">
                <button
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-black text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-colors cursor-pointer uppercase tracking-wider"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out of Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
