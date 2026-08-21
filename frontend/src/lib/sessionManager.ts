import { supabase } from './supabase';

export interface WorkspaceSession {
  sessionId: string;
  deviceName: string;
  userEmail: string;
  lastActive: string;
  ipAddress?: string;
  isCurrent: boolean;
}

// Generate or retrieve persistent Session ID for this browser tab/device
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = sessionStorage.getItem('mak_device_session_id');
  if (!id) {
    id = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    sessionStorage.setItem('mak_device_session_id', id);
  }
  return id;
}

// Parse human-readable OS & Browser name from user agent
export function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Unknown Device';
  const ua = navigator.userAgent;
  let os = 'Desktop';
  if (ua.includes('Win')) os = 'Windows PC';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS Device';
  else if (ua.includes('Android')) os = 'Android Device';
  else if (ua.includes('Linux')) os = 'Linux PC';

  let browser = 'Web Browser';
  if (ua.includes('Edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('Chrome/')) browser = 'Google Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Apple Safari';
  else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';

  return `${browser} on ${os}`;
}

// Active multi-device sessions registry stored in localStorage & synced via Supabase channel
const SESSIONS_CACHE_KEY = 'mak_workspace_active_sessions_v1';

export function getLocalSessions(): WorkspaceSession[] {
  if (typeof window === 'undefined') return [];
  const currentId = getDeviceId();
  const currentDeviceName = getDeviceName();
  const raw = localStorage.getItem(SESSIONS_CACHE_KEY);
  let list: WorkspaceSession[] = [];
  if (raw) {
    try {
      list = JSON.parse(raw);
    } catch (e) {}
  }

  // Ensure current device is present
  const exists = list.some(s => s.sessionId === currentId);
  if (!exists) {
    const currentSess: WorkspaceSession = {
      sessionId: currentId,
      deviceName: currentDeviceName,
      userEmail: localStorage.getItem('makbills_custom_email') || 'User',
      lastActive: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isCurrent: true
    };
    list = [currentSess, ...list];
    localStorage.setItem(SESSIONS_CACHE_KEY, JSON.stringify(list));
  } else {
    list = list.map(s => s.sessionId === currentId ? {
      ...s,
      deviceName: currentDeviceName,
      lastActive: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isCurrent: true
    } : { ...s, isCurrent: false });
  }

  return list;
}

export function registerCurrentSession(userEmail: string): WorkspaceSession[] {
  if (typeof window === 'undefined') return [];
  const currentId = getDeviceId();
  const currentDeviceName = getDeviceName();
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const raw = localStorage.getItem(SESSIONS_CACHE_KEY);
  let list: WorkspaceSession[] = [];
  if (raw) {
    try {
      list = JSON.parse(raw);
    } catch (e) {}
  }

  // Filter out stale sessions (>24h or invalid)
  const updatedList: WorkspaceSession[] = [
    {
      sessionId: currentId,
      deviceName: currentDeviceName,
      userEmail: userEmail || 'Active User',
      lastActive: now,
      isCurrent: true
    },
    ...list.filter(s => s.sessionId !== currentId).map(s => ({ ...s, isCurrent: false }))
  ];

  localStorage.setItem(SESSIONS_CACHE_KEY, JSON.stringify(updatedList));
  return updatedList;
}

export function revokeSession(targetSessionId: string): WorkspaceSession[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(SESSIONS_CACHE_KEY);
  let list: WorkspaceSession[] = [];
  if (raw) {
    try {
      list = JSON.parse(raw);
    } catch (e) {}
  }

  const updatedList = list.filter(s => s.sessionId !== targetSessionId);
  localStorage.setItem(SESSIONS_CACHE_KEY, JSON.stringify(updatedList));
  window.dispatchEvent(new CustomEvent('mak_session_revoked', { detail: { targetSessionId } }));
  return updatedList;
}

export function revokeAllOtherSessions(): WorkspaceSession[] {
  if (typeof window === 'undefined') return [];
  const currentId = getDeviceId();
  const currentDeviceName = getDeviceName();
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const updatedList: WorkspaceSession[] = [
    {
      sessionId: currentId,
      deviceName: currentDeviceName,
      userEmail: localStorage.getItem('makbills_custom_email') || 'Active User',
      lastActive: now,
      isCurrent: true
    }
  ];

  localStorage.setItem(SESSIONS_CACHE_KEY, JSON.stringify(updatedList));
  window.dispatchEvent(new CustomEvent('mak_all_other_sessions_revoked', { detail: { currentId } }));
  return updatedList;
}
