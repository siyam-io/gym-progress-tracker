import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PULSE | Gym Floor Workout Tracker",
  description: "Offline-first dark-mode gym workout logger with ghost placeholders, drift-free rest timer, and Brzycki 1RM PR engine.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pulse Gym",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { BottomNav } from "@/components/navigation/BottomNav";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { GlobalSyncManager } from "@/components/providers/GlobalSyncManager";
import { ToastContainer } from "@/components/ui/ToastContainer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col md:flex-row bg-zinc-950 text-zinc-100 selection:bg-emerald-500 selection:text-zinc-950">
        <AuthProvider>
          <GlobalSyncManager />
          <ToastContainer />
          <ServiceWorkerRegister />
          {/* Desktop Left Sidebar Navigation */}
          <DesktopSidebar />

          {/* Main App Viewport */}
          <div className="flex-1 min-w-0 flex flex-col">
            {children}
          </div>

          {/* Mobile Bottom Navigation */}
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
