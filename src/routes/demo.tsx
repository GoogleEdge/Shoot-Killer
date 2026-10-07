import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteNav } from "@/components/game/site-nav";
import { AiFields } from "@/components/game/ai-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { makePortrait, makeStrangerJpeg } from "@/lib/game/demo-photo";
import { readAiSettings } from "@/lib/game/ai-settings";
import { identifyShot, seedDemoMatch } from "@/lib/game/server";
import { DEMO_PLAYERS, TEAMS, type IdentifyResult } from "@/lib/game/types";
import { useBattleState } from "@/lib/game/use-battle";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/demo")({ component: DemoPage });

function DemoPage() {
  const { state, refresh } = useBattleState(2000);
  const [busy, setBusy] = useState<string | null>(null);
  const [last, setLast] = useState<IdentifyResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const alive = (state?.players ?? []).filter((p) => p.status === "alive");
  const zhou = alive.find((p) => p.name === "周予");

  async function seed() {
    setBusy("seed");
    setLast(null);
    setPreview(null);
    try {
      const portraits = DEMO_PLAYERS.map((p) => ({
        name: p.name,
        imageData: makePortrait(p.name, p.team),
      }));
      const result = await seedDemoMatch({ data: { portraits } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await refresh();
      toast.success("演示局已就位，每人都有一张登记照");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "注入失败");
    } finally {
      setBusy(null);
    }
  }

  async function fire(kind: "hit" | "miss") {
    if (!state?.players.length) {
      toast.error("先注入演示局");
      return;
    }
    setBusy(kind);
    try {
      const imageData = kind === "hit" ? makePortrait("周予", "steel") : makeStrangerJpeg();
      setPreview(imageData);
      const ai = readAiSettings();
      const result = await identifyShot({
        data: {
          shooterName: "林深",
          imageData,
          ...(ai.apiKey.trim()
            ? { ai: { baseUrl: ai.baseUrl, model: ai.model, apiKey: ai.apiKey } }
            : {}),
        },
      });
      setLast(result);
      if (!result.ok) toast.error(result.error);
      else if (result.matched) toast.success(`锁定 ${result.targetName}`);
      else toast.message(result.note);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "识别失败");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-dvh bg-bg px-4 pb-12 pt-4 md:px-6">
      <header className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-sm tracking-widest text-brass">DEMO LAB</p>
          <h1 className="mt-1 font-display text-4xl font-semibold leading-none">演示台</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            没有裁判。注入一局后，模拟林深拍下周予：同一张登记照会直接确认，不必调接口。换一张脸时，按你填的 OpenAI Responses 接口比对。
          </p>
        </div>
        <SiteNav current="/demo" />
      </header>

      <ol className="mx-auto mt-6 grid max-w-6xl gap-2 text-sm md:grid-cols-3">
        {["1. 注入并登记脸", "2. 填接口，或拍同一张登记照", "3. 名字立刻上榜"].map((step) => (
          <li key={step} className="rounded-md border border-line bg-surface px-3 py-2 text-muted">
            {step}
          </li>
        ))}
      </ol>

      <section className="mx-auto mt-4 grid max-w-6xl gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-line bg-surface p-4">
          <h2 className="font-display text-xl font-semibold">1. 开一局</h2>
          <p className="mt-2 text-sm text-muted">清空当前对局，写入 12 名演示选手和各自的登记照。已淘汰的人保持出局。</p>
          <Button className="mt-4 w-full" onClick={() => void seed()} disabled={busy === "seed"}>
            {busy === "seed" ? "正在重置…" : "重置并注入演示局"}
          </Button>
          <p className="mt-3 text-xs text-subtle">
            存活 {state?.alive ?? "—"} · 已登记 {state?.players.filter((p) => p.hasFace).length ?? "—"}
          </p>
        </article>

        <article className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-xl font-semibold">2. 林深开枪</h2>
            <Badge tone="accent">接口</Badge>
          </div>
          <p className="mt-2 text-sm text-muted">
            命中会把周予的登记照再拍一次，不花接口。路人是另一张画面，会走你填的 Responses 接口，不该淘汰任何人。
          </p>
          <AiFields />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button disabled={!!busy || !zhou} onClick={() => void fire("hit")}>
              {busy === "hit" ? "识别中…" : "拍到周予"}
            </Button>
            <Button variant="ghost" disabled={!!busy || alive.length === 0} onClick={() => void fire("miss")}>
              {busy === "miss" ? "识别中…" : "拍到路人"}
            </Button>
          </div>
          {preview && (
            <img src={preview} alt="这次模拟的画面" className="mt-4 h-40 w-full rounded-md object-cover" />
          )}
          <ResultLine result={last} />
          <Link to="/" className="mt-3 block text-sm text-accent">
            打开横屏战场
          </Link>
        </article>

        <article className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">3. 淘汰榜</h2>
            <Badge tone="flare">{state?.eliminated ?? 0} 人出局</Badge>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {(state?.feed ?? []).map((item) => (
              <li key={item.id} className="rounded-md border border-line bg-raised px-3 py-2 text-sm">
                <span className="font-medium text-flare">{item.targetName}</span>
                <span className="text-subtle"> 被 {item.shooterName} 淘汰</span>
              </li>
            ))}
            {(state?.feed.length ?? 0) === 0 && <li className="text-sm text-subtle">还没有人被锁定</li>}
          </ul>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {alive.map((p) => (
              <span key={p.id} className="rounded-full border border-line px-2 py-0.5 text-xs">
                {p.name}
                <span className="ml-1 text-subtle">{TEAMS[p.team].label}</span>
              </span>
            ))}
          </div>
          <Link to="/board" className="mt-4 block text-sm text-accent">
            打开淘汰大屏
          </Link>
        </article>
      </section>
    </main>
  );
}

function ResultLine({ result }: { result: IdentifyResult | null }) {
  if (!result) return <p className="mt-3 text-xs text-subtle">识别结果会写在这里</p>;
  if (!result.ok) return <p className="mt-3 text-sm text-flare">{result.error}</p>;
  if (!result.matched) return <p className="mt-3 text-sm text-muted">{result.note}</p>;
  return (
    <p className={cn("mt-3 text-sm", "text-flare")}>
      锁定 {result.targetName}
      <span className="ml-2 text-xs text-subtle">
        {result.via === "api" ? `AI ${Math.round(result.confidence * 100)}` : "登记照完全一致"}
      </span>
    </p>
  );
}
