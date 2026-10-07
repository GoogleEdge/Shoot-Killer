import { createFileRoute, Link } from "@tanstack/react-router";
import { Aperture, Crosshair, ImagePlus, ScanFace, ScrollText, Settings2, SwitchCamera } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { SiteNav } from "@/components/game/site-nav";
import { AiFields } from "@/components/game/ai-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { blobToJpegDataUrl, videoFrameToJpeg } from "@/lib/game/compress";
import { clearIdentity, readIdentity, writeIdentity, type Identity } from "@/lib/game/identity";
import { readAiSettings } from "@/lib/game/ai-settings";
import { identifyShot, joinBattle, listMyShots } from "@/lib/game/server";
import { TEAMS, type IdentifyResult, type Player, type Shot, type TeamId } from "@/lib/game/types";
import { useBattleState } from "@/lib/game/use-battle";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: PlayerHome });

function PlayerHome() {
  const [identity, setIdentity] = useState<Identity | null>(null);

  useEffect(() => {
    setIdentity(readIdentity());
  }, []);

  return (
    <>
      <RotatePrompt />
      <div className="only-landscape">
        {identity ? (
          <Arena
            identity={identity}
            onLeave={() => {
              clearIdentity();
              setIdentity(null);
            }}
          />
        ) : (
          <JoinGate onJoin={setIdentity} />
        )}
      </div>
    </>
  );
}

function RotatePrompt() {
  return (
    <section className="only-portrait bg-bg px-8 text-center">
      <p className="font-display text-sm tracking-widest text-brass">SHUTTER KILL</p>
      <h1 className="mt-3 font-display text-5xl font-semibold leading-none">快门杀</h1>
      <p className="mt-4 font-display text-2xl font-semibold">请转成横屏</p>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
        这是一场横屏对决。把设备横过来，登记正脸，对准对手按下快门。接口认出谁，谁就立刻出局。
      </p>
      <div className="mt-8 h-16 w-28 rounded-lg border border-brass/70" aria-hidden />
    </section>
  );
}

function JoinGate({ onJoin }: { onJoin: (id: Identity) => void }) {
  const [name, setName] = useState("");
  const [team, setTeam] = useState<TeamId>("steel");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { state } = useBattleState(8000);
  const enrolled = state?.players.filter((p) => p.hasFace).length ?? 0;

  async function join() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("先写上你的名字");
      return;
    }
    if (!photo) {
      toast.error("先拍一张正脸");
      return;
    }
    setBusy(true);
    try {
      const result = await joinBattle({ data: { name: trimmed, team, portrait: photo } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const ident = { name: trimmed, team };
      writeIdentity(ident);
      onJoin(ident);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加入失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex h-full min-h-0 flex-col px-4 py-3">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Badge tone="live">
            <span className="live-dot size-1.5 rounded-full bg-accent" />
            LIVE
          </Badge>
          <p className="font-display text-sm tracking-widest text-brass">SHUTTER KILL</p>
        </div>
        <SiteNav current="/" />
      </header>

      <div className="mt-3 grid min-h-0 flex-1 grid-cols-[minmax(0,0.85fr)_minmax(0,1.1fr)_minmax(0,0.9fr)] gap-3">
        <section className="flex flex-col justify-center rounded-xl border border-line bg-surface p-5">
          <h1 className="font-display text-5xl font-semibold leading-none">快门杀</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            登记一张正脸再进场。开枪时用你填的接口，按 OpenAI Responses 格式和新照片、登记脸比对。对上就立刻淘汰。同一张登记照不必调接口。
          </p>
          <AiFields />
          <div className="mt-6 grid grid-cols-3 gap-2">
            <Stat label="存活" value={state?.alive ?? "—"} />
            <Stat label="淘汰" value={state?.eliminated ?? "—"} />
            <Stat label="已登记" value={state ? enrolled : "—"} />
          </div>
          <Link to="/demo" className="mt-6 text-sm text-accent">
            第一次用？去演示看同一张登记照怎么锁定
          </Link>
        </section>

        <CameraWell
          photo={photo}
          onPhoto={setPhoto}
          hint="正脸，光线清楚一点"
        />

        <section className="flex min-h-0 flex-col justify-center rounded-xl border border-line bg-surface p-5">
          <label className="text-xs tracking-wide text-subtle">你的名字</label>
          <Input
            className="mt-2"
            placeholder="例如：林深"
            maxLength={16}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void join();
            }}
          />
          <p className="mt-4 text-xs tracking-wide text-subtle">阵营</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(Object.keys(TEAMS) as TeamId[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTeam(id)}
                className={cn(
                  "rounded-md border px-3 py-3 text-left transition-colors duration-150",
                  team === id ? "border-brass bg-raised" : "border-line bg-bg hover:border-brass/50",
                )}
              >
                <p className={cn("font-display text-lg font-semibold", id === "flare" ? "text-flare" : "text-accent")}>
                  {TEAMS[id].short}
                </p>
                <p className="text-xs text-muted">{TEAMS[id].label}</p>
              </button>
            ))}
          </div>
          <Button className="mt-5 w-full" size="lg" disabled={busy} onClick={() => void join()}>
            {busy ? "正在入场…" : "登记并进入"}
          </Button>
          <p className="mt-3 text-xs leading-relaxed text-subtle">
            {photo ? "正脸已记下，进场后就能开枪。" : "还差一张正脸。中间取景，或从相册选。"}
          </p>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-line bg-bg px-2 py-2">
      <p className="text-xs text-subtle">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums leading-none">{value}</p>
    </div>
  );
}

