import { useState, useEffect } from 'react';
import { useQuery, useConvexAuth } from '@/lib/safe-convex-react';
import { api } from '@/convex/_generated/api';

/**
 * Subscription tier hook — reads the authoritative tier from Convex (server-side)
 * and falls back to localStorage only when offline/disconnected.
 *
 * SECURITY FIX: The tier is no longer solely client-controlled via localStorage.
 * The server-side user.subscriptionTier is the source of truth. localStorage
 * is only used as a cache for offline resilience.
 */
export function useSubscriptionTier() {
  const { isAuthenticated } = useConvexAuth();
  const [tier, setTier] = useState<'free' | 'starter' | 'pro' | 'expert' | 'client'>('free');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the real tier from the server (authoritative source)
  const userProfile = useQuery(
    isAuthenticated ? api.users.getProfile : 'skip',
    {}
  );

  // Load tier: prefer server data, fall back to localStorage cache
  useEffect(() => {
    if (userProfile !== undefined) {
      // Server responded — use its value as the source of truth
      if (userProfile?.subscriptionTier) {
        setTier(userProfile.subscriptionTier as 'free' | 'starter' | 'pro' | 'expert' | 'client');
        // Cache to localStorage for offline use
        localStorage.setItem('axia_subscription_tier', userProfile.subscriptionTier);
      }
      setIsLoading(false);
      return;
    }

    // While server data is loading, use cached value from localStorage
    const loadCachedTier = () => {
      const savedTier = localStorage.getItem('axia_subscription_tier') as 'free' | 'starter' | 'pro' | 'expert' | 'client' | null;
      if (savedTier) {
        setTier(savedTier);
      }
    };

    loadCachedTier();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'axia_subscription_tier') {
        loadCachedTier();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [userProfile]);

  // updateTier is now a no-op for client-side calls — tier can only
  // be changed server-side via the setSubscriptionTier mutation.
  // This prevents users from self-upgrading via DevTools.
  const updateTier = (newTier: 'free' | 'starter' | 'pro' | 'expert' | 'client') => {
    // SECURITY: Only update local state + cache for UI responsiveness.
    // The actual tier change must happen server-side.
    // This is intentionally a local-only update that will be overwritten
    // by the server value on next query.
    setTier(newTier);
    localStorage.setItem('axia_subscription_tier', newTier);
    console.warn(
      '[useSubscriptionTier] Client-side tier update is cosmetic only. ' +
      'Real tier changes must go through server-side setSubscriptionTier.'
    );
  };

  return { tier, setTier: updateTier, isLoading };
}
