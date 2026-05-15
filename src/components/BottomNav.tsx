"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Newspaper, Search, CalendarDays, PenLine, User } from "lucide-react";

const TABS = [
  { label: "홈",    icon: Newspaper,   href: "/" },
  { label: "검색",  icon: Search,      href: "/search" },
  { label: "달력",  icon: CalendarDays, href: "/calendar" },
  { label: "메모",  icon: PenLine,     href: "/memo" },
  { label: "내정보", icon: User,        href: "/profile" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-[#1c1712] flex bg-[#ccc8be]">
      {TABS.map(({ label, icon: Icon, href }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 border-r border-[#b0aa9e] last:border-r-0 transition-all select-none ${
              active
                ? "bg-[#b5b0a5] text-[#1c1712]"
                : "bg-[#e0dbd0] text-[#6b6356] hover:bg-[#d8d3c8]"
            }`}
            style={
              active
                ? {
                    boxShadow:
                      "inset 0 3px 8px rgba(0,0,0,0.28), inset 0 1px 3px rgba(0,0,0,0.18), inset 0 -1px 2px rgba(255,255,255,0.15)",
                  }
                : {
                    boxShadow:
                      "0 -2px 4px rgba(255,255,255,0.55), 0 2px 5px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.4)",
                  }
            }
          >
            <Icon size={18} strokeWidth={active ? 2.5 : 1.5} />
            <span className="text-[9px] tracking-wide font-sans font-bold">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
