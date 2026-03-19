import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signal Scout Periscope",
  description: "Competitive intelligence at a glance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-slate-50 text-slate-900 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
