"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import {
  ActivityIcon,
  BotIcon,
  ChartNoAxesCombinedIcon,
  CircleGaugeIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";

import { FilterBar } from "@/components/dashboard/filter-bar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/hooks/use-hydrated";

const navigation = [
  { href: "/", label: "مرکز اقدام", short: "اقدام", icon: CircleGaugeIcon },
  { href: "/growth", label: "رشد", short: "رشد", icon: ChartNoAxesCombinedIcon },
  { href: "/reliability", label: "پایداری پرداخت", short: "پایداری", icon: ShieldCheckIcon },
  { href: "/evidence", label: "شواهد و تحلیل‌گر", short: "تحلیل‌گر", icon: BotIcon },
] as const;

const isCurrent = (pathname: string, href: string) =>
  href === "/" ? pathname === href : pathname.startsWith(href);

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hydrated = useHydrated();
  const query = searchParams.toString();
  const withFilters = (href: string) => (query ? `${href}?${query}` : href);

  return (
    <SidebarProvider
      className="min-h-dvh"
      defaultOpen
      dir="rtl"
      style={{ "--sidebar-width": "17.5rem" } as CSSProperties}
    >
      <div
        className="flex min-h-dvh w-full"
        data-hydrated={hydrated}
        data-testid="app-shell"
      >
        <Sidebar
          className="hidden lg:flex"
          collapsible="none"
          data-testid="desktop-sidebar"
          side="right"
        >
          <SidebarHeader className="gap-5 px-5 py-6">
            <Link className="flex items-center gap-3" href={withFilters("/")}>
              <span className="brand-mark" aria-hidden="true">
                <ActivityIcon />
              </span>
              <span className="min-w-0">
                <strong className="block font-heading text-xl">نبض زرین</strong>
                <span className="block text-xs text-sidebar-foreground/65">
                  تصمیم روشن، عدد قابل پیگیری
                </span>
              </span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={isCurrent(pathname, item.href)}
                          size="lg"
                          tooltip={item.label}
                        >
                          <Link href={withFilters(item.href)}>
                            <Icon />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="gap-3 px-5 py-5">
            <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/45 p-3 text-xs leading-6 text-sidebar-foreground/75">
              <span className="mb-1 flex items-center gap-2 font-medium text-sidebar-foreground">
                <SparklesIcon aria-hidden="true" />
                تحلیل قطعی، توضیح هوشمند
              </span>
              مدل فقط شواهد ثبت‌شده را توضیح می‌دهد؛ محاسبه شاخص‌ها مستقل است.
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="min-w-0 bg-background">
          <header className="mobile-brand lg:hidden">
            <Link className="flex items-center gap-2" href={withFilters("/")}>
              <span className="brand-mark brand-mark-small" aria-hidden="true">
                <ActivityIcon />
              </span>
              <strong className="font-heading text-lg">نبض زرین</strong>
            </Link>
            <span className="text-xs text-muted-foreground">
              {searchParams.get("merchant_key") ?? "M43"}
            </span>
          </header>
          <FilterBar key={query} />
          <main className="app-content" id="main-content">
            {children}
          </main>
        </SidebarInset>

        <nav
          aria-label="ناوبری اصلی موبایل"
          className="mobile-bottom-nav lg:hidden"
          data-testid="mobile-bottom-nav"
        >
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isCurrent(pathname, item.href);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={cn("mobile-nav-link", active && "is-active")}
                href={withFilters(item.href)}
                key={item.href}
              >
                <Icon aria-hidden="true" />
                <span>{item.short}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </SidebarProvider>
  );
}
