import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/game/site-nav";
import { Badge } from "@/components/ui/badge";
import { getShotImage } from "@/lib/game/server";
import { TEAMS } from "@/lib/game/types";
import { useBattleState } from "@/lib/game/use-battle";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/board")({ component: BoardPage });

function BoardPage() {
  const { state } = useBattleState(2000);
  const latest = state?.feed[0];
  const [latestImage, setLatestImage] = useState<string | null>(null);

  useEffect(() => {
    if (!latest) {
      setLatestImage(null);
      return;
    }
    let alive = true;
    getShotImage({ data: { id: latest.id } })
      .then((row) => {
        if (alive) setLatestImage(row?.imageData ?? null);
      })
      .catch(() => {
        if (alive) setLatestImage(null);
      });
    return () => {
      alive = false;
    };
  }, [latest?.id]);

  const dead = state?.players.filter((p) => p.status === "eliminated") ?? [];
  const flareAlive = state?.players.filter((p) => p.team === "flare" && p.status === "alive") ?? [];
  const steelAlive = state?.players.filter((p) => p.team === "steel" && p.status === "alive") ?? [];

  return (
    <main className="min-h-dvh bg-bg px-4 pb-12 pt-4 md:px-8">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-end gap-4">
          <div>
            <p className="font-display text-sm tracking-widest text-brass">SHUTTER KILL</p>
            <h1 className="font-display text-4xl font-semibold leading-none md:text-5xl">淘汰榜</h1>
          </div>
          <Badge tone="live" className="mb-1">
            <span className="live-dot size-1.5 rounded-full bg-accent" />
            LIVE
          </Badge>
        </div>
        <SiteNav current="/board" />
      </header>

      <section className="mx-auto mt-6 grid max-w-6xl grid-cols-2 gap-3">
        <ScorePlate label="焰组存活" count={state ? flareAlive.length : "—"} tone="flare" />
        <ScorePlate label="钢组存活" count={state ? steelAlive.length : "—"} tone="steel" />
      </section>

      <section className="mx-auto mt-4 grid max-w-6xl gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <article className="overflow-hidden rounded-xl border border-line bg-surface">
          {latest && latestImage ? (
            <img
              src={latestImage}
              alt={`${latest.targetName} 被淘汰`}
              className="aspect-video w-full object-cover"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center">
              <p className="text-sm text-subtle">等待下一发锁定</p>
            </div>
          )}
          <div className="px-5 py-4">
            {latest ? (
              <>
                <p className="text-xs tracking-wide text-subtle">刚刚淘汰</p>
                <p className="mt-1 font-display text-4xl font-semibold leading-none">{latest.targetName}</p>
                <p className="mt-2 text-sm text-muted">
                  击杀者 <span className="text-accent">{latest.shooterName}</span>
                </p>
              </>
            ) : (
              <p className="text-sm text-muted">接口认出已登记的人之后，名字会出现在这里</p>
            )}
          </div>
        </article>

        <aside className="rounded-xl border border-line bg-surface px-5 py-5">
          <p className="text-xs tracking-wide text-subtle">已淘汰</p>
          <p className="mt-2 font-display text-5xl font-semibold tabular-nums leading-none text-flare">
            {state?.eliminated ?? "—"}
          </p>
          <ul className="mt-5 flex flex-col gap-2">
            {dead.map((p) => (
              <li key={p.id} className="flex items-baseline justify-between gap-3 border-b border-line py-2">
                <span className="font-display text-xl font-semibold">{p.name}</span>
                <span className="text-xs text-subtle">{TEAMS[p.team].label}</span>
              </li>
            ))}
            {dead.length === 0 && <li className="text-sm text-subtle">还没有人被点名</li>}
          </ul>
        </aside>
      </section>

      <section className="mx-auto mt-8 grid max-w-6xl gap-6 md:grid-cols-2">
        <Roster title="焰组" names={flareAlive.map((p) => p.name)} tone="flare" ready={!!state} />
        <Roster title="钢组" names={steelAlive.map((p) => p.name)} tone="steel" ready={!!state} />
      </section>
    </main>
  );
}

function ScorePlate({
  label,
  count,
  tone,
}: {
  label: string;
  count: number | string;
  tone: "flare" | "steel";
}) {
  return (
    <div className="rounded-xl border border-line bg-surface px-5 py-4">
      <p className={cn("text-xs tracking-wide", tone === "flare" ? "text-flare" : "text-accent")}>{label}</p>
      <p className="mt-1 font-display text-5xl font-semibold tabular-nums leading-none">{count}</p>
    </div>
  );
}

function Roster({
  title,
  names,
  tone,
  ready,
}: {
  title: string;
  names: string[];
  tone: "flare" | "steel";
  ready: boolean;
}) {
  return (
    <div>
      <h2 className={cn("font-display text-2xl font-semibold", tone === "flare" ? "text-flare" : "text-accent")}>
        {title}
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {!ready && <li className="text-sm text-subtle">同步中</li>}
        {ready &&
          names.map((name) => (
            <li key={name} className="rounded-full border border-line bg-surface px-3 py-1 text-sm">
              {name}
            </li>
          ))}
        {ready && names.length === 0 && <li className="text-sm text-subtle">全员出局</li>}
      </ul>
    </div>
  );
}
