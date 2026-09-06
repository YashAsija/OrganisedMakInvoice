'use client';

// PlanSyncIndicator component — returns null to prevent UI header blinking/flashing.
// Realtime WebSocket syncing is handled seamlessly in background by SubscriptionContext.
export function PlanSyncIndicator() {
  return null;
}

export default PlanSyncIndicator;
