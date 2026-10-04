"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  BookOpenCheck,
  Award,
  Wallet,
  ArrowDownToLine,
  Bell,
  User,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { AuthUser } from "@/server/auth/guards";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/assessments", label: "Assessments", icon: BookOpenCheck },
  { href: "/capabilities", label: "Capabilities", icon: Award },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/withdrawals", label: "Withdrawals", icon: ArrowDownToLine },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ user }: { user: AuthUser }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-background md:block">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <img
            src="/logo.png"
            alt="Evalia"
            className="h-10 w-10 rounded-md object-contain"
          />
          <span>Evalia</span>
        </Link>
      </div>

      <nav className="flex flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t p-4">
        <p className="text-xs text-muted-foreground">Signed in as</p>
        <p className="truncate text-sm font-medium">{user.name ?? user.email}</p>
        <p className="text-xs text-muted-foreground">{user.role}</p>
      </div>
    </aside>
  );
}