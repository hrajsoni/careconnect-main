import "./globals.css";
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast";

export const metadata = {
  title: "CareConnect - Home Healthcare Platform",
  description: "Book nurses and care companions easily from home.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans bg-slate-50 text-slate-800">
        <Toaster position="top-right" />
        <Navbar />
        <main className="pt-20">{children}</main>
      </body>
    </html>
  );
}