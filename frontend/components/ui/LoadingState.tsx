"use client";

type LoadingStateProps = {
  message?: string;
  fullPage?: boolean;
};

export default function LoadingState({
  message = "Loading...",
  fullPage = false,
}: LoadingStateProps) {
  const classes = fullPage
    ? "min-h-screen flex items-center justify-center"
    : "flex items-center justify-center py-20";

  return (
    <div className={classes}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-teal-500
          border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">{message}</p>
      </div>
    </div>
  );
}