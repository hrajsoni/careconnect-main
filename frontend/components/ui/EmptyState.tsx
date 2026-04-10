"use client";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export default function EmptyState({
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center
      py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100
        flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-slate-400"
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2
            2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16
            0H4" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-slate-500 text-sm max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 rounded-xl bg-teal-600
            text-white text-sm font-semibold hover:bg-teal-700
            transition"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}