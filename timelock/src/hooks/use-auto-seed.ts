import { useEffect, useRef } from "react";
import { useMutation, useQuery } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";

/**
 * Hook that auto-seeds mock data for the current user on first load.
 * Idempotent — only runs once per browser session and skips if data already exists.
 */
export function useAutoSeed() {
  const seedAttempted = useRef(false);
  const autoSeed = useMutation(api.autoSeed.autoSeed);

  // Check if user is authenticated via the currentUser query
  const currentUser = useQuery(api.users.currentUser);

  useEffect(() => {
    // Only attempt once per session
    if (seedAttempted.current) return;
    // Wait until we know the user state (not loading)
    if (currentUser === undefined) return;
    // Skip if not authenticated
    if (!currentUser) return;

    seedAttempted.current = true;

    (async () => {
      try {
        const result = await autoSeed({});
        if (result && (result as any).seeded) {
          console.log("[AutoSeed] Seeded:", (result as any).items);
        }
      } catch (err) {
        // Non-critical - don't block the app
        console.warn("[AutoSeed] Failed (non-critical):", err);
      }
    })();
  }, [currentUser, autoSeed]);
}
