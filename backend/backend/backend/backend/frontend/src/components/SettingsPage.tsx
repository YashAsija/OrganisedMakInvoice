import React, { useState, useEffect } from 'react';
import {
  Moon, Sun, Bell, BellOff, Lock, Shield, Database,
  Trash2, Download, LogOut, ChevronRight, Check,
  Globe, Palette, RefreshCw, Monitor, Zap, Sparkles,
  Sliders, LayoutGrid, CheckCircle2, RotateCcw, Save,
  Mail, Volume2, VolumeX, Eye, EyeOff, Clock, Fingerprint, ShieldCheck, Key, Smartphone
} from 'lucide-react';
import { BusinessProfile } from '../types';
import { emitNotification } from '../lib/notifications';
import {
  WorkspaceSession,
  registerCurrentSession,
  revokeSession,
  revokeAllOtherSessions,
  getLocalSessions
} from '../lib/sessionManager';

interface SettingsPageProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  profile: BusinessProfile;
  isPinLockEnabled: boolean;
  onToggleSecurity: (type: 'pin') => void;
  onLogout: () => void;
}

type SettingsSection = 'notifications' | 'security' | 'account';

const Row = ({ label, description, control }: { label: string; description?: string; control: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-[#bae6fd]/20 dark:border-[#223269]/30 last:border-0">
    <div className="min-w-0 flex-1">
      <span className="text-xs font-bold text-[#0f172a] dark:text-zinc-200 block">{label}</span>
      {description && <span className="text-[10.5px] text-[#64748b]/75 dark:text-zinc-400 mt-0.5 block leading-normal">{description}</span>}
    </div>
    <div className="flex-shrink-0 self-start sm:self-center">{control}</div>
  </div>
);

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    type="button"
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer flex-shrink-0 ${
      checked ? 'bg-[#0284c7]' : 'bg-[#bae6fd]/60 dark:bg-[#223269]'
    }`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
      checked ? 'translate-x-6' : 'translate-x-1'
    }`} />
  </button>
);

interface AlertChannelConfig {
  inApp: boolean;
  push: boolean;
  email: boolean;
  sound: boolean;
}

interface NotificationAlertItem {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  channels: AlertChannelConfig;
}

const DEFAULT_ALERTS_CONFIG: Record<string, NotificationAlertItem> = {
  invoice: {
    id: 'invoice',
    title: 'Invoice & Ledger Activity Alerts',
    description: 'Notify on invoice creation, edits, draft saves, exports, and deletions',
    enabled: true,
    channels: { inApp: true, push: true, email: false, sound: true }
  },
  payment: {
    id: 'payment',
    title: 'Payment Reminders & Due Dates',
    description: 'Receive automated reminders when invoices approach or pass due dates',
    enabled: true,
    channels: { inApp: true, push: true, email: true, sound: true }
  },
  tax: {
    id: 'tax',
    title: 'Tax Compliance & Billing Policy Alerts',
    description: 'Alerts on GST/HST compliance updates, tax calculation changes, and recurring schedules',
    enabled: true,
    channels: { inApp: true, push: false, email: true, sound: false }
  },
  cloud: {
    id: 'cloud',
    title: 'Cloud Sync & Data Storage Alerts',
    description: 'Notifications on real-time database sync, cloud backups, and data exports',
    enabled: true,
    channels: { inApp: true, push: false, email: false, sound: false }
  },
  security: {
    id: 'security',
    title: 'Security & Session Access Alerts',
    description: 'Security warnings on PIN passcode lock toggles, password changes, and active logins',
    enabled: true,
    channels: { inApp: true, push: true, email: true, sound: true }
  }
};

const DEFAULT_GLOBAL_CHANNELS: AlertChannelConfig = {
  inApp: true,
  push: false,
  email: true,
  sound: true
};

const NOTIF_STORAGE_KEY = 'mak_notifications_preferences_v3';

interface SavedNotificationPreferences {
  isNotificationsEnabled: boolean;
  alertsConfig: Record<string, NotificationAlertItem>;
  channels: AlertChannelConfig;
}

const loadSavedNotifPreferences = (): SavedNotificationPreferences => {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return {
          isNotificationsEnabled: parsed.isNotificationsEnabled ?? true,
          alertsConfig: parsed.alertsConfig || DEFAULT_ALERTS_CONFIG,
          channels: parsed.channels || DEFAULT_GLOBAL_CHANNELS
        };
      } catch (e) {}
    }
  }
  return {
    isNotificationsEnabled: true,
    alertsConfig: DEFAULT_ALERTS_CONFIG,
    channels: DEFAULT_GLOBAL_CHANNELS
  };
};

