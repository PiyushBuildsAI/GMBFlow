"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import type { Business } from "@/lib/types";
import { AppSidebar, SidebarNav } from "./app-sidebar";
import { BrandLogo } from "./brand-logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function DashboardShell({
  business,
  children,
}: {
  business: Business;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-muted/40">
      <AppSidebar slug={business.slug} businessName={business.name} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background px-4 lg:px-8">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="size-5" />
                </Button>
              }
            />
            <SheetContent
              side="left"
              className="w-72 bg-sidebar p-0 text-sidebar-foreground"
            >
              <div className="flex h-14 items-center border-b border-sidebar-border px-5">
                <BrandLogo className="text-sidebar-foreground" />
              </div>
              <SidebarNav
                slug={business.slug}
                businessName={business.name}
                onNavigate={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <div className="lg:hidden">
            <BrandLogo />
          </div>
          <p className="ml-auto truncate text-sm text-muted-foreground">
            {business.name}
          </p>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
