"use client";
import dynamic from 'next/dynamic';
import { ConfirmProvider } from '../../components/ConfirmContext';

import { SubscriptionProvider } from '../../lib/subscriptionContext';

// Disable SSR for the main App component since it relies heavily on localStorage and browser APIs for offline sync
const App = dynamic(() => import("../../App"), { ssr: false });

export default function CatchAllPage() {
  return (
    <ConfirmProvider>
      <SubscriptionProvider>
        <App />
      </SubscriptionProvider>
    </ConfirmProvider>
  );
}
