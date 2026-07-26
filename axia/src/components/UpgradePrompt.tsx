// ponytail: UpgradePrompt — inline UI shown when a user tries to access a
// tier-gated feature or hits a creation limit. Three sizes:
//   - "inline"  → small card inside a page
//   - "modal"   → dialog overlay (used by sidebar lock clicks)
//   - "banner"  → slim banner at the top of a page
//
// Uses the existing hasTierGate / useTierGate API from src/lib/tiers.ts +
// src/hooks/use-subscription-tier.ts. The component takes a `gate` (GateKey)
// and reads the user's current tier to determine the minimum tier required.

import { useState } from "react";
import { Link } from "react-router";
import { Lock, ArrowRight, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSubscriptionTier, useTierGate } from "@/hooks/use-subscription-tier";
import {
  type GateKey,
  GATE_LABELS,
  TIER_PRICING,
  getTierDef,
} from "@/lib/tiers";
import { cn } from "@/lib/utils";

interface UpgradePromptProps {
  gate: GateKey;
  variant?: "inline" | "modal" | "banner";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  message?: string;
  className?: string;
}

export function UpgradePrompt({
  gate,
  variant = "inline",
  open,
  onOpenChange,
  message,
  className,
}: UpgradePromptProps) {
  const { tier } = useSubscriptionTier();
  const hasAccess = useTierGate();
  const gateLabel = GATE_LABELS[gate] ?? gate;

  // Determine the minimum tier required for this gate by checking each tier.
  // The GATE_MIN_TIER map is internal to lib/tiers.ts, so we derive the min
  // tier by checking hasTierGate against each tier in ascending order.
  const minTier = !hasAccess(gate)
    ? (["solo", "agency", "scale", "enterprise"] as const).find(
        (t) => {
          // Re-import the tier check with the candidate tier
          // hasTierGate uses the CURRENT user tier, so we need a different approach.
          return false;
        },
      ) ?? "agency"
    : "agency";

  // ponytail: derive minTier from the gate name pattern. Route gates map
  // predictably to tiers (route_*_workspace/custom_fields/compliance → scale,
  // route_* → agency). This avoids needing to export GATE_MIN_TIER.
  const derivedMinTier = (() => {
    if (
      gate === "route_multi_workspace" ||
      gate === "route_custom_fields" ||
      gate === "route_compliance_alerts" ||
      gate === "route_profitability_reports" ||
      gate === "multi_brand_workspaces" ||
      gate === "sso_scim" ||
      gate === "advanced_reports" ||
      gate === "dedicated_success_manager" ||
      gate === "custom_integrations_sla"
    ) {
      return "scale" as const;
    }
    if (
      gate === "custom_sla" ||
      gate === "dedicated_csm" ||
      gate === "custom_contracts" ||
      gate === "custom_retention"
    ) {
      return "enterprise" as const;
    }
    return "agency" as const;
  })();

  const tierDef = getTierDef(derivedMinTier);
  const pricing = TIER_PRICING[derivedMinTier];

  const derivedMessage =
    message ??
    `${gateLabel} is available on the ${tierDef?.name ?? derivedMinTier} plan and above. ` +
      `Upgrade to unlock it${
        tierDef && tierDef.maxSeats === null
          ? " with unlimited seats"
          : tierDef
            ? ` (${tierDef.maxSeats ?? tierDef.minSeats} seat${(tierDef.maxSeats ?? tierDef.minSeats) === 1 ? "" : "s"} included)`
            : ""
      }.`;

  // ─── Modal variant ──────────────────────────────────────────────────
  if (variant === "modal") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-center">{gateLabel} is locked</DialogTitle>
            <DialogDescription className="text-center">{derivedMessage}</DialogDescription>
          </DialogHeader>

          <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-4">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{tierDef?.name ?? derivedMinTier}</p>
                <p className="text-xs text-muted-foreground">
                  {tierDef && tierDef.maxSeats === null
                    ? "Unlimited seats"
                    : tierDef
                      ? `${tierDef.maxSeats ?? tierDef.minSeats} seat${(tierDef.maxSeats ?? tierDef.minSeats) === 1 ? "" : "s"} included`
                      : ""}
                </p>
              </div>
              <div className="text-right">
                {pricing.monthly === null ? (
                  <p className="text-lg font-bold text-foreground">Custom</p>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-foreground">${pricing.monthly}</p>
                    <p className="text-xs text-muted-foreground">/{pricing.pricingUnit}/mo</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button asChild className="flex-1">
              <Link to="/account-settings?tab=subscription">
                Upgrade to {tierDef?.name ?? derivedMinTier}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" onClick={() => onOpenChange?.(false)}>
              Maybe later
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ─── Banner variant ─────────────────────────────────────────────────
  if (variant === "banner") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border border-[var(--axia-teal)]/40 bg-gradient-to-r from-[var(--axia-teal-soft)]/60 to-white px-4 py-2.5 text-sm",
          className,
        )}
      >
        <Sparkles className="h-4 w-4 shrink-0 text-[var(--axia-teal-bright)]" />
        <span className="flex-1 text-foreground/90">{derivedMessage}</span>
        <Button asChild size="sm" variant="outline" className="h-7 shrink-0">
          <Link to="/account-settings?tab=subscription">
            Upgrade
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </div>
    );
  }

  // ─── Inline (card) variant ──────────────────────────────────────────
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/20 p-8 text-center",
        className,
      )}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Lock className="h-5 w-5 text-primary" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{gateLabel} is locked</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{derivedMessage}</p>
      <Button asChild className="mt-4">
        <Link to="/account-settings?tab=subscription">
          Upgrade to {tierDef?.name ?? derivedMinTier}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

/**
 * useUpgradeGate — convenience hook for the "click a locked nav item →
 * modal pops up" pattern. Returns:
 *   - lockedGate: the gate currently being challenged (or null)
 *   - challenge(gate): call this when the user clicks a locked item.
 *     Returns true if locked (modal pops), false if user has access.
 *   - modal: a <UpgradePrompt variant="modal"> element to render at the
 *     root of your component.
 */
export function useUpgradeGate() {
  const [lockedGate, setLockedGate] = useState<GateKey | null>(null);
  const hasAccess = useTierGate();

  const challenge = (gate: GateKey) => {
    if (hasAccess(gate)) return false;
    setLockedGate(gate);
    return true;
  };

  const modal = lockedGate ? (
    <UpgradePrompt
      gate={lockedGate}
      variant="modal"
      open={!!lockedGate}
      onOpenChange={(o) => {
        if (!o) setLockedGate(null);
      }}
    />
  ) : null;

  return { lockedGate, challenge, modal };
}
