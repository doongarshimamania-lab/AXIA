import { useEffect } from "react";
import { useNavigate } from "react-router";

/**
 * ProfileModal — now redirects to the Account Settings page.
 *
 * Previously this was a full modal dialog with tabs for Personal, Professional,
 * Appearance, and Security. Those sections have been moved to the dedicated
 * AccountSettings page at /account-settings, which also includes Subscription,
 * Help & Support, and Sign Out (all formerly scattered across the sidebar).
 *
 * This component is kept to handle the legacy `openProfileModal` custom event
 * that other components (e.g. ProfileSection gear icon) still dispatch.
 * It simply navigates to /account-settings.
 */
export function ProfileModal() {
  const navigate = useNavigate();

  useEffect(() => {
    function handleOpenProfileModal() {
      navigate("/account-settings");
    }

    window.addEventListener("openProfileModal", handleOpenProfileModal as EventListener);
    return () => window.removeEventListener("openProfileModal", handleOpenProfileModal as EventListener);
  }, [navigate]);

  return null;
}
