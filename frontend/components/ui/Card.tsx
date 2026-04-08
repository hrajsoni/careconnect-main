export default function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-3xl shadow-xl p-8 border border-slate-100 ${className}`}
    >
      {children}
    </div>
  );
}