"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { BarChart3, CalendarDays, CreditCard, Dog, Home, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/planner", label: "Agenda", icon: CalendarDays },
  { href: "/clients", label: "Clienti", icon: Users },
  { href: "/pricing", label: "Listino", icon: CreditCard },
  { href: "/reports", label: "Report", icon: BarChart3 },
  { href: "/branches", label: "Multi-sede", icon: Users },
  { href: "/payments", label: "Movimenti", icon: CreditCard },
  { href: "/settings", label: "Impostazioni", icon: Settings },
  { href: "/billing", label: "Billing", icon: Dog },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <>
      <div className="border-b border-zinc-200 bg-white p-3 md:hidden">
        <div className="mb-2 flex h-24 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-2 py-2 text-sm font-bold text-zinc-900 shadow-sm">
          <Image
            src="/img/logo-grooming-revolution.png"
            alt="Grooming Revolution"
            width={640}
            height={180}
            className="h-full w-full origin-center object-contain object-center scale-[3.2]"
            priority
          />
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1">
          {links.map((link) => {
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
        <div className="mb-6 flex h-24 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 p-2 font-bold tracking-wide text-zinc-900 shadow-sm">
          <Image
            src="/img/logo-grooming-revolution.png"
            alt="Grooming Revolution"
            width={640}
            height={180}
            className="h-full w-full origin-center object-contain object-center scale-[3]"
          />
        </div>
        <nav className="space-y-1">
          {links.map((link) => {
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

