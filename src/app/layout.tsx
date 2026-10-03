import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Imaginarte · Gestão de encomendas",
  description: "Gestão simples e bonita das encomendas Imaginarte.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/logo_mini.png", type: "image/png" }],
    apple: [{ url: "/logo_mini.png", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#286957",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-PT" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
