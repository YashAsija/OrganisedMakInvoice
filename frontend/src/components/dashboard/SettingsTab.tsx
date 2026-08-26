import React from 'react';
import SettingsPage from '../SettingsPage';
import { BusinessProfile } from '../../types';

export interface SettingsTabProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  profile: BusinessProfile;
  isPinLockEnabled: boolean;
  onToggleSecurity: (type: 'pin') => void;
  onLogout: () => void;
  userEmail?: string | null;
}

export default function SettingsTab({
  theme = 'light',
  toggleTheme = () => {},
  profile = {} as BusinessProfile,
  isPinLockEnabled = false,
  onToggleSecurity = () => {},
  onLogout = () => {},
}: SettingsTabProps) {
  return (
    <SettingsPage
      theme={theme}
      toggleTheme={toggleTheme}
      profile={profile}
      isPinLockEnabled={isPinLockEnabled}
      onToggleSecurity={onToggleSecurity}
      onLogout={onLogout}
    />
  );
}
