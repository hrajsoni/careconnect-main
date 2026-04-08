export default function Input({
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full p-4 border rounded-xl focus:ring-2 focus:ring-teal-400 outline-none transition"
    />
  );
}