function Arena({ identity, onLeave }: { identity: Identity; onLeave: () => void }) {
  const { state, refresh } = useBattleState(2500);
  const me = state?.players.find((p) => p.name === identity.name);
  const eliminated = me?.status === "eliminated";
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<IdentifyResult | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const flare = state?.players.filter((p) => p.team === "flare") ?? [];
  const steel = state?.players.filter((p) => p.team === "steel") ?? [];
  const latest = state?.feed[0];

  async function fire() {
    if (!photo || eliminated) return;
    setBusy(true);
    setBanner(null);
    try {
      const ai = readAiSettings();
      const result = await identifyShot({
        data: {
          shooterName: identity.name,
          imageData: photo,
          ...(ai.apiKey.trim()
            ? { ai: { baseUrl: ai.baseUrl, model: ai.model, apiKey: ai.apiKey } }
            : {}),
        },
      });
      setBanner(result);
      if (!result.ok) {
        toast.error(result.error);
        if (result.error.includes("API") || result.error.includes("Base URL") || result.error.includes("模型")) {
          setAiOpen(true);
        }
      } else if (result.matched) toast.success(`淘汰 ${result.targetName}`);
      else toast.message(result.note);
      if (result.ok && result.matched) setPhoto(null);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "识别失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex h-full min-h-0 flex-col gap-2 px-3 py-2">
      <header className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <ScoreSide team="flare" count={flare.filter((p) => p.status === "alive").length} />
        <div className="text-center">
          <p className="font-display text-xs tracking-widest text-brass">SHUTTER KILL</p>
          <p className="font-display text-xl font-semibold leading-none">快门杀</p>
        </div>
        <ScoreSide team="steel" count={steel.filter((p) => p.status === "alive").length} align="end" />
      </header>

      <p className="truncate text-center text-xs text-muted">
        {latest ? (
          <>
            <span className="text-accent">{latest.shooterName}</span>
            <span className="mx-1 text-subtle">淘汰</span>
            <span className="text-flare">{latest.targetName}</span>
          </>
        ) : (
          "接口锁定之后，名字会出现在这里"
        )}
        <span className="mx-2 text-line">/</span>
        {identity.name} · {TEAMS[identity.team].label}
        {me && !me.hasFace ? " · 未登记正脸" : ""}
      </p>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(7rem,11rem)_minmax(0,1fr)_minmax(7rem,11rem)] gap-2">
        <Lane team="flare" players={flare} me={identity.name} />
        <section className="relative flex min-h-0 flex-col">
          {eliminated ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-line bg-surface text-center">
              <Aperture className="size-10 text-flare" strokeWidth={1.5} />
              <h2 className="mt-3 font-display text-3xl font-semibold">你已被淘汰</h2>
              <p className="mt-2 max-w-xs text-sm text-muted">快门锁上了。两边的名单还在跳，出局的人会划掉。</p>
            </div>
          ) : (
            <CameraWell photo={photo} onPhoto={setPhoto} hint="对准对手的正脸" busy={busy} />
          )}
          {banner && (
            <div className="kill-pop pointer-events-none absolute inset-x-6 top-6 rounded-md border border-line bg-bg/90 px-4 py-3 text-center">
              {banner.ok && banner.matched ? (
                <>
                  <p className="font-display text-xs tracking-widest text-brass">
                    {banner.via === "api" ? `AI ${Math.round(banner.confidence * 100)}` : "登记照一致"}
                  </p>
                  <p className="mt-1 font-display text-3xl font-semibold text-flare">{banner.targetName}</p>
                  <p className="text-xs text-muted">已淘汰</p>
                </>
              ) : banner.ok ? (
                <p className="text-sm text-muted">{banner.note}</p>
              ) : (
                <p className="text-sm text-flare">{banner.error}</p>
              )}
            </div>
          )}
        </section>
        <Lane team="steel" players={steel} me={identity.name} />
      </div>

      <footer className="flex items-center justify-center gap-3">
        <IconButton label="接口" onClick={() => setAiOpen(true)}>
          <Settings2 className="size-5" strokeWidth={1.75} />
        </IconButton>
        <Button size="lg" disabled={!photo || busy || eliminated} onClick={() => void fire()}>
          {busy ? "接口比对中…" : "识别并开枪"}
        </Button>
        <IconButton label="记录" onClick={() => setLogOpen(true)}>
          <ScrollText className="size-5" strokeWidth={1.75} />
        </IconButton>
      </footer>

      {aiOpen && (
        <div className="absolute inset-0 z-10 flex items-stretch justify-end bg-bg/70">
          <aside className="flex h-full w-80 flex-col overflow-y-auto border-l border-line bg-surface p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">识别接口</h2>
              <Button variant="ghost" size="sm" onClick={() => setAiOpen(false)}>
                关闭
              </Button>
            </div>
            <AiFields />
          </aside>
        </div>
      )}

      {logOpen && (
        <LogSheet
          name={identity.name}
          onClose={() => setLogOpen(false)}
          onLeave={onLeave}
        />
      )}
    </main>
  );
}

