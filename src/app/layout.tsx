import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  themeColor: "#22C55E",
};

export const metadata: Metadata = {
  title: "Espace Jeunes - Mission. Prospérité.",
  description: "Plateforme de missions et micro-crédits pour les jeunes. Gagnez avec vos créations et accédez au micro-crédit.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Espace Jeunes",
  },
  openGraph: {
    type: "website",
    title: "Espace Jeunes - Mission. Prospérité.",
    description: "Plateforme de missions et micro-crédits pour les jeunes. Gagnez avec vos créations et accédez au micro-crédit.",
    siteName: "Espace Jeunes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className={`${inter.variable} font-[Inter] antialiased`}>
        {children}
      </body>
    </html>
  );
}
