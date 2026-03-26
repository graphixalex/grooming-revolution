"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import { BarChart3, CalendarDays, CreditCard, Dog, HelpCircle, Home, MessageSquare, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "OWNER" | "MANAGER" | "STAFF";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: Home, roles: ["OWNER", "MANAGER"] as Role[] },
  { href: "/planner", label: "Agenda", icon: CalendarDays, roles: ["OWNER", "MANAGER", "STAFF"] as Role[] },
  { href: "/clients", label: "Clienti", icon: Users, roles: ["OWNER", "MANAGER", "STAFF"] as Role[] },
  { href: "/messages", label: "Messaggi", icon: MessageSquare, roles: ["OWNER", "MANAGER", "STAFF"] as Role[] },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageSquare, roles: ["OWNER", "MANAGER"] as Role[] },
  { href: "/pricing", label: "Listino", icon: CreditCard, roles: ["OWNER", "MANAGER"] as Role[] },
  { href: "/reports", label: "Report", icon: BarChart3, roles: ["OWNER", "MANAGER"] as Role[] },
  { href: "/operator-reports", label: "Report operatori", icon: BarChart3, roles: ["OWNER"] as Role[] },
  { href: "/branches", label: "Multi-sede", icon: Users, roles: ["OWNER", "MANAGER"] as Role[] },
  { href: "/payments", label: "Movimenti", icon: CreditCard, roles: ["OWNER", "MANAGER"] as Role[] },
  { href: "/support", label: "Supporto", icon: HelpCircle, roles: ["OWNER", "MANAGER", "STAFF"] as Role[] },
  { href: "/settings", label: "Impostazioni", icon: Settings, roles: ["OWNER", "MANAGER"] as Role[] },
  { href: "/billing", label: "Billing", icon: Dog, roles: ["OWNER", "MANAGER"] as Role[] },
];

export function Sidebar({ role, isPlatformAdmin = false }: { role: Role; isPlatformAdmin?: boolean }) {
  const pathname = usePathname();
  const [pendingMessages, setPendingMessages] = useState(0);
  const visibleLinks = links.filter((link) => link.roles.includes(role));
  const allLinks =
    role === "OWNER" && isPlatformAdmin
      ? [...visibleLinks, { href: "/admin", label: "Admin", icon: BarChart3, roles: ["OWNER"] as Role[] }]
      : visibleLinks;

  useEffect(() => {
    let mounted = true;
    async function loadPending() {
      try {
        const res = await fetch("/api/booking-requests/pending-count", { cache: "no-store" });
        const data = await res.json();
        if (!mounted) return;
        setPendingMessages(Number(data.count || 0));
      } catch {
        if (!mounted) return;
        setPendingMessages(0);
      }
    }
    void loadPending();
    const id = window.setInterval(() => void loadPending(), 20000);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, []);

  return (
    <>
      <div className="border-b border-zinc-200 bg-white p-3 md:hidden">
        <div className="mb-2 flex h-24 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white px-2 py-2 text-sm font-bold text-[#0f1f3d] shadow-sm">
          <Image
            src="/img/logo-grooming-revolution.png"
            alt="Grooming Revolution"
            width={640}
            height={180}
            className="h-full w-full object-contain object-center"
            priority
          />
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1">
          {allLinks.map((link) => {
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
                {link.href === "/messages" && pendingMessages > 0 ? (
                  <span className="ml-1 inline-flex h-2.5 w-2.5 rounded-full bg-red-500" title={`${pendingMessages} nuove richieste`} />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>

      <aside className="hidden w-64 border-r border-zinc-200 bg-white/95 p-4 backdrop-blur-sm md:block">
        <div className="mb-6 flex h-24 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white p-2 font-bold tracking-wide text-[#0f1f3d] shadow-sm">
          <Image
            src="/img/logo-grooming-revolution.png"
            alt="Grooming Revolution"
            width={640}
            height={180}
            className="h-full w-full object-contain object-center"
          />
        </div>
        <nav className="space-y-1">
          {allLinks.map((link) => {
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
                {link.href === "/messages" && pendingMessages > 0 ? (
                  <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {pendingMessages > 99 ? "99+" : pendingMessages}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

