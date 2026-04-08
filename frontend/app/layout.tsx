import "./globals.css";
import Navbar from "@/components/Navbar";
import CsrfLoader from "@/app/CsrfLoader";

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
        <CsrfLoader />
        <Navbar />
        <main className="pt-20">{children}</main>
      </body>
    </html>
  );
}
