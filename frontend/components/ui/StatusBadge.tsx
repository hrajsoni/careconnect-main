"use client";

type StatusBadgeProps = {
  status: string;
};

const STATUS_STYLES: Record<string, string> = {
  pending:     "bg-amber-100 text-amber-700 border border-amber-200",
  accepted:    "bg-blue-100 text-blue-700 border border-blue-200",
  confirmed:   "bg-blue-100 text-blue-700 border border-blue-200",
  in_progress: "bg-purple-100 text-purple-700 border border-purple-200",
  completed:   "bg-green-100 text-green-700 border border-green-200",
  cancelled:   "bg-red-100 text-red-700 border border-red-200",
  paid:        "bg-green-100 text-green-700 border border-green-200",
  failed:      "bg-red-100 text-red-700 border border-red-200",
  refunded:    "bg-slate-100 text-slate-600 border border-slate-200",
  approved:    "bg-green-100 text-green-700 border border-green-200",
  rejected:    "bg-red-100 text-red-700 border border-red-200",
  assigned:    "bg-blue-100 text-blue-700 border border-blue-200",
};

const STATUS_LABELS: Record<string, string> = {
  pending:     "Pending",
  accepted:    "Accepted",
  confirmed:   "Confirmed",
  in_progress: "In Progress",
  completed:   "Completed",
  cancelled:   "Cancelled",
  paid:        "Paid",
  failed:      "Failed",
  refunded:    "Refunded",
  approved:    "Approved",
  rejected:    "Rejected",
  assigned:    "Assigned",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const style = STATUS_STYLES[status]
    ?? "bg-slate-100 text-slate-600 border border-slate-200";
  const label = STATUS_LABELS[status] ?? status;

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full
        text-xs font-semibold capitalize ${style}`}
    >
      {label}
    </span>
  );
}