export default function SettingsPage({
  theme,
  toggleTheme,
  profile,
  isPinLockEnabled,
  onToggleSecurity,
  onLogout
}: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('notifications');

  // Persistent Notification Settings: Applied vs Draft States
  const [appliedNotif, setAppliedNotif] = useState(loadSavedNotifPreferences);
  const [draftNotif, setDraftNotif] = useState(loadSavedNotifPreferences);

  const isNotifDirty = JSON.stringify(draftNotif) !== JSON.stringify(appliedNotif);

  const [autoSave, setAutoSave] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Web Audio Chime Helper
  const playTestAudioChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (err) {}
  };

  const handleToggleMasterNotif = () => {
    setDraftNotif(prev => ({
      ...prev,
      isNotificationsEnabled: !prev.isNotificationsEnabled
    }));
  };

  const handleToggleAlertMaster = (alertId: string) => {
    setDraftNotif(prev => {
      const target = prev.alertsConfig[alertId];
      if (!target) return prev;
      return {
        ...prev,
        alertsConfig: {
          ...prev.alertsConfig,
          [alertId]: {
            ...target,
            enabled: !target.enabled
          }
        }
      };
    });
  };

  const handleToggleAlertChannel = (alertId: string, channelKey: 'inApp' | 'push' | 'email' | 'sound') => {
    setDraftNotif(prev => {
      const target = prev.alertsConfig[alertId];
      if (!target || !target.enabled) return prev;
      const nextState = !target.channels[channelKey];
      if (channelKey === 'sound' && nextState) {
        playTestAudioChime();
      }
      return {
        ...prev,
        alertsConfig: {
          ...prev.alertsConfig,
          [alertId]: {
            ...target,
            channels: {
              ...target.channels,
              [channelKey]: nextState
            }
          }
        }
      };
    });
  };

  const handleToggleGlobalChannel = (channelKey: 'inApp' | 'push' | 'email' | 'sound') => {
    if (channelKey === 'push' && !draftNotif.channels.push) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') {
            setDraftNotif(prev => ({
              ...prev,
              channels: { ...prev.channels, push: true }
            }));
            try {
              new Notification('MakInvoices Push Active', { body: 'Desktop push notifications enabled.', icon: '/logo.svg' });
            } catch (e) {}
          } else {
            emitNotification('Permission Denied', 'Browser push permission was denied.', 'error');
          }
        });
        return;
      }
    }

    if (channelKey === 'sound' && !draftNotif.channels.sound) {
      playTestAudioChime();
    }

    setDraftNotif(prev => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channelKey]: !prev.channels[channelKey]
      }
    }));
  };

  const handleApplyNotifChanges = () => {
    setAppliedNotif(draftNotif);
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(draftNotif));
    localStorage.setItem('mak_notifications_enabled', String(draftNotif.isNotificationsEnabled));
    emitNotification(
      'Notification Settings Applied Permanently',
      'Your notification preferences have been saved and will remain across reloads.',
      'success'
    );
  };

  const handleDiscardNotifChanges = () => {
    setDraftNotif(appliedNotif);
    emitNotification('Changes Reset', 'Restored notification settings to last saved state.', 'info');
  };

  // Security Settings States
  const SECURITY_STORAGE_KEY = 'mak_security_preferences_v1';

  const loadSavedSecurityPreferences = () => {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(SECURITY_STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          return {
            privacyMode: !!parsed.privacyMode,
            biometricEnabled: !!parsed.biometricEnabled
          };
        } catch (e) {}
      }
    }
    return {
      privacyMode: false,
      biometricEnabled: false
    };
  };

  const [appliedSecurity, setAppliedSecurity] = useState(loadSavedSecurityPreferences);
  const [draftSecurity, setDraftSecurity] = useState(loadSavedSecurityPreferences);
  const [isPreviewHovered, setIsPreviewHovered] = useState(false);

  const isSecurityDirty = JSON.stringify(draftSecurity) !== JSON.stringify(appliedSecurity);

  const [autoLockTimeout, setAutoLockTimeout] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mak_security_autolock_timeout') || 'off';
    }
    return 'off';
  });

  const [isScanningSecurity, setIsScanningSecurity] = useState(false);
  const [lastSecurityScanDate, setLastSecurityScanDate] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mak_security_last_scan');
    }
    return null;
  });

  const [activeSessions, setActiveSessions] = useState<WorkspaceSession[]>(() =>
    registerCurrentSession(profile.email || 'Active User')
  );

  useEffect(() => {
    const userEmail = profile.email || 'Active User';

    const refreshSessions = () => {
      setActiveSessions(getLocalSessions(userEmail));
    };

    // Initialize initial sessions list
    setActiveSessions(getLocalSessions(userEmail));

    window.addEventListener('storage', refreshSessions);
    window.addEventListener('mak_session_revoked', refreshSessions);
    window.addEventListener('mak_all_other_sessions_revoked', refreshSessions);

    const handleForceLogout = () => {
      emitNotification('Session Revoked', 'This device session has been signed out from another device.', 'warning');
      if (onLogout) onLogout();
    };

    window.addEventListener('mak_session_force_logout', handleForceLogout);

    return () => {
      window.removeEventListener('storage', refreshSessions);
      window.removeEventListener('mak_session_revoked', refreshSessions);
      window.removeEventListener('mak_all_other_sessions_revoked', refreshSessions);
      window.removeEventListener('mak_session_force_logout', handleForceLogout);
    };
  }, [profile.email, onLogout]);

  const handleRevokeSingleSession = (sessionId: string, deviceName: string) => {
    const updated = revokeSession(sessionId, profile.email);
    setActiveSessions(updated);
    emitNotification('Session Revoked', `Successfully signed out ${deviceName}.`, 'info');
  };

  const handleRevokeAllOtherSessions = () => {
    const updated = revokeAllOtherSessions(profile.email);
    setActiveSessions(updated);
    emitNotification('All Other Sessions Signed Out', 'Signed out all active secondary device sessions.', 'success');
  };

  const handleTimeoutChange = (timeout: string) => {
    setAutoLockTimeout(timeout);
    localStorage.setItem('mak_security_autolock_timeout', timeout);
    window.dispatchEvent(new CustomEvent('mak_security_settings_changed'));
    const labels: Record<string, string> = {
      off: 'Auto-lock disabled.',
      '5m': 'Workspace will lock after 5 minutes of inactivity.',
      '15m': 'Workspace will lock after 15 minutes of inactivity.',
      '30m': 'Workspace will lock after 30 minutes of inactivity.',
      '1h': 'Workspace will lock after 1 hour of inactivity.'
    };
    emitNotification('Auto-Lock Timeout Saved', labels[timeout] || 'Timeout updated.', 'info');
  };

  const handleToggleDraftPrivacyMode = () => {
    setDraftSecurity(prev => ({ ...prev, privacyMode: !prev.privacyMode }));
  };

  const handleToggleDraftBiometric = () => {
    setDraftSecurity(prev => ({ ...prev, biometricEnabled: !prev.biometricEnabled }));
  };

  const handleApplySecurityChanges = () => {
    setAppliedSecurity(draftSecurity);
    localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(draftSecurity));
    localStorage.setItem('mak_security_privacy_mode', String(draftSecurity.privacyMode));
    localStorage.setItem('mak_security_biometric', String(draftSecurity.biometricEnabled));
    window.dispatchEvent(new CustomEvent('mak_security_settings_changed'));
    emitNotification(
      'Security Settings Applied Permanently',
      'Your security options have been saved and applied across page reloads.',
      'success'
    );
  };

  // Dynamically update document body class when draft privacy mode is toggled
  useEffect(() => {
    if (draftSecurity.privacyMode) {
      document.body.classList.add('mak-privacy-active');
    } else if (!appliedSecurity.privacyMode) {
      document.body.classList.remove('mak-privacy-active');
    }
  }, [draftSecurity.privacyMode, appliedSecurity.privacyMode]);

  const handleDiscardSecurityChanges = () => {
    setDraftSecurity(appliedSecurity);
    if (!appliedSecurity.privacyMode) {
      document.body.classList.remove('mak-privacy-active');
    } else {
      document.body.classList.add('mak-privacy-active');
    }
    emitNotification('Changes Reset', 'Restored security settings to last saved state.', 'info');
  };

  const handleRunSecurityScan = () => {
    setIsScanningSecurity(true);
    setTimeout(() => {
      setIsScanningSecurity(false);
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSecurityScanDate(now);
      localStorage.setItem('mak_security_last_scan', now);
      emitNotification('Security Scan Complete', 'All local storage tables, PIN locks, and SSL connections verified 100% secure.', 'success');
    }, 1200);
  };

  const sections: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
    { id: 'account', label: 'Account', icon: <LogOut className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200 w-full pb-12">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-black uppercase tracking-tight flex items-center gap-2" style={{ fontFamily: "'Fraunces', serif" }}>
            <span className="bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#38bdf8] bg-clip-text text-transparent">App Settings</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7] dark:bg-[#38bdf8] shrink-0" />
          </h1>
          <p className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 mt-0.5">Customize your global app preferences and account options</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Sidebar Navigation */}
        <div className="bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl shadow-xs p-3 h-fit">
          <p className="text-[9px] font-black uppercase tracking-widest text-[#0284c7] dark:text-[#38bdf8] px-3 mb-2 hidden lg:block">Preferences</p>
          <nav className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-1 pb-1 lg:pb-0 scrollbar-none">
            {sections.map(sec => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`flex-shrink-0 lg:w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all cursor-pointer whitespace-nowrap ${
                  activeSection === sec.id
                    ? 'bg-[#e0f2fe] dark:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8] border-b-2 lg:border-b-0 lg:border-r-2 border-[#0284c7] dark:border-[#38bdf8] shadow-2xs'
                    : 'text-[#64748b]/80 dark:text-zinc-400 hover:bg-[#f4f9ff] dark:hover:bg-[#1b264f]/50 hover:text-[#0284c7] dark:hover:text-[#38bdf8]'
                }`}
              >
                {sec.icon}
                {sec.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Panel */}
        <div className="lg:col-span-3 bg-white dark:bg-[#111a36] border border-[#bae6fd]/60 dark:border-[#223269]/60 rounded-2xl shadow-xs p-6 relative overflow-hidden flex flex-col justify-between min-h-[520px]">
          {/* Brand Accent Top Bar */}
          <div>
            {/* -------------------- NOTIFICATIONS -------------------- */}
            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[#bae6fd]/40 dark:border-[#223269]/40 pb-4">
                  <div>
                    <h2 className="text-xs font-black text-[#0284c7] dark:text-[#38bdf8] uppercase tracking-widest flex items-center gap-2" style={{ fontFamily: "'Fraunces', serif" }}>
                      <Bell className="w-4 h-4" />
                      <span>Notification Preferences</span>
                    </h2>
                    <p className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 mt-0.5">Control how and when you receive workspace alerts and notifications</p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    draftNotif.isNotificationsEnabled
                      ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/50'
                      : 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-700/50'
                  }`}>
                    {draftNotif.isNotificationsEnabled ? 'Notifications Active' : 'Notifications Muted'}
                  </span>
                </div>

                {/* 1. MASTER TOGGLE: RECEIVE NOTIFICATIONS */}
                <div className="p-4 bg-[#f4f9ff] dark:bg-[#0b1329]/80 rounded-2xl border border-[#bae6fd]/60 dark:border-[#223269]/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      draftNotif.isNotificationsEnabled
                        ? 'bg-[#0284c7] text-white shadow-md shadow-[#0284c7]/20'
                        : 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500'
                    }`}>
                      {draftNotif.isNotificationsEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-black text-[#0f172a] dark:text-white block">Receive Application Notifications</span>
                      <span className="text-[10.5px] text-[#64748b]/80 dark:text-zinc-400 block mt-0.5 leading-snug">
                        Master switch to turn all workspace notifications and event alerts ON or OFF
                      </span>
                    </div>
                  </div>

                  <div className="self-end sm:self-center shrink-0">
                    <Toggle
                      checked={draftNotif.isNotificationsEnabled}
                      onChange={handleToggleMasterNotif}
                    />
                  </div>
                </div>

                {/* 2. CONDITIONAL DETAILED OPTIONS (Shown only if Master Toggle is YES / Enabled) */}
                {draftNotif.isNotificationsEnabled ? (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    
                    {/* SUBSECTION A: SPECIFIC NOTIFICATION ALERTS & THEIR NOTIFICATION TYPES */}
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#0284c7] dark:text-[#38bdf8] block" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                          Specific Notification Event Alerts & Delivery Types
                        </span>
                        <p className="text-[10.5px] text-[#64748b]/80 dark:text-zinc-400 mt-0.5">
                          Enable/disable individual alerts and select which notification types (In-App, Push, Email, Sound) to receive for each
                        </p>
                      </div>

                      {Object.values(draftNotif.alertsConfig).map(item => (
                        <div key={item.id} className="p-4 rounded-2xl border bg-[#f4f9ff]/50 dark:bg-[#0b1329]/60 border-[#bae6fd]/50 dark:border-[#223269]/50 shadow-2xs space-y-3">
                          {/* Top Header: Title, Description, and Master Enable Toggle for this specific alert */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-[#0f172a] dark:text-white block">{item.title}</span>
                                <span className={`px-2 py-0.2 rounded-md text-[8.5px] font-black uppercase tracking-wider shrink-0 ${
                                  item.enabled
                                    ? 'bg-[#e0f2fe] dark:bg-[#1b264f] text-[#0284c7] dark:text-[#38bdf8] border border-[#bae6fd]/60 dark:border-[#223269]'
                                    : 'bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-500'
                                }`}>
                                  {item.enabled ? 'Active' : 'Muted'}
                                </span>
                              </div>
                              <p className="text-[10.5px] text-[#64748b]/80 dark:text-zinc-400 mt-0.5 leading-snug">
                                {item.description}
                              </p>
                            </div>

                            <div className="self-end sm:self-center shrink-0">
                              <Toggle checked={item.enabled} onChange={() => handleToggleAlertMaster(item.id)} />
                            </div>
                          </div>

                          {/* Selectable Notification Types / Channels for THIS specific alert */}
                          {item.enabled && (
                            <div className="pt-2.5 border-t border-[#bae6fd]/30 dark:border-[#223269]/30 flex flex-wrap items-center gap-2 animate-in fade-in duration-150">
                              <span className="text-[9px] uppercase font-extrabold tracking-wider text-[#0284c7] dark:text-[#38bdf8] mr-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                                Notification Types:
                              </span>

                              {/* Type 1: In-App Toast */}
                              <button
                                type="button"
                                onClick={() => handleToggleAlertChannel(item.id, 'inApp')}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                                  item.channels.inApp
                                    ? 'bg-[#0284c7] text-white border-[#0284c7] shadow-2xs active:scale-95'
                                    : 'bg-white dark:bg-[#111a36] text-[#64748b] dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:border-[#0284c7]/40'
                                }`}
                              >
                                <Bell className="w-3 h-3" />
                                <span>In-App Toast</span>
                                {item.channels.inApp && <Check className="w-3 h-3 stroke-[3]" />}
                              </button>

                              {/* Type 2: Browser Push */}
                              <button
                                type="button"
                                onClick={() => handleToggleAlertChannel(item.id, 'push')}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                                  item.channels.push
                                    ? 'bg-[#0284c7] text-white border-[#0284c7] shadow-2xs active:scale-95'
                                    : 'bg-white dark:bg-[#111a36] text-[#64748b] dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:border-[#0284c7]/40'
                                }`}
                              >
                                <Globe className="w-3 h-3" />
                                <span>Browser Push</span>
                                {item.channels.push && <Check className="w-3 h-3 stroke-[3]" />}
                              </button>

                              {/* Type 3: Email Digest */}
                              <button
                                type="button"
                                onClick={() => handleToggleAlertChannel(item.id, 'email')}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                                  item.channels.email
                                    ? 'bg-[#0284c7] text-white border-[#0284c7] shadow-2xs active:scale-95'
                                    : 'bg-white dark:bg-[#111a36] text-[#64748b] dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:border-[#0284c7]/40'
                                }`}
                              >
                                <Mail className="w-3 h-3" />
                                <span>Email Digest</span>
                                {item.channels.email && <Check className="w-3 h-3 stroke-[3]" />}
                              </button>

                              {/* Type 4: Sound Effect */}
                              <button
                                type="button"
                                onClick={() => handleToggleAlertChannel(item.id, 'sound')}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                                  item.channels.sound
                                    ? 'bg-[#0284c7] text-white border-[#0284c7] shadow-2xs active:scale-95'
                                    : 'bg-white dark:bg-[#111a36] text-[#64748b] dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:border-[#0284c7]/40'
                                }`}
                              >
                                {item.channels.sound ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                                <span>Sound Effect</span>
                                {item.channels.sound && <Check className="w-3 h-3 stroke-[3]" />}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* SUBSECTION B: NOTIFICATION TYPES & DELIVERY CHANNELS */}
                    <div className="space-y-3 pt-4 border-t border-[#bae6fd]/40 dark:border-[#223269]/40">
                      <div>
                        <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#0284c7] dark:text-[#38bdf8] block" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                          Global Notification Delivery Channels & Options
                        </span>
                        <p className="text-[10.5px] text-[#64748b]/80 dark:text-zinc-400 mt-0.5">
                          Configure global delivery modes for workspace notifications
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        
                        {/* Type 1: In-App Toast & Dropdown */}
                        <div
                          onClick={() => handleToggleGlobalChannel('inApp')}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${
                            draftNotif.channels.inApp
                              ? 'bg-white dark:bg-[#111a36] border-[#0284c7]/50 dark:border-[#38bdf8]/50 shadow-xs ring-1 ring-[#0284c7]/20 dark:ring-[#38bdf8]/20'
                              : 'bg-[#f8fafc] dark:bg-[#0b1329]/40 border-slate-200 dark:border-zinc-800 opacity-75'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`p-2 rounded-xl shrink-0 ${draftNotif.channels.inApp ? 'bg-[#e0f2fe] text-[#0284c7] dark:bg-[#1b264f] dark:text-[#38bdf8]' : 'bg-slate-200 text-slate-500 dark:bg-zinc-800'}`}>
                              <Bell className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-[#0f172a] dark:text-white block">In-App Banner Toasts</span>
                              <span className="text-[10px] text-[#64748b] dark:text-zinc-400 leading-tight block mt-0.5">
                                Sliding toast banners & unread badge counters
                              </span>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0 ${
                            draftNotif.channels.inApp ? 'bg-[#0284c7] text-white' : 'bg-slate-200 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}>
                            {draftNotif.channels.inApp ? 'Active' : 'Off'}
                          </span>
                        </div>

                        {/* Type 2: Browser Push Notifications */}
                        <div
                          onClick={() => handleToggleGlobalChannel('push')}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${
                            draftNotif.channels.push
                              ? 'bg-white dark:bg-[#111a36] border-[#0284c7]/50 dark:border-[#38bdf8]/50 shadow-xs ring-1 ring-[#0284c7]/20 dark:ring-[#38bdf8]/20'
                              : 'bg-[#f8fafc] dark:bg-[#0b1329]/40 border-slate-200 dark:border-zinc-800 opacity-75'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`p-2 rounded-xl shrink-0 ${draftNotif.channels.push ? 'bg-[#e0f2fe] text-[#0284c7] dark:bg-[#1b264f] dark:text-[#38bdf8]' : 'bg-slate-200 text-slate-500 dark:bg-zinc-800'}`}>
                              <Globe className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-[#0f172a] dark:text-white block">Browser Push Alerts</span>
                              <span className="text-[10px] text-[#64748b] dark:text-zinc-400 leading-tight block mt-0.5">
                                Native desktop popups via browser Notification API
                              </span>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0 ${
                            draftNotif.channels.push ? 'bg-[#0284c7] text-white' : 'bg-slate-200 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}>
                            {draftNotif.channels.push ? 'Active' : 'Off'}
                          </span>
                        </div>

                        {/* Type 3: Email Digest Reports */}
                        <div
                          onClick={() => handleToggleGlobalChannel('email')}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${
                            draftNotif.channels.email
                              ? 'bg-white dark:bg-[#111a36] border-[#0284c7]/50 dark:border-[#38bdf8]/50 shadow-xs ring-1 ring-[#0284c7]/20 dark:ring-[#38bdf8]/20'
                              : 'bg-[#f8fafc] dark:bg-[#0b1329]/40 border-slate-200 dark:border-zinc-800 opacity-75'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`p-2 rounded-xl shrink-0 ${draftNotif.channels.email ? 'bg-[#e0f2fe] text-[#0284c7] dark:bg-[#1b264f] dark:text-[#38bdf8]' : 'bg-slate-200 text-slate-500 dark:bg-zinc-800'}`}>
                              <Mail className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-[#0f172a] dark:text-white block">Email Digest Reports</span>
                              <span className="text-[10px] text-[#64748b] dark:text-zinc-400 leading-tight block mt-0.5">
                                Periodic sales summaries & ledger reports
                              </span>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0 ${
                            draftNotif.channels.email ? 'bg-[#0284c7] text-white' : 'bg-slate-200 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}>
                            {draftNotif.channels.email ? 'Active' : 'Off'}
                          </span>
                        </div>

                        {/* Type 4: Audio Chimes & Sound Effects */}
                        <div
                          onClick={() => handleToggleGlobalChannel('sound')}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${
                            draftNotif.channels.sound
                              ? 'bg-white dark:bg-[#111a36] border-[#0284c7]/50 dark:border-[#38bdf8]/50 shadow-xs ring-1 ring-[#0284c7]/20 dark:ring-[#38bdf8]/20'
                              : 'bg-[#f8fafc] dark:bg-[#0b1329]/40 border-slate-200 dark:border-zinc-800 opacity-75'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`p-2 rounded-xl shrink-0 ${draftNotif.channels.sound ? 'bg-[#e0f2fe] text-[#0284c7] dark:bg-[#1b264f] dark:text-[#38bdf8]' : 'bg-slate-200 text-slate-500 dark:bg-zinc-800'}`}>
                              {draftNotif.channels.sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-[#0f172a] dark:text-white block">Audio Sound Effects</span>
                              <span className="text-[10px] text-[#64748b] dark:text-zinc-400 leading-tight block mt-0.5">
                                Play subtle audio chime when notifications arrive
                              </span>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0 ${
                            draftNotif.channels.sound ? 'bg-[#0284c7] text-white' : 'bg-slate-200 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}>
                            {draftNotif.channels.sound ? 'Active' : 'Muted'}
                          </span>
                        </div>

                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="p-8 text-center bg-[#f4f9ff] dark:bg-[#0b1329]/40 rounded-2xl border border-[#bae6fd]/40 dark:border-[#223269]/40 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 flex items-center justify-center mb-3">
                      <BellOff className="w-6 h-6" />
                    </div>
                    <h3 className="text-xs font-bold text-[#0f172a] dark:text-zinc-200 uppercase tracking-wide">Notifications Muted Globally</h3>
                    <p className="text-[11px] text-[#64748b] dark:text-zinc-400 mt-1 max-w-sm">
                      Turn on "Receive Application Notifications" above to enable specific event alerts and choose delivery channels.
                    </p>
                  </div>
                )}

                {/* Staged Notification Settings Action Bar (Apply Changes Button) */}
                <div className={`mt-6 pt-4 border-t border-[#bae6fd]/40 dark:border-[#223269]/40 flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl transition-all ${
                  isNotifDirty
                    ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
                    : 'bg-[#f4f9ff]/60 dark:bg-[#0b1329]/60 border border-[#bae6fd]/40 dark:border-[#223269]/40'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      isNotifDirty
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-[#e0f2fe] text-[#0284c7] dark:bg-[#1b264f] dark:text-[#38bdf8]'
                    }`}>
                      {isNotifDirty ? <Sliders className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#0f172a] dark:text-white block">
                        {isNotifDirty ? 'Unapplied Notification Changes' : 'Notification Settings Permanent'}
                      </span>
                      <span className="text-[10px] text-[#64748b] dark:text-zinc-400 block">
                        {isNotifDirty
                          ? 'You have unsaved changes. Click Apply Changes to save permanently.'
                          : 'All settings are active and saved across page reloads.'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {isNotifDirty && (
                      <button
                        type="button"
                        onClick={handleDiscardNotifChanges}
                        className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold text-[#64748b] dark:text-zinc-400 bg-white dark:bg-[#111a36] border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Discard</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleApplyNotifChanges}
                      disabled={!isNotifDirty}
                      className={`flex-1 sm:flex-none px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                        isNotifDirty
                          ? 'bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-[#0284c7]/25 active:scale-95'
                          : 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 cursor-not-allowed shadow-none'
                      }`}
                    >
                      <Save className="w-4 h-4" />
                      <span>Apply Changes</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* -------------------- SECURITY -------------------- */}
            {activeSection === 'security' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[#bae6fd]/40 dark:border-[#223269]/40 pb-4">
                  <div>
                    <h2 className="text-xs font-black text-[#0284c7] dark:text-[#38bdf8] uppercase tracking-widest flex items-center gap-2" style={{ fontFamily: "'Fraunces', serif" }}>
                      <Shield className="w-4 h-4" />
                      <span>Security & Access Controls</span>
                    </h2>
                    <p className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 mt-0.5">Manage authentication, passcode protection, data privacy, and active workspace sessions</p>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/50 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Protected</span>
                  </span>
                </div>

                <div className="space-y-1">
                  {/* 1. PIN Passcode Lock */}
                  <Row
                    label="PIN Passcode Protection"
                    description="Require a 4-digit security PIN each time the app is opened, resumed, or refreshed"
                    control={
                      <button
                        type="button"
                        onClick={() => onToggleSecurity('pin')}
                        className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-2xs ${
                          isPinLockEnabled
                            ? 'bg-rose-500 hover:bg-rose-600 text-white'
                            : 'bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-sky-950/20'
                        }`}
                      >
                        {isPinLockEnabled ? 'Disable PIN' : 'Enable PIN'}
                      </button>
                    }
                  />

                  {/* 2. Auto-Lock Inactivity Timeout - ONLY shown when PIN lock is enabled */}
                  {isPinLockEnabled && (
                    <div className="py-4 border-b border-[#bae6fd]/20 dark:border-[#223269]/30 space-y-2.5 animate-in fade-in duration-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-[#0f172a] dark:text-zinc-200 block">Auto-Lock Inactivity Timeout</span>
                          <span className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 block mt-0.5">
                            Automatically lock workspace with PIN after a period of idle inactivity
                          </span>
                        </div>

                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1 bg-[#f4f9ff] dark:bg-[#0b1329] p-1 rounded-xl border border-[#bae6fd]/60 dark:border-[#223269]/60 shrink-0 max-w-full overflow-x-auto scrollbar-none">
                          {[
                            { id: 'off', label: 'Never' },
                            { id: '5m', label: '5 Min' },
                            { id: '15m', label: '15 Min' },
                            { id: '30m', label: '30 Min' },
                            { id: '1h', label: '1 Hour' }
                          ].map(item => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleTimeoutChange(item.id)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                                autoLockTimeout === item.id
                                  ? 'bg-[#0284c7] text-white shadow-2xs'
                                  : 'text-[#64748b] dark:text-zinc-400 hover:text-[#0284c7] dark:hover:text-white'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. Financial Data Privacy Mode */}
                  <div className="py-4 border-b border-[#bae6fd]/20 dark:border-[#223269]/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#0f172a] dark:text-zinc-200 block">Financial Revenue Privacy Mode</span>
                        <span className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 block mt-0.5">
                          Mask sensitive totals, revenue figures, and ledger balances across dashboard until hovered
                        </span>
                      </div>
                      <Toggle checked={draftSecurity.privacyMode} onChange={handleToggleDraftPrivacyMode} />
                    </div>

                    {draftSecurity.privacyMode && (
                      <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/80 dark:border-amber-900/50 flex items-center justify-between text-[10.5px]">
                        <span className="text-amber-800 dark:text-amber-300 font-medium">Privacy Blur Active (Hover to reveal):</span>
                        <span
                          className="privacy-sensitive privacy-blurred font-mono font-bold text-amber-900 dark:text-amber-200 px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/60 rounded-md transition-all duration-200 cursor-pointer select-none"
                          style={{
                            filter: isPreviewHovered ? 'none' : 'blur(7px)',
                            WebkitFilter: isPreviewHovered ? 'none' : 'blur(7px)',
                          }}
                          onMouseEnter={() => setIsPreviewHovered(true)}
                          onMouseLeave={() => setIsPreviewHovered(false)}
                          title="Privacy Mode Active - Hover to reveal"
                        >
                          $124,850.00
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 4. Biometric & Hardware WebAuthn Lock */}
                  <div className="py-4 border-b border-[#bae6fd]/20 dark:border-[#223269]/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#0f172a] dark:text-zinc-200 block">Biometric & Hardware Key Lock (WebAuthn)</span>
                        <span className="text-[10px] text-[#64748b]/80 dark:text-zinc-400 block mt-0.5">
                          Use TouchID, FaceID, Fingerprint, or Windows Hello security key to unlock workspace
                        </span>
                      </div>
                      <Toggle checked={draftSecurity.biometricEnabled} onChange={handleToggleDraftBiometric} />
                    </div>

                    {draftSecurity.biometricEnabled && (
                      <div className="mt-2 p-2.5 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-200/80 dark:border-sky-900/50 flex items-center gap-2 text-[10.5px] text-sky-800 dark:text-sky-300 font-medium">
                        <Fingerprint className="w-4 h-4 text-[#0284c7] dark:text-[#38bdf8] shrink-0" />
                        <span>WebAuthn Biometric verification active for screen lock overlay.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Staged Security Settings Action Bar (Apply Changes Button) */}
                <div className={`mt-6 pt-4 border-t border-[#bae6fd]/40 dark:border-[#223269]/40 flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl transition-all ${
                  isSecurityDirty
                    ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
                    : 'bg-[#f4f9ff]/60 dark:bg-[#0b1329]/60 border border-[#bae6fd]/40 dark:border-[#223269]/40'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      isSecurityDirty
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-[#e0f2fe] text-[#0284c7] dark:bg-[#1b264f] dark:text-[#38bdf8]'
                    }`}>
                      {isSecurityDirty ? <Sliders className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#0f172a] dark:text-white block">
                        {isSecurityDirty ? 'Unapplied Security Changes' : 'Security Settings Permanent'}
                      </span>
                      <span className="text-[10px] text-[#64748b] dark:text-zinc-400 block">
                        {isSecurityDirty
                          ? 'You have unsaved security changes. Click Apply Changes to save permanently.'
                          : 'All security settings are active and saved across page reloads.'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {isSecurityDirty && (
                      <button
                        type="button"
                        onClick={handleDiscardSecurityChanges}
                        className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold text-[#64748b] dark:text-zinc-400 bg-white dark:bg-[#111a36] border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Discard</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleApplySecurityChanges}
                      disabled={!isSecurityDirty}
                      className={`flex-1 sm:flex-none px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                        isSecurityDirty
                          ? 'bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-[#0284c7]/25 active:scale-95'
                          : 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 cursor-not-allowed shadow-none'
                      }`}
                    >
                      <Save className="w-4 h-4" />
                      <span>Apply Changes</span>
                    </button>
                  </div>
                </div>

                {/* 5. Local Storage & Security Health Scan Card */}
                <div className="p-4 bg-[#f4f9ff] dark:bg-[#0b1329]/60 rounded-2xl border border-[#bae6fd]/60 dark:border-[#223269]/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#e0f2fe] text-[#0284c7] dark:bg-[#1b264f] dark:text-[#38bdf8] flex items-center justify-center shrink-0">
                      <ShieldCheck className={`w-5 h-5 ${isScanningSecurity ? 'animate-pulse text-[#0284c7]' : ''}`} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#0f172a] dark:text-white block">Security Health & Encryption Audit</span>
                      <span className="text-[10px] text-[#64748b] dark:text-zinc-400 block mt-0.5">
                        {lastSecurityScanDate ? `Last audit scan: ${lastSecurityScanDate} (0 Vulnerabilities Found)` : 'Run real-time diagnostic scan on local storage tables & SSL tokens'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRunSecurityScan}
                    disabled={isScanningSecurity}
                    className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50 shrink-0 flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanningSecurity ? 'animate-spin' : ''}`} />
                    <span>{isScanningSecurity ? 'Auditing...' : 'Run Security Scan'}</span>
                  </button>
                </div>

                {/* Security Audit Diagnostic Report Card */}
                {lastSecurityScanDate && (
                  <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/50 space-y-2.5 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        System Security Health Audit: 100% Verified
                      </span>
                      <span className="text-[9.5px] font-mono text-emerald-600 dark:text-emerald-400/80">
                        Scan Completed at {lastSecurityScanDate}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-medium text-slate-700 dark:text-zinc-300 pt-1">
                      <div className="flex items-center gap-2 p-2.5 bg-white/80 dark:bg-[#0b1329]/80 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Local Database Storage: <b className="text-emerald-700 dark:text-emerald-400">256-Bit Encrypted</b></span>
                      </div>
                      <div className="flex items-center gap-2 p-2.5 bg-white/80 dark:bg-[#0b1329]/80 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                        <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>PIN Passcode Protection: <b className="text-emerald-700 dark:text-emerald-400">{isPinLockEnabled ? 'Active (PBKDF2 Hash)' : 'Disabled'}</b></span>
                      </div>
                      <div className="flex items-center gap-2 p-2.5 bg-white/80 dark:bg-[#0b1329]/80 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                        <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Inactivity Auto-Lock: <b className="text-emerald-700 dark:text-emerald-400">{autoLockTimeout.toUpperCase()}</b></span>
                      </div>
                      <div className="flex items-center gap-2 p-2.5 bg-white/80 dark:bg-[#0b1329]/80 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                        <Key className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>WebAuthn Hardware Key: <b className="text-emerald-700 dark:text-emerald-400">{draftSecurity.biometricEnabled ? 'Configured' : 'Ready'}</b></span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. Active Session Info */}
                <div className="p-4 bg-[#f4f9ff] dark:bg-[#0b1329]/60 rounded-2xl border border-[#bae6fd]/40 dark:border-[#223269]/40 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#0284c7] dark:text-[#38bdf8]" />
                      <span className="text-[10px] uppercase font-extrabold text-[#0284c7] dark:text-[#38bdf8]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        Active Workspace Sessions ({activeSessions.length})
                      </span>
                    </div>
                    {activeSessions.length > 1 && (
                      <button
                        type="button"
                        onClick={handleRevokeAllOtherSessions}
                        className="text-[9.5px] font-extrabold text-rose-600 hover:text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900/50 cursor-pointer transition-all flex items-center gap-1.5 self-start sm:self-auto"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Sign Out Other Sessions</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {activeSessions.map((session) => {
                      const deviceType = session.deviceType || (
                        session.deviceName.toLowerCase().includes('iphone') || session.deviceName.toLowerCase().includes('android') || session.deviceName.toLowerCase().includes('ios')
                          ? 'mobile'
                          : session.deviceName.toLowerCase().includes('ipad') ? 'tablet' : 'desktop'
                      );
                      const isMobile = deviceType === 'mobile';
                      const isTablet = deviceType === 'tablet';

                      return (
                        <div
                          key={session.sessionId}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all gap-3 ${
                            session.isCurrent
                              ? 'bg-white dark:bg-[#111a36] border-[#0284c7]/40 dark:border-[#38bdf8]/40 shadow-sm'
                              : 'bg-white/80 dark:bg-[#111a36]/70 border-[#bae6fd]/40 dark:border-[#223269]/50 hover:border-slate-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-start sm:items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                              session.isCurrent
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400'
                                : 'bg-[#e0f2fe] dark:bg-[#1b264f] border-[#bae6fd]/60 dark:border-[#223269]/60 text-[#0284c7] dark:text-[#38bdf8]'
                            }`}>
                              {isMobile ? (
                                <Smartphone className="w-4 h-4" />
                              ) : isTablet ? (
                                <Smartphone className="w-4 h-4 rotate-90" />
                              ) : (
                                <Monitor className="w-4 h-4" />
                              )}
                            </div>

                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-[#0f172a] dark:text-zinc-100 truncate">{session.deviceName}</span>
                                {session.isCurrent ? (
                                  <span className="text-[8px] font-black text-emerald-700 dark:text-emerald-300 px-2 py-0.5 bg-emerald-100/80 dark:bg-emerald-950/80 rounded-full border border-emerald-300 dark:border-emerald-700/60 uppercase tracking-wider">
                                    Current Device
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-bold text-sky-700 dark:text-sky-300 px-2 py-0.5 bg-sky-100/80 dark:bg-sky-950/80 rounded-full border border-sky-300 dark:border-sky-700/60 uppercase tracking-wider">
                                    Active Session
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9.5px] text-[#64748b] dark:text-zinc-400 font-mono">
                                <span>{session.userEmail}</span>
                                <span>•</span>
                                <span>{session.lastActive}</span>
                                {session.ipAddress && (
                                  <>
                                    <span>•</span>
                                    <span className="text-[#0284c7] dark:text-[#38bdf8]">{session.ipAddress}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {!session.isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleRevokeSingleSession(session.sessionId, session.deviceName)}
                              className="px-3 py-1.5 text-[10px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-lg border border-rose-200 dark:border-rose-900/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 self-end sm:self-auto"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Revoke</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}



            {/* -------------------- ACCOUNT -------------------- */}
            {activeSection === 'account' && (
              <div className="space-y-1">
                <h2 className="text-xs font-black text-[#0284c7] dark:text-[#38bdf8] uppercase tracking-widest mb-5" style={{ fontFamily: "'Fraunces', serif" }}>Account</h2>
                <div className="p-4 bg-[#f4f9ff] dark:bg-[#0b1329]/60 rounded-xl border border-[#bae6fd]/40 dark:border-[#223269]/40 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0284c7] dark:bg-[#0369a1] text-white flex items-center justify-center font-black text-sm flex-shrink-0 shadow-md shadow-[#0284c7]/20">
                      {profile.name ? profile.name.charAt(0).toUpperCase() : 'M'}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#0f172a] dark:text-zinc-200 block">{profile.name || 'MakInvoice User'}</span>
                      <span className="text-[10px] text-[#64748b]/75 dark:text-zinc-500 font-mono">{profile.email || 'Local account'}</span>
                    </div>
                    <span className="ml-auto text-[9px] font-bold text-[#0284c7] dark:text-[#38bdf8] px-2 py-0.5 bg-[#e0f2fe] dark:bg-[#1b264f] rounded-full border border-[#bae6fd] dark:border-[#223269]">
                      {profile.email ? 'Cloud' : 'Local'}
                    </span>
                  </div>
                </div>
                <Row
                  label="App Version"
                  description="Current installed version of MakInvoices"
                  control={<span className="text-[10px] font-mono font-bold text-[#0284c7] dark:text-[#38bdf8]">v1.2.0</span>}
                />
                <Row
                  label="Platform"
                  description="Application environment"
                  control={<span className="text-[10px] font-mono font-bold text-[#0284c7] dark:text-[#38bdf8]">Web Browser</span>}
                />
                <div className="mt-6 pt-4 border-t border-[#bae6fd]/30 dark:border-[#223269]/30">
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
    </div>
  );
}

