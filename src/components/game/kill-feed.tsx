import type { FeedItem } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export function KillTicker({ feed }: { feed: FeedItem[] }) {
  if (feed.length === 0) {
    return (
      <p className="px-4 py-2 text-xs tracking-wide text-subtle">等待第一发有效击杀</p>
    );
  }
  const loop = [...feed, ...feed];
  return (
    <div className="overflow-hidden border-y border-line bg-surface/80">
      <div className={cn("flex w-max gap-6 py-2", feed.length > 2 && "kill-ticker")}>
        {loop.map((item, i) => (
          <p
            key={`${item.id}-${i}`}
            className="shrink-0 px-2 font-display text-sm tracking-wide text-fg"
          >
            <span className="text-accent">{item.shooterName}</span>
            <span className="mx-1.5 text-subtle">淘汰</span>
            <span className="text-flare">{item.targetName}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function KillList({ feed }: { feed: FeedItem[] }) {
  if (feed.length === 0) {
    return <p className="text-sm text-subtle">还没有人被淘汰</p>;
  }
  return (
    <ol className="flex flex-col gap-2">
      {feed.map((item) => (
        <li
          key={item.id}
          className="flex items-baseline justify-between gap-3 rounded-[12px] border border-line bg-raised px-3 py-2"
        >
          <p className="text-sm">
            <span className="font-medium text-fg">{item.targetName}</span>
            <span className="mx-1.5 text-subtle">被</span>
            <span className="text-accent">{item.shooterName}</span>
            <span className="ml-1.5 text-subtle">淘汰</span>
          </p>
        </li>
      ))}
    </ol>
  );
}
