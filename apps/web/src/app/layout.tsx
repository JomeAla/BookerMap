import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistry } from "@/components/pwa/service-worker-registry";
import { InstallPrompt } from "@/components/pwa/install-prompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BookerMap - Multi-Tenant Booking Platform",
  description: "Manage bookings, customers, and payments across multiple locations",
  manifest: "/manifest.json",
  other: {
    "theme-color": "#3b82f6",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "BookerMap",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BookerMap" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
        <script dangerouslySetInnerHTML={{
          __html: `try { const t = localStorage.getItem('theme'); if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.classList.add('dark') } catch(e) {}`
        }} />
      </head>
      <body className="min-h-full">
        {children}
        <ServiceWorkerRegistry />
        <InstallPrompt />
      </body>
    </html>
  );
}
