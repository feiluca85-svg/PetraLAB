import type { Metadata, Viewport } from "next";

import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import PwaRegistration from "@/components/PwaRegistration";





export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#25D366" },
    { media: "(prefers-color-scheme: dark)", color: "#0B141A" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "PetraLAB • Tutor Intelligente",
  description: "AI Tutor Socratico e Gestione Sicura dello Studio",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PetraLAB",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`h-full antialiased`}
    >
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
        <PwaRegistration />
      </body>
    </html>
  );
}
