import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ArbiShield",
  description: "AI wallet guidance for safer moves on Arbitrum.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body
        className="min-h-full bg-slate-950 font-sans text-slate-100"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
