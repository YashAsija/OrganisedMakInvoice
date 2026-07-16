export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: Date;
  read: boolean;
}

/**
 * Emits a global notification event that the Dashboard can listen to.
 */
export const emitNotification = (title: string, message: string, type: NotificationType = 'info') => {
  const event = new CustomEvent('mak_notification', {
    detail: { title, message, type }
  });
  window.dispatchEvent(event);
};
