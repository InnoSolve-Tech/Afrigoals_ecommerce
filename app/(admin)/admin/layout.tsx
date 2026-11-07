"use client";

import {
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  ShoppingCart,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/app/BrandLogo";
import { Button } from "@/components/ui/button";
import { useAuthState } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Commerce insights", href: "/admin/insights", icon: ReceiptText },
  { label: "Partner stores", href: "/admin/partner-stores", icon: Package },
  {
    label: "Email campaigns",
    href: "/admin/email-campaigns",
    icon: ReceiptText,
  },
  { label: "Rider accounts", href: "/admin/riders", icon: Package },
  { label: "Vendor accounts", href: "/admin/vendors", icon: Package },
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Inventory", href: "/admin/inventory", icon: Package },
  { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { label: "Reconciliation", href: "/admin/reconciliation", icon: ReceiptText },
  { label: "Payments", href: "/admin/payments", icon: CreditCard },
  { label: "Refunds and returns", href: "/admin/refunds", icon: ReceiptText },
  { label: "Delivery pricing", href: "/admin/delivery-pricing", icon: Package },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, status, user } = useAuthState();
  const isSignInPage = pathname === "/admin/signin";
  const canAccess = status === "signed_in" && user?.role === "admin";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  useEffect(() => {
    if (!isSignInPage && status !== "loading" && !canAccess) {
      router.replace(`/admin/signin?next=${encodeURIComponent(pathname)}`);
    }
  }, [isSignInPage, status, canAccess, pathname, router]);

  async function handleSignOut() {
    setIsSigningOut(true);
    setLogoutError("");

    try {
      await signOut();
      window.location.replace("/admin/signin");
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : "Could not sign out",
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  if (isSignInPage)
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        {children}
      </main>
    );
  if (!canAccess || isSigningOut)
    return (
      <main className="p-8" aria-busy="true">
        {isSigningOut ? "Signing out…" : "Checking admin access…"}
      </main>
    );

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <BrandLogo size="xs" />
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Admin
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-64 border-r border-zinc-200 bg-white transition-transform dark:border-zinc-800 dark:bg-zinc-900",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center border-b border-zinc-200 px-6 dark:border-zinc-800">
            <Link
              href="/admin"
              className="flex items-center gap-2"
              onClick={() => setSidebarOpen(false)}
            >
              <BrandLogo size="xs" />
              <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Admin
              </span>
            </Link>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-3 border-t border-zinc-200 px-3 py-4 dark:border-zinc-800">
            {logoutError && (
              <p role="alert" className="px-3 text-sm text-red-600">
                {logoutError}
              </p>
            )}
            {pathname !== "/admin/signin" ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start gap-3 px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                <LogOut className="h-5 w-5" />
                {isSigningOut ? "Signing out..." : "Logout"}
              </Button>
            ) : null}

            <Link
              href="/"
              onClick={() => setSidebarOpen(false)}
              className="block px-3 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              ← Back to Store
            </Link>
          </div>
        </div>
      </aside>

      <main className="flex-1 pt-14 lg:ml-64 lg:pt-0">
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
