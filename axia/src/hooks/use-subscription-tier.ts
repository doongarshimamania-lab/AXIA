import { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/convex/_generated/api';
import { hasTierGate, isValidTier, type Tier, type GateKey } from '@/lib/tiers';

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
 * UPDATE (2026-07-25, Creem migration):
 * The canonical tier set is now { solo, agency, scale } matching the
 * marketing site + Creem product IDs. Legacy tier values (free/starter/
 * pro/expert) are mapped to their new equivalents so existing users'
 * data isn't broken:
 *   free / starter → solo
 *   pro            → agency
 *   expert         → scale
 * The `hasTierGate` function (from lib/tiers) accepts both old and new
 * values — see the migration map in lib/tiers.ts.
 */
const LEGACY_TIER_MAP: Record<string, Tier> = {
  free: 'solo',
  starter: 'solo',
  pro: 'agency',
  expert: 'scale',
};

function normalizeTier(raw: string | undefined | null): Tier | null {
  if (!raw) return null;
  if (isValidTier(raw)) return raw;
  return LEGACY_TIER_MAP[raw] ?? null;
}

export function useSubscriptionTier() {
  const { user } = useAuth();
  const [tier, setTierState] = useState<Tier | null>(null);
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
      // Signed out — reset to null (= no paid tier)
      setTierState(null);
      localStorage.removeItem('axia_subscription_tier');
      setIsLoading(false);
      return;
    }

    // Signed in — use the tier from the backend user record (after migration).
    const rawTier = (user as any)?.subscriptionTier as string | undefined;
    const effectiveTier = normalizeTier(rawTier);
    setTierState(effectiveTier);
    if (effectiveTier) {
      localStorage.setItem('axia_subscription_tier', effectiveTier);
    } else {
      localStorage.removeItem('axia_subscription_tier');
    }
    setIsLoading(false);
  }, [user]);

  // Also listen for storage changes (cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'axia_subscription_tier' && e.newValue) {
        const next = normalizeTier(e.newValue);
        if (next) setTierState(next);
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
  //
  // NOTE: setMyTier (post-v7.2 hardening) accepts only "free" for self-serve
  // (cancellation). Paid upgrades must go through Paddle/Creem checkout. This
  // hook still exposes setTier for backwards compatibility with callers that
  // upgrade via UI; they'll get a clear error from the backend if they try a
  // paid tier.
  const updateTier = async (newTier: 'free' | 'starter' | 'pro' | 'expert') => {
    const previousTier = normalizeTier((user as any)?.subscriptionTier);
    // Optimistic local update so the UI flips immediately.
    setTierState(normalizeTier(newTier));
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
      if (previousTier) {
        localStorage.setItem('axia_subscription_tier', previousTier);
      } else {
        localStorage.removeItem('axia_subscription_tier');
      }
      return { ok: false as const, error: err };
    }
  };

  return { tier, setTier: updateTier, isLoading };
}

/**
 * useTierGate — convenience hook for tier-gating UI.
 * Returns a function that checks whether the current user's tier has access
 * to a given gate key.
 *
 * Usage:
 *   const hasAccess = useTierGate();
 *   if (hasAccess('scope_creep_protection')) { ... }
 *
 * ponytail: this is the canonical way to gate features going forward. The
 * old `tier === 'pro'` checks scattered across the codebase should migrate
 * to this hook as they're touched.
 */
export function useTierGate() {
  const { tier } = useSubscriptionTier();
  return (gate: GateKey) => hasTierGate(tier, gate);
}
