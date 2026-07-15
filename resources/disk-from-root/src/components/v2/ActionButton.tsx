import { Button, ButtonProps } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { forwardRef } from "react";

interface ActionButtonProps extends ButtonProps {
  icon?: LucideIcon;
  loading?: boolean;
}

export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ icon: Icon, loading, children, disabled, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={disabled || loading}
        className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : Icon ? (
          <Icon className="h-4 w-4" />
        ) : null}
        {children}
      </Button>
    );
  }
);
ActionButton.displayName = "ActionButton";
