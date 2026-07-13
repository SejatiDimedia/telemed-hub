import { Badge } from "../ui/Badge";

export interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const normStatus = status.toLowerCase();

  let variant: "neutral" | "primary" | "secondary" | "success" | "warning" | "error" | "info" = "neutral";
  let label = status;

  switch (normStatus) {
    // Success States
    case "completed":
    case "success":
    case "verified":
    case "active":
    case "confirmed":
    case "delivered":
    case "paid":
      variant = "success";
      label = normStatus === "paid" ? "Paid" : status;
      break;

    // Warning States
    case "pending":
    case "warning":
    case "processing":
    case "in_progress":
    case "in-progress":
    case "scheduled":
      variant = "warning";
      label = normStatus === "in_progress" || normStatus === "in-progress" ? "In Progress" : status;
      break;

    // Error States
    case "cancelled":
    case "canceled":
    case "error":
    case "failed":
    case "rejected":
    case "inactive":
    case "out_of_stock":
    case "out-of-stock":
      variant = "error";
      label = normStatus === "out_of_stock" || normStatus === "out-of-stock" ? "Out of Stock" : status;
      break;

    // Info / Blue States
    case "info":
    case "shipped":
    case "dispensed":
    case "ongoing":
    case "sent":
      variant = "info";
      break;

    // Secondary / Accent States
    case "draft":
    case "new":
    case "created":
      variant = "secondary";
      break;

    // Default neutral
    default:
      variant = "neutral";
      break;
  }

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
