'use client';

import React from 'react';
import { ConfirmProvider } from '../components/ConfirmContext';
import { SubscriptionProvider } from '../lib/subscriptionContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConfirmProvider>
      <SubscriptionProvider>
        {children}
      </SubscriptionProvider>
    </ConfirmProvider>
  );
}
