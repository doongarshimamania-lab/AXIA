import { Badge } from "@/components/ui/badge";

type StatusVariant = "default" | "success" | "warning" | "error" | "info" | "platinum";

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
}

const variantStyles: Record<StatusVariant, string> = {
  default: "bg-muted text-muted-foreground border-border",
  success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-primary/10 text-primary border-primary/20",
  platinum: "bg-platinum-500/10 text-platinum-600 dark:text-platinum-400 border-platinum-500/20",
};

export function StatusBadge({ status, variant = "default", className }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={`${variantStyles[variant]} ${className || ""}`}>
      {status}
    </Badge>
  );
}
