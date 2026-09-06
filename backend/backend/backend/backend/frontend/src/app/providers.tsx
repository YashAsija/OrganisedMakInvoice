'use client';

import React from 'react';
import { ConfirmProvider } from '../components/ConfirmContext';
import { SubscriptionProvider as NewSubscriptionProvider } from '../context/SubscriptionContext';
import { SubscriptionProvider as LegacySubscriptionProvider } from '../lib/subscriptionContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConfirmProvider>
      <NewSubscriptionProvider>
        <LegacySubscriptionProvider>
          {children}
        </LegacySubscriptionProvider>
      </NewSubscriptionProvider>
    </ConfirmProvider>
  );
}
