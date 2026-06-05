import { AnimatePresence, motion } from "framer-motion";
import { Settings } from "lucide-react";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";

interface ProfileSectionProps {
  profile: any;
  isExpanded: boolean;
  onOpenProfile: () => void;
}

export function ProfileSection({ profile, isExpanded, onOpenProfile }: ProfileSectionProps) {
  const username = profile?.name || "User";
  const userInitial = username.charAt(0).toUpperCase();
  const { tier: subscriptionTier } = useSubscriptionTier();

  return (
    <div className="border-b border-sidebar-border px-5 py-4">
      <div className="flex items-center gap-3 justify-center">
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-foreground font-semibold">
            {userInitial}
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-sidebar" />
        </div>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col overflow-hidden"
            >
              <span className="text-sidebar-foreground font-medium text-sm whitespace-nowrap">{username}</span>
              <span className="text-primary text-xs capitalize whitespace-nowrap">
                {subscriptionTier}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        {isExpanded && (
          <button
            className="ml-auto text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onOpenProfile();
            }}
            aria-label="Open settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
