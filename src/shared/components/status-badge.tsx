/**
 * Status Badge — Premium badges with animated dots.
 */
import { cn } from "@/shared/lib/utils";

interface StatusBadgeProps {
  status: string;
  label: string;
  color?: string;
  size?: "sm" | "md";
  dot?: boolean;
}

const colorMap: Record<string, string> = {
  green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/15",
  yellow: "bg-amber-500/10 text-amber-400 border-amber-500/15",
  red: "bg-red-500/10 text-red-400 border-red-500/15",
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/15",
  purple: "bg-violet-500/10 text-violet-400 border-violet-500/15",
  cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/15",
  gray: "bg-surface-500/10 text-surface-400 border-surface-500/15",
  rose: "bg-rose-500/10 text-rose-400 border-rose-500/15",
  indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/15",
};

const statusColorMap: Record<string, string> = {
  ACTIVE: "green",
  PAUSED: "yellow",
  BOUNCED: "red",
  UNSUBSCRIBED: "gray",
  COMPLAINED: "red",
  DRAFT: "gray",
  COMPLETED: "blue",
  PENDING: "gray",
  QUEUED: "blue",
  SENDING: "cyan",
  SENT: "cyan",
  DELIVERED: "green",
  OPENED: "purple",
  CLICKED: "indigo",
  FAILED: "red",
};

const dotColorMap: Record<string, string> = {
  green: "bg-emerald-400",
  yellow: "bg-amber-400",
  red: "bg-red-400",
  blue: "bg-blue-400",
  purple: "bg-violet-400",
  cyan: "bg-cyan-400",
  gray: "bg-surface-500",
  rose: "bg-rose-400",
  indigo: "bg-indigo-400",
};

// Statuses that should have a pulsing dot
const liveStatuses = new Set(["ACTIVE", "SENDING"]);

export function StatusBadge({
  status,
  label,
  color,
  size = "sm",
  dot = false,
}: StatusBadgeProps) {
  const resolvedColor = color ?? statusColorMap[status] ?? "gray";
  const colorClasses = colorMap[resolvedColor] ?? colorMap.gray;
  const dotColor = dotColorMap[resolvedColor] ?? dotColorMap.gray;
  const isLive = liveStatuses.has(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold",
        colorClasses,
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      )}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full flex-shrink-0",
            dotColor,
            isLive && "animate-dot-pulse"
          )}
        />
      )}
      {label}
    </span>
  );
}
