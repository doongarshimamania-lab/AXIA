import { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/convex/_generated/api';

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
 *
 * FIX (2026-07-03):
 * Previously `updateTier` ONLY wrote to localStorage — never to Convex.
 * Combined with the `useEffect` below that re-syncs from the backend user
 * record, this caused the user-reported bug: "when i upgrade to any tier
 * it doesnt stay in the tier and automatically comes down to free". Every
 * time the user record re-fetched from Convex, the (never-persisted) tier
 * reset to `undefined` → 'free'.
 *
 * Now: `updateTier` calls the new `api.users.setMyTier` mutation (which
 * writes to the backend) AND mirrors to localStorage. The `useEffect`
 * re-sync is now idempotent — once the backend has the new tier, the
 * next re-fetch returns the same value.
 */
export function useSubscriptionTier() {
  const { user } = useAuth();
  const [tier, setTierState] = useState<'free' | 'starter' | 'pro' | 'expert'>('free');
  const [isLoading, setIsLoading] = useState(true);

  // ponytail: mutation that persists tier to the backend `users.subscriptionTier`
  // field. See src/convex/users.ts → setMyTier for the security rationale
  // (self-serve, own-user-only, no admin required; replaces the removed
  // `subscriptionTier` arg on `updateProfile`).
  const setMyTierMutation = useMutation(api.users.setMyTier);

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

  // Update tier — persists to BOTH Convex (source of truth) and localStorage.
  // ponytail: previously this only wrote to localStorage, which is why upgrades
  // didn't persist across page reloads. Now calls `setMyTier` mutation.
  // Returns a Promise so callers CAN await + toast on failure, but does NOT
  // throw — on failure it rolls back to the backend-known tier and logs.
  // This avoids unhandled-promise-rejection crashes in callers that don't await.
  const updateTier = async (newTier: 'free' | 'starter' | 'pro' | 'expert') => {
    const previousTier = (user as any)?.subscriptionTier ?? 'free';
    // Optimistic local update so the UI flips immediately.
    setTierState(newTier);
    localStorage.setItem('axia_subscription_tier', newTier);
    window.dispatchEvent(new Event('axia_tier_update'));
    try {
      await setMyTierMutation({ tier: newTier });
      return { ok: true as const };
    } catch (err) {
      // Roll back to whatever the backend last reported (via the user record).
      // The next user-record re-fetch will correct this.
      console.error('setMyTier failed — tier reverted to backend value:', err);
      setTierState(previousTier);
      localStorage.setItem('axia_subscription_tier', previousTier);
      return { ok: false as const, error: err };
    }
  };

  return { tier, setTier: updateTier, isLoading };
}
