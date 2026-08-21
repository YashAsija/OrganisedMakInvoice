export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: Date;
  read: boolean;
}

const NOTIF_STORAGE_KEY = 'mak_notifications_preferences_v3';

/**
 * Audio Chime Helper - Plays a light synthetic chime
 */
export const playNotificationChime = () => {
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

/**
 * Emits a global notification event that the Dashboard can listen to,
 * respecting user notification settings saved in localStorage.
 */
export const emitNotification = (title: string, message: string, type: NotificationType = 'info') => {
  if (typeof window === 'undefined') return;

  // Check saved preferences
  const rawPref = localStorage.getItem(NOTIF_STORAGE_KEY);
  let isNotificationsEnabled = true;
  let alertCategoryEnabled = true;
  let inAppEnabled = true;
  let pushEnabled = false;
  let soundEnabled = true;

  if (rawPref) {
    try {
      const pref = JSON.parse(rawPref);
      if (pref.isNotificationsEnabled === false) {
        isNotificationsEnabled = false;
      }

      // Determine category based on title
      const lowerTitle = (title || '').toLowerCase();
      let alertId = 'invoice';
      if (lowerTitle.includes('payment') || lowerTitle.includes('due') || lowerTitle.includes('reminder') || lowerTitle.includes('receipt')) {
        alertId = 'payment';
      } else if (lowerTitle.includes('tax') || lowerTitle.includes('gst') || lowerTitle.includes('compliance') || lowerTitle.includes('recurring')) {
        alertId = 'tax';
      } else if (lowerTitle.includes('cloud') || lowerTitle.includes('sync') || lowerTitle.includes('backup') || lowerTitle.includes('export') || lowerTitle.includes('storage')) {
        alertId = 'cloud';
      } else if (lowerTitle.includes('security') || lowerTitle.includes('pin') || lowerTitle.includes('passcode') || lowerTitle.includes('lock') || lowerTitle.includes('permission')) {
        alertId = 'security';
      }

      if (pref.alertsConfig && pref.alertsConfig[alertId]) {
        const cat = pref.alertsConfig[alertId];
        if (cat.enabled === false) {
          alertCategoryEnabled = false;
        }
        if (cat.channels) {
          inAppEnabled = cat.channels.inApp ?? true;
          pushEnabled = cat.channels.push ?? false;
          soundEnabled = cat.channels.sound ?? true;
        }
      }

      if (pref.channels) {
        if (pref.channels.inApp === false) inAppEnabled = false;
        if (pref.channels.sound === false) soundEnabled = false;
        if (pref.channels.push === true) pushEnabled = true;
      }
    } catch (e) {}
  } else {
    const legacyMaster = localStorage.getItem('mak_notifications_enabled');
    if (legacyMaster === 'false') {
      isNotificationsEnabled = false;
    }
  }

  // Allow settings action feedback toasts to display when user is configuring settings
  const isSettingsFeedback = title.includes('Setting') || title.includes('Preference') || title.includes('Notification Preferences');

  if (!isNotificationsEnabled && !isSettingsFeedback) {
    return; // Blocked by Master Notification Mute
  }

  if (!alertCategoryEnabled && !isSettingsFeedback) {
    return; // Blocked because this specific alert category is disabled by user
  }

  // Handle Sound Effects
  if (soundEnabled && isNotificationsEnabled) {
    playNotificationChime();
  }

  // Handle Desktop Browser Push Notification
  if (pushEnabled && isNotificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico'
      });
    } catch (err) {}
  }

  // Handle In-App Toast
  if (inAppEnabled || isSettingsFeedback) {
    const event = new CustomEvent('mak_notification', {
      detail: { title, message, type }
    });
    window.dispatchEvent(event);
  }
};
