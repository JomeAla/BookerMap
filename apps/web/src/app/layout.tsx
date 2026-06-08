import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import { Providers } from "@/lib/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BookerMap — Smart Booking Platform for Home Service Businesses",
  description:
    "All-in-one booking platform for African home service businesses. Manage bookings, dispatch technicians, process payments via Paystack and Flutterwave, and grow your business with BookerMap.",
  manifest: "/manifest.json",
  keywords: ["booking software", "scheduling platform", "home services", "dispatch management", "payment processing", "African businesses", "Nigeria", "Ghana", "Kenya", "South Africa"],
  openGraph: {
    title: "BookerMap — Smart Booking Platform for Home Service Businesses",
    description:
      "All-in-one booking platform for African home service businesses. Manage bookings, dispatch technicians, process payments, and grow your business with BookerMap.",
    type: "website",
    siteName: "BookerMap",
    locale: "en_US",
    images: [{ url: "/icons/icon.svg", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BookerMap — Smart Booking Platform",
    description: "All-in-one booking platform for African home service businesses.",
  },
  other: {
    "theme-color": "#D97706",
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
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
        <Script
          id="dark-mode"
          strategy="beforeInteractive"
        >{`try { const t = localStorage.getItem('theme'); if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.classList.add('dark') } catch(e) {}`}</Script>
        <Script
          id="json-ld"
          type="application/ld+json"
          strategy="beforeInteractive"
        >{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "BookerMap",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web",
          "description": "All-in-one booking platform for African home service businesses. Manage bookings, dispatch technicians, process payments via Paystack and Flutterwave.",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD", "description": "14-day free trial" },
          "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "reviewCount": "127" },
        })}</Script>
      </head>
      <body className="min-h-full">
        <Providers><PwaProvider>{children}</PwaProvider></Providers>
      </body>
    </html>
  );
}
