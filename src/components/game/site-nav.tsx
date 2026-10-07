import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/", label: "战场" },
  { to: "/board", label: "淘汰榜" },
  { to: "/demo", label: "演示" },
] as const;

export function SiteNav({ current }: { current: (typeof LINKS)[number]["to"] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-xs text-muted">
      {LINKS.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className={cn(
            "rounded-full px-2.5 py-1 transition-colors duration-150",
            current === link.to ? "bg-raised text-fg" : "hover:text-fg",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
