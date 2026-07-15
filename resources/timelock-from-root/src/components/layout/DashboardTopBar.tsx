import { NotificationBell } from "@/components/notifications/NotificationBell";

/**
 * Fixed top-right floating container for dashboard-wide actions.
 *
 * Mounted once at the DashboardLayout level so it stays anchored to the
 * viewport's top-right corner across every dashboard page. The bell sits
 * above page content but below modal overlays (z-40).
 *
 * Layout details:
 * - `top-3 right-4` keeps a small breathing room from the viewport edges.
 * - `z-40` ensures it stays above page content but below dialogs (z-50).
 * - The wrapper is pointer-events-none so it never blocks clicks on
 *   underlying page content; the bell itself re-enables pointer events.
 * - Subtle glass backdrop so the bell remains legible over any page hero.
 */
export function DashboardTopBar() {
  return (
    <div className="fixed top-3 right-4 z-40 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 backdrop-blur-md shadow-sm px-1.5 py-1">
        <NotificationBell />
      </div>
    </div>
  );
}
