import { supabase } from './supabase';

export interface WorkspaceSession {
  sessionId: string;
  deviceName: string;
  userEmail: string;
  lastActive: string;
  ipAddress?: string;
  isCurrent: boolean;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
}

// Persistent Device ID per browser/device
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem('mak_persistent_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem('mak_persistent_device_id', id);
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
  else if (ua.includes('iPhone')) os = 'iPhone';
  else if (ua.includes('iPad')) os = 'iPad';
  else if (ua.includes('Android')) os = 'Android Device';
  else if (ua.includes('Linux')) os = 'Linux PC';

  let browser = 'Web Browser';
  if (ua.includes('Edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('Chrome/')) browser = 'Google Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Apple Safari';
  else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';

  return `${browser} on ${os}`;
}

export function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (ua.includes('iPad') || (ua.includes('Mac') && navigator.maxTouchPoints > 1)) return 'tablet';
  if (ua.includes('iPhone') || ua.includes('Android') || ua.includes('Mobile')) return 'mobile';
  return 'desktop';
}

const SESSIONS_CACHE_KEY = 'mak_workspace_active_sessions_v3';

function getStorageKey(userEmail?: string): string {
  const cleanEmail = (userEmail || localStorage.getItem('makbills_custom_email') || 'default_user').toLowerCase().trim();
  return `${SESSIONS_CACHE_KEY}_${cleanEmail}`;
}

export function getLocalSessions(userEmail?: string): WorkspaceSession[] {
  if (typeof window === 'undefined') return [];
  const currentId = getDeviceId();
  const currentDeviceName = getDeviceName();
  const email = userEmail || localStorage.getItem('makbills_custom_email') || 'Active User';
  const storageKey = getStorageKey(email);
  const raw = localStorage.getItem(storageKey);
  let list: WorkspaceSession[] = [];
  if (raw) {
    try {
      list = JSON.parse(raw);
    } catch (e) {}
  }

  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Filter out any invalid items
  list = list.filter(s => s && typeof s.sessionId === 'string');

  const hasCurrent = list.some(s => s.sessionId === currentId);
  if (!hasCurrent) {
    const currentSess: WorkspaceSession = {
      sessionId: currentId,
      deviceName: currentDeviceName,
      userEmail: email,
      lastActive: `${nowStr} (Active Now)`,
      isCurrent: true,
      deviceType: getDeviceType()
    };
    list = [currentSess, ...list.map(s => ({ ...s, isCurrent: false }))];
  } else {
    list = list.map(s => s.sessionId === currentId ? {
      ...s,
      deviceName: currentDeviceName,
      userEmail: email,
      lastActive: `${nowStr} (Active Now)`,
      isCurrent: true,
      deviceType: getDeviceType()
    } : { ...s, isCurrent: false });
  }

  localStorage.setItem(storageKey, JSON.stringify(list));
  return list;
}

export function registerCurrentSession(userEmail: string): WorkspaceSession[] {
  if (typeof window === 'undefined') return [];
  return getLocalSessions(userEmail);
}

export function revokeSession(targetSessionId: string, userEmail?: string): WorkspaceSession[] {
  if (typeof window === 'undefined') return [];
  const email = userEmail || localStorage.getItem('makbills_custom_email') || 'Active User';
  const storageKey = getStorageKey(email);
  const currentId = getDeviceId();

  const list = getLocalSessions(email);
  const updatedList = list.filter(s => s.sessionId !== targetSessionId);
  localStorage.setItem(storageKey, JSON.stringify(updatedList));

  // Dispatch local window event & broadcast signal
  window.dispatchEvent(new CustomEvent('mak_session_revoked', { detail: { targetSessionId } }));

  // Supabase Realtime revocation broadcast if configured
  if (supabase && typeof supabase.channel === 'function') {
    const cleanEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const channel = supabase.channel(`sessions_${cleanEmail}`);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'REVOKE_SESSION',
          payload: { targetSessionId, senderId: currentId }
        });
      }
    });
  }

  return updatedList;
}

export function revokeAllOtherSessions(userEmail?: string): WorkspaceSession[] {
  if (typeof window === 'undefined') return [];
  const email = userEmail || localStorage.getItem('makbills_custom_email') || 'Active User';
  const storageKey = getStorageKey(email);
  const currentId = getDeviceId();
  const currentDeviceName = getDeviceName();
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const updatedList: WorkspaceSession[] = [
    {
      sessionId: currentId,
      deviceName: currentDeviceName,
      userEmail: email,
      lastActive: `${nowStr} (Active Now)`,
      isCurrent: true,
      deviceType: getDeviceType(),
      ipAddress: undefined
    }
  ];

  localStorage.setItem(storageKey, JSON.stringify(updatedList));
  window.dispatchEvent(new CustomEvent('mak_all_other_sessions_revoked', { detail: { currentId } }));

  // Supabase Realtime broadcast
  if (supabase && typeof supabase.channel === 'function') {
    const cleanEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const channel = supabase.channel(`sessions_${cleanEmail}`);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'REVOKE_ALL_OTHERS',
          payload: { keepSessionId: currentId }
        });
      }
    });
  }

  return updatedList;
}

// Real-time listener for remote session revocation
export function initSessionSync(userEmail: string, onForceLogout?: () => void): () => void {
  if (typeof window === 'undefined' || !userEmail) return () => {};

  const cleanEmail = userEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const currentId = getDeviceId();

  if (!supabase || typeof supabase.channel !== 'function') return () => {};

  const channel = supabase.channel(`sessions_${cleanEmail}`);

  channel
    .on('broadcast', { event: 'REVOKE_SESSION' }, (payload) => {
      if (payload.payload?.targetSessionId === currentId) {
        if (onForceLogout) onForceLogout();
        window.dispatchEvent(new CustomEvent('mak_session_force_logout'));
      }
    })
    .on('broadcast', { event: 'REVOKE_ALL_OTHERS' }, (payload) => {
      if (payload.payload?.keepSessionId !== currentId) {
        if (onForceLogout) onForceLogout();
        window.dispatchEvent(new CustomEvent('mak_session_force_logout'));
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

