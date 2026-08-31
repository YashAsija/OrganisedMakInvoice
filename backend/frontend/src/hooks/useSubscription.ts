import { useSubscription as useSubCtx, PLAN_LIMITS } from '../context/SubscriptionContext';

export function useSubscription() {
  return useSubCtx();
}

export function usePlanLimits() {
  const { planKey, getDocumentLimit, getReportLimit, canCreateDocument, canCreateReport, usage } = useSubCtx();
  return {
    planKey,
    limits: PLAN_LIMITS[planKey] || PLAN_LIMITS.free,
    documentsUsed: usage?.documents_used ?? 0,
    reportsUsed: usage?.reports_used ?? 0,
    documentLimit: getDocumentLimit(),
    reportLimit: getReportLimit(),
    canCreateDocument: canCreateDocument(),
    canCreateReport: canCreateReport(),
  };
}

export default useSubscription;
