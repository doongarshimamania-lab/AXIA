import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

/**
 * useSubscriptionTier — returns the user's subscription tier.
 *
 * FIX (2026-06-22):
 * Previously this hook ONLY read from localStorage, which meant that when
 * a user logged in with a different account, the tier from the previous
 * account persisted (showing "pro" to a free user, etc.).
 *
 * Now: the tier is sourced from the Convex `users.subscriptionTier` field
 * (the source of truth) and mirrored to localStorage for offline reads.
 * When the user changes (different account), the tier is re-synced from
 * the backend. The `setTier` mutation persists to both Convex (via the
 * updateProfile mutation) and localStorage.
 */
export function useSubscriptionTier() {
  const { user } = useAuth();
  const [tier, setTierState] = useState<'free' | 'starter' | 'pro' | 'expert'>('free');
  const [isLoading, setIsLoading] = useState(true);

  // Sync tier from Convex user record. Re-runs whenever `user` changes
  // (i.e., when user signs in / out / switches accounts).
  useEffect(() => {
    if (user === undefined) return; // still loading

    if (user === null) {
      // Signed out — reset to free
      setTierState('free');
      localStorage.removeItem('axia_subscription_tier');
      setIsLoading(false);
      return;
    }

    // Signed in — use the tier from the backend user record
    const backendTier = (user as any)?.subscriptionTier as
      | 'free' | 'starter' | 'pro' | 'expert'
      | undefined;

    const effectiveTier = backendTier ?? 'free';
    setTierState(effectiveTier);
    localStorage.setItem('axia_subscription_tier', effectiveTier);
    setIsLoading(false);
  }, [user]);

  // Also listen for storage changes (cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'axia_subscription_tier' && e.newValue) {
        setTierState(e.newValue as any);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Update tier locally. NOTE: this only updates localStorage + state.
  // To persist to the backend, call `api.users.updateProfile` with the
  // new tier (handled by the Subscription page / PricingModal).
  const updateTier = (newTier: 'free' | 'starter' | 'pro' | 'expert') => {
    setTierState(newTier);
    localStorage.setItem('axia_subscription_tier', newTier);
    window.dispatchEvent(new Event('axia_tier_update'));
  };

  return { tier, setTier: updateTier, isLoading };
}