function ScoreSide({
  team,
  count,
  align = "start",
}: {
  team: TeamId;
  count: number;
  align?: "start" | "end";
}) {
  return (
    <div className={cn("flex items-baseline gap-2", align === "end" && "justify-end")}>
      <span className={cn("font-display text-sm tracking-wide", team === "flare" ? "text-flare" : "text-accent")}>
        {TEAMS[team].label}
      </span>
      <span className="font-display text-3xl font-semibold tabular-nums leading-none">{count}</span>
    </div>
  );
}

function Lane({ team, players, me }: { team: TeamId; players: Player[]; me: string }) {
  return (
    <aside className="flex min-h-0 flex-col rounded-lg border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className={cn("font-display text-sm font-semibold", team === "flare" ? "text-flare" : "text-accent")}>
          {TEAMS[team].label}
        </span>
      </div>
      <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
        {players.map((p) => (
          <li
            key={p.id}
            className={cn(
              "flex items-center gap-2 rounded-sm border border-line bg-bg px-2 py-1.5",
              p.name === me && "border-brass",
              p.status === "eliminated" && "opacity-40",
            )}
          >
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                p.status === "eliminated" ? "bg-line" : team === "flare" ? "bg-flare" : "bg-accent",
              )}
            />
            <span className={cn("truncate text-sm", p.status === "eliminated" && "line-through")}>{p.name}</span>
            {p.hasFace && p.status === "alive" && (
              <ScanFace className="ml-auto size-3.5 shrink-0 text-subtle" aria-label="已登记" />
            )}
          </li>
        ))}
        {players.length === 0 && <li className="px-1 py-2 text-xs text-subtle">空</li>}
      </ul>
    </aside>
  );
}

