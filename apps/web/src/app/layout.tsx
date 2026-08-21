import "@fontsource-variable/estedad";
import "@fontsource-variable/vazirmatn";
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";

import { AppShell } from "@/components/dashboard/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "نبض زرین",
    template: "%s | نبض زرین",
  },
  description: "محصول تحلیلی قابل ردیابی برای تصمیم‌های عملی پذیرندگان زرین‌پال",
};

export const viewport: Viewport = {
  initialScale: 1,
  themeColor: "#f4f6f8",
  viewportFit: "cover",
  width: "device-width",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html dir="rtl" lang="fa">
      <body>
        <a className="skip-link" href="#main-content">
          رفتن به محتوای اصلی
        </a>
        <TooltipProvider>
          <Suspense fallback={<main className="app-content" id="main-content">{children}</main>}>
            <AppShell>{children}</AppShell>
          </Suspense>
        </TooltipProvider>
      </body>
    </html>
  );
}
