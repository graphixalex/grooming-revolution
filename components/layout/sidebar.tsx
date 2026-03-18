"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { BarChart3, CalendarDays, CreditCard, Dog, Home, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "OWNER" | "MANAGER" | "STAFF";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: Home, roles: ["OWNER", "MANAGER"] as Role[] },
  { href: "/planner", label: "Agenda", icon: CalendarDays, roles: ["OWNER", "MANAGER", "STAFF"] as Role[] },
  { href: "/clients", label: "Clienti", icon: Users, roles: ["OWNER", "MANAGER", "STAFF"] as Role[] },
  { href: "/pricing", label: "Listino", icon: CreditCard, roles: ["OWNER", "MANAGER"] as Role[] },
  { href: "/reports", label: "Report", icon: BarChart3, roles: ["OWNER", "MANAGER"] as Role[] },
  { href: "/branches", label: "Multi-sede", icon: Users, roles: ["OWNER", "MANAGER"] as Role[] },
  { href: "/payments", label: "Movimenti", icon: CreditCard, roles: ["OWNER", "MANAGER"] as Role[] },
  { href: "/settings", label: "Impostazioni", icon: Settings, roles: ["OWNER", "MANAGER"] as Role[] },
  { href: "/billing", label: "Billing", icon: Dog, roles: ["OWNER", "MANAGER"] as Role[] },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const visibleLinks = links.filter((link) => link.roles.includes(role));
  return (
    <>
      <div className="border-b border-zinc-200 bg-white p-3 md:hidden">
        <div className="mb-2 flex h-24 items-center justify-center overflow-hidden rounded-xl border border-rose-300 bg-gradient-to-r from-rose-100 via-rose-100 to-pink-200 px-2 py-2 text-sm font-bold text-[#0f1f3d] shadow-sm">
          <Image
            src="/img/logo-grooming-revolution.png"
            alt="Grooming Revolution"
            width={640}
            height={180}
            className="h-full w-full origin-center object-contain object-center scale-[3] translate-y-[7px]"
            priority
          />
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1">
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm",
                  active ? "bg-zinc-900 text-white shadow-sm" : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <aside className="hidden w-64 border-r border-zinc-200 bg-white/95 p-4 backdrop-blur-sm md:block">
        <div className="mb-6 flex h-24 items-center justify-center overflow-hidden rounded-xl border border-rose-300 bg-gradient-to-r from-rose-100 via-rose-100 to-pink-200 p-2 font-bold tracking-wide text-[#0f1f3d] shadow-sm">
          <Image
            src="/img/logo-grooming-revolution.png"
            alt="Grooming Revolution"
            width={640}
            height={180}
            className="h-full w-full origin-center object-contain object-center scale-[3] translate-y-[7px]"
          />
        </div>
        <nav className="space-y-1">
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all",
                  active ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-700 hover:bg-zinc-100",
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