function CameraWell({
  photo,
  onPhoto,
  hint,
  busy = false,
}: {
  photo: string | null;
  onPhoto: (next: string | null) => void;
  hint: string;
  busy?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      if (photo) return;
      try {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setCamError(null);
      } catch {
        setCamError("没有摄像头，从相册选一张正脸");
      }
    }
    void boot();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facing, photo]);

  function snap() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      toast.error("画面还没就绪，改从相册选");
      return;
    }
    try {
      onPhoto(videoFrameToJpeg(video));
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {
      toast.error("截取失败");
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      onPhoto(await blobToJpegDataUrl(file));
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {
      toast.error("这张图读不出来");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col rounded-lg border border-line bg-surface">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {photo ? (
          <img src={photo} alt="待识别的照片" className="absolute inset-0 size-full object-cover" />
        ) : (
          <video ref={videoRef} className="absolute inset-0 size-full object-cover" playsInline muted autoPlay />
        )}
        {!photo && camError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface px-6 text-center">
            <Crosshair className="size-8 text-brass" strokeWidth={1.5} />
            <p className="text-sm text-muted">{camError}</p>
          </div>
        )}
        <Brackets />
        <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-fg/80">{busy ? "正在比对登记照" : hint}</p>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2">
        <IconButton label="相册" onClick={() => fileRef.current?.click()}>
          <ImagePlus className="size-5" strokeWidth={1.75} />
        </IconButton>
        {photo ? (
          <Button variant="ghost" size="sm" onClick={() => onPhoto(null)}>
            重拍
          </Button>
        ) : (
          <button
            type="button"
            onClick={snap}
            className="flex size-14 items-center justify-center rounded-full border-2 border-brass transition-transform duration-150 active:scale-95"
            aria-label="快门"
          >
            <span className="size-10 rounded-full bg-fg" />
          </button>
        )}
        <IconButton
          label="切换镜头"
          onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
        >
          <SwitchCamera className="size-5" strokeWidth={1.75} />
        </IconButton>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Brackets() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <span className="absolute left-3 top-3 size-6 border-l-2 border-t-2 border-brass" />
      <span className="absolute right-3 top-3 size-6 border-r-2 border-t-2 border-brass" />
      <span className="absolute bottom-8 left-3 size-6 border-b-2 border-l-2 border-brass" />
      <span className="absolute bottom-8 right-3 size-6 border-b-2 border-r-2 border-brass" />
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-md border border-line bg-raised text-fg transition-colors duration-150 hover:border-brass"
    >
      {children}
    </button>
  );
}

function LogSheet({
  name,
  onClose,
  onLeave,
}: {
  name: string;
  onClose: () => void;
  onLeave: () => void;
}) {
  const [shots, setShots] = useState<Shot[] | null>(null);

  useEffect(() => {
    let alive = true;
    listMyShots({ data: { shooterName: name } })
      .then((rows) => {
        if (alive) setShots(rows);
      })
      .catch(() => {
        if (alive) setShots([]);
      });
    return () => {
      alive = false;
    };
  }, [name]);

  return (
    <div className="absolute inset-0 z-10 flex items-stretch justify-end bg-bg/70">
      <aside className="flex h-full w-80 flex-col border-l border-line bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">开枪记录</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            关闭
          </Button>
        </div>
        <ul className="mt-4 flex flex-1 flex-col gap-2 overflow-y-auto">
          {(shots ?? []).map((s) => (
            <li key={s.id} className="rounded-md border border-line bg-bg px-3 py-2">
              <p className="text-sm">{s.status === "approved" ? s.targetName : "未锁定"}</p>
              <p className="text-xs text-subtle">{s.note ?? statusLabel(s.status)}</p>
            </li>
          ))}
          {shots?.length === 0 && <li className="text-sm text-subtle">还没有开过枪</li>}
        </ul>
        <div className="mt-4 flex flex-col gap-2">
          <SiteNav current="/" />
          <Button
            variant="ghost"
            onClick={() => {
              onLeave();
              onClose();
            }}
          >
            退出并重新登记
          </Button>
        </div>
      </aside>
    </div>
  );
}

function statusLabel(status: Shot["status"]) {
  if (status === "approved") return "已淘汰";
  if (status === "rejected") return "未识别";
  return "处理中";
}
