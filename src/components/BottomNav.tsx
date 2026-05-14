import Link from "next/link";

const TABS = [
  { label: "오늘자", icon: "📰", href: "/" },
  { label: "화제",   icon: "🔥", href: "/?sort=hot" },
  { label: "투고",   icon: "✒️", href: "/submit" },
  { label: "편성표", icon: "📺", href: "/schedule" },
  { label: "나의 투표", icon: "🗳️", href: "/my-votes" },
];

export default function BottomNav({ active }: { active: string }) {
  return (
    <nav className="border-t-2 border-[#1c1712] flex">
      {TABS.map((tab) => {
        const on = tab.label === active;
        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 border-r border-[#a8a090] last:border-r-0 transition-colors ${
              on
                ? "bg-[#1c1712] text-[#f0ead8]"
                : "bg-[#e8e0c8] text-[#7a7060] hover:bg-[#d8d0b8]"
            }`}
          >
            <span className="text-base leading-none">{tab.icon}</span>
            <span className="text-[9px] tracking-wide font-sans">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
