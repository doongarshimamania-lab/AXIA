import { useState, useEffect } from 'react';

export function useSubscriptionTier() {
  const [tier, setTier] = useState<'free' | 'starter' | 'pro' | 'expert' | 'client'>('free');
  const [isLoading, setIsLoading] = useState(true);

  // Load tier from localStorage on mount and listen for changes
  useEffect(() => {
    const loadTier = () => {
      const savedTier = localStorage.getItem('timelock_subscription_tier') as 'free' | 'starter' | 'pro' | 'expert' | 'client' | null;
      if (savedTier) {
        setTier(savedTier);
      }
      setIsLoading(false);
    };

    loadTier();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'timelock_subscription_tier') {
        loadTier();
      }
    };

    const handleCustomChange = () => {
      loadTier();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('timelock_tier_update', handleCustomChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('timelock_tier_update', handleCustomChange);
    };
  }, []);

  // Save tier to localStorage whenever it changes
  const updateTier = (newTier: 'free' | 'starter' | 'pro' | 'expert' | 'client') => {
    setTier(newTier);
    localStorage.setItem('timelock_subscription_tier', newTier);
    // Dispatch custom event to notify other components in the same window
    window.dispatchEvent(new Event('timelock_tier_update'));
  };

  return { tier, setTier: updateTier, isLoading };
}