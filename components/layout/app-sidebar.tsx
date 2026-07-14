"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Tags,
  ScrollText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "./brand-logo";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "", label: "Overview", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/services", label: "Services", icon: Tags },
  { href: "/logs", label: "Activity", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SidebarNav({
  slug,
  businessName,
  onNavigate,
}: {
  slug: string;
  businessName: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const base = `/b/${slug}`;

  return (
    <>
      <div className="px-4 py-5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/50">
          Workspace
        </p>
        <p className="mt-1 truncate text-sm font-medium text-sidebar-foreground">
          {businessName}
        </p>
      </div>
      <Separator className="bg-sidebar-border" />
      <nav className="flex flex-col gap-0.5 p-3">
        {navItems.map((item) => {
          const href = `${base}${item.href}`;
          const isActive =
            item.href === "" ? pathname === base : pathname.startsWith(href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function AppSidebar({
  slug,
  businessName,
}: {
  slug: string;
  businessName: string;
}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-14 items-center border-b border-sidebar-border px-5">
        <BrandLogo invert className="text-sidebar-foreground" />
      </div>
      <SidebarNav slug={slug} businessName={businessName} />
    </aside>
  );
}
