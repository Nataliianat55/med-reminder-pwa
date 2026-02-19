import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Нагадування про ліки",
  description: "Офлайн PWA для розкладу прийому ліків (локальне збереження, без реєстрації).",
  applicationName: "Нагадування про ліки",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ліки"
  },
  formatDetection: { telephone: false },
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  themeColor: "#F2F2F7",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}

