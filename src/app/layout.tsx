import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";

import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Evalia",
    template: "%s · Evalia",
  },
  description:
    "Evalia — Train Humans. Improve AI. Earn capabilities, complete tasks, and get paid for high-quality human feedback.",
  applicationName: "Evalia",
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={dmSans.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}