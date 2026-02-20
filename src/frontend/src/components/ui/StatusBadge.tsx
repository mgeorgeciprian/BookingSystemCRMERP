"use client";

import { cn } from "@/lib/utils";

// Appointment statuses
const APPOINTMENT_STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  pending: {
    label: "In asteptare",
    bg: "bg-amber-100",
    text: "text-amber-800",
    dot: "bg-amber-500",
  },
  confirmed: {
    label: "Confirmat",
    bg: "bg-blue-100",
    text: "text-blue-800",
    dot: "bg-blue-500",
  },
  in_progress: {
    label: "In desfasurare",
    bg: "bg-indigo-100",
    text: "text-indigo-800",
    dot: "bg-indigo-500",
  },
  completed: {
    label: "Finalizat",
    bg: "bg-green-100",
    text: "text-green-800",
    dot: "bg-green-600",
  },
  cancelled: {
    label: "Anulat",
    bg: "bg-gray-100",
    text: "text-gray-600",
    dot: "bg-gray-400",
  },
  no_show: {
    label: "Neprezentare",
    bg: "bg-red-100",
    text: "text-red-800",
    dot: "bg-red-500",
  },
};

// Invoice statuses
const INVOICE_STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  draft: {
    label: "Draft",
    bg: "bg-gray-100",
    text: "text-gray-600",
    dot: "bg-gray-400",
  },
  issued: {
    label: "Emis",
    bg: "bg-blue-100",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  sent: {
    label: "Trimis",
    bg: "bg-sky-100",
    text: "text-sky-700",
    dot: "bg-sky-500",
  },
  paid: {
    label: "Platit",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  overdue: {
    label: "Scadent",
    bg: "bg-red-100",
    text: "text-red-700",
    dot: "bg-red-500",
  },
  cancelled: {
    label: "Anulat",
    bg: "bg-gray-100",
    text: "text-gray-600",
    dot: "bg-gray-400",
  },
  storno: {
    label: "Storno",
    bg: "bg-orange-100",
    text: "text-orange-700",
    dot: "bg-orange-500",
  },
};

// Notification statuses
const NOTIFICATION_STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  pending: {
    label: "In asteptare",
    bg: "bg-gray-100",
    text: "text-gray-600",
    dot: "bg-gray-400",
  },
  sent: {
    label: "Trimis",
    bg: "bg-blue-100",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  delivered: {
    label: "Livrat",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  read: {
    label: "Citit",
    bg: "bg-purple-100",
    text: "text-purple-700",
    dot: "bg-purple-500",
  },
  failed: {
    label: "Esuat",
    bg: "bg-red-100",
    text: "text-red-700",
    dot: "bg-red-500",
  },
};

// Payment statuses
const PAYMENT_STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  paid: {
    label: "Platit",
    bg: "bg-green-100",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  partial: {
    label: "Partial",
    bg: "bg-amber-100",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  unpaid: {
    label: "Neplatit",
    bg: "bg-red-100",
    text: "text-red-700",
    dot: "bg-red-500",
  },
};

type StatusType = "appointment" | "invoice" | "notification" | "payment";

interface StatusBadgeProps {
  status: string;
  type?: StatusType;
  size?: "xs" | "sm";
  showDot?: boolean;
  className?: string;
}

const CONFIG_MAP: Record<StatusType, Record<string, { label: string; bg: string; text: string; dot: string }>> = {
  appointment: APPOINTMENT_STATUS_CONFIG,
  invoice: INVOICE_STATUS_CONFIG,
  notification: NOTIFICATION_STATUS_CONFIG,
  payment: PAYMENT_STATUS_CONFIG,
};

export function StatusBadge({
  status,
  type = "appointment",
  size = "xs",
  showDot = false,
  className,
}: StatusBadgeProps) {
  const config = CONFIG_MAP[type];
  const statusConfig = config[status] || {
    label: status,
    bg: "bg-gray-100",
    text: "text-gray-600",
    dot: "bg-gray-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        statusConfig.bg,
        statusConfig.text,
        size === "xs" ? "px-2 py-0.5 text-[10px] leading-4" : "px-2.5 py-1 text-xs",
        className
      )}
    >
      {showDot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", statusConfig.dot)} />
      )}
      {statusConfig.label}
    </span>
  );
}

// Export configs for use in legends
export { APPOINTMENT_STATUS_CONFIG, INVOICE_STATUS_CONFIG };
