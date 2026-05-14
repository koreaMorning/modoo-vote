"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Newspaper, Bookmark, CalendarDays, PenLine, User } from "lucide-react";

const TABS = [
  { label: "최신글", icon: Newspaper, href: "/" },
  { label: "스크랩", icon: Bookmark,   href: "/scrap" },
  { label: "달력",   icon: CalendarDays, href: "/calendar" },
  { label: "메모",   icon: PenLine,    href: "/memo" },
  { label: "내정보", icon: User,        href: "/profile" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-[#1c1712] flex bg-[#F0EDE6]">
      {TABS.map(({ label, icon: Icon, href }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 border-r border-[#c8bfa8] last:border-r-0 transition-colors ${
              active
                ? "bg-[#1c1712] text-[#F0EDE6]"
                : "text-[#6b6356] hover:bg-[#1c1712]/5"
            }`}
          >
            <Icon size={18} strokeWidth={active ? 2.5 : 1.5} />
            <span className="text-[9px] tracking-wide font-sans font-bold">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
