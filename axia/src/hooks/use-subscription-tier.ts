/**
 * useSubscriptionTier — DEPRECATED STUB.
 *
 * Phase 1 (2026-06-23): Subscription tiers have been REMOVED from AXIA.
 * All users now have a single flat plan. This hook is preserved only as a
 * no-op shim so that existing callers do not break during the transition.
 *
 * It always returns tier='expert' and a no-op setTier. Callers should be
 * migrated to role-based checks (useAuth -> user.role) and this file
 * should be deleted once all consumers are cleaned up.
 *
 * @deprecated remove this file once all callers are migrated to role-based checks.
 */
export function useSubscriptionTier() {
  return {
    tier: 'expert' as const,
    setTier: (_newTier: 'free' | 'starter' | 'pro' | 'expert' | 'client') => {
      // no-op: tiers have been removed
    },
    isLoading: false,
  };
}
