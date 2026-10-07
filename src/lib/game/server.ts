import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type {
  BattleState,
  FeedItem,
  IdentifyResult,
  MutResult,
  Player,
  Shot,
  TeamId,
} from "./types";
import { DEMO_PLAYERS } from "./types";

const nameSchema = z
  .string()
  .trim()
  .min(1, "请输入姓名")
  .max(16, "姓名最多 16 个字");

const teamSchema = z.enum(["flare", "steel"]);

const imageSchema = z
  .string()
  .min(32, "请先拍照")
  .max(480_000, "照片太大，请再拍一张")
  .refine((v) => v.startsWith("data:image/jpeg;base64,"), "只支持照片提交");

const lastIdentify = new Map<string, number>();

function asIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

function asIsoOrNull(value: unknown): string | null {
  if (value == null) return null;
  return asIso(value);
}

function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === "t" || value === "true" || value === "1";
}

type PlayerRow = {
  id: number;
  name: string;
  team: string;
  status: string;
  created_at: unknown;
  has_face: unknown;
};

type ShotRow = {
  id: number;
  shooter_name: string;
  target_name: string;
  image_data?: string;
  status: string;
  created_at: unknown;
  reviewed_at: unknown;
  note: string | null;
};

function mapPlayer(row: PlayerRow): Player {
  return {
    id: Number(row.id),
    name: row.name,
    team: (row.team === "flare" ? "flare" : "steel") as TeamId,
    status: row.status === "eliminated" ? "eliminated" : "alive",
    hasFace: asBool(row.has_face),
    createdAt: asIso(row.created_at),
  };
}

function mapShot(row: ShotRow, withImage: boolean): Shot {
  return {
    id: Number(row.id),
    shooterName: row.shooter_name,
    targetName: row.target_name,
    status:
      row.status === "approved"
        ? "approved"
        : row.status === "rejected"
          ? "rejected"
          : "pending",
    createdAt: asIso(row.created_at),
    reviewedAt: asIsoOrNull(row.reviewed_at),
    note: row.note,
    imageData: withImage ? row.image_data : undefined,
  };
}

export const getBattleState = createServerFn({ method: "GET" }).handler(
  async (): Promise<BattleState> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();

    const meta = await sql<{ status: string; started_at: unknown }>`
      select status, started_at from game_meta where id = 1
    `;
    const players = await sql<PlayerRow>`
      select id, name, team, status, created_at,
        (portrait is not null and length(portrait) > 40) as has_face
      from players
      order by id asc
    `;
    const feedRows = await sql<ShotRow>`
      select id, shooter_name, target_name, status, created_at, reviewed_at, note
      from shots
      where status = 'approved' and target_name <> ''
      order by reviewed_at desc nulls last, id desc
      limit 24
    `;

    const list = players.map(mapPlayer);
    return {
      status: meta[0]?.status === "ended" ? "ended" : "live",
      startedAt: asIso(meta[0]?.started_at),
      alive: list.filter((p) => p.status === "alive").length,
      eliminated: list.filter((p) => p.status === "eliminated").length,
      players: list,
      feed: feedRows.map(
        (row): FeedItem => ({
          id: Number(row.id),
          shooterName: row.shooter_name,
          targetName: row.target_name,
          createdAt: asIso(row.reviewed_at ?? row.created_at),
        }),
      ),
    };
  },
);

const aiSchema = z.object({
  baseUrl: z.string().trim().min(8).max(300),
  model: z.string().trim().min(1).max(120),
  apiKey: z.string().trim().min(1).max(500),
});

async function rejectShot(imageData: string, shooter: string, note: string) {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await sql`
    insert into shots (shooter_name, target_name, image_data, status, reviewed_at, note)
    values (${shooter}, '', ${imageData}, 'rejected', now(), ${note})
  `;
}

export const joinBattle = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: nameSchema,
      team: teamSchema,
      portrait: imageSchema,
    }),
  )
  .handler(async ({ data }): Promise<MutResult & { player?: Player }> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const found = await sql<PlayerRow>`
      select id, name, team, status, created_at,
        (portrait is not null and length(portrait) > 40) as has_face
      from players where name = ${data.name}
    `;
    if (found[0]) {
      const updated = await sql<PlayerRow>`
        update players
        set portrait = ${data.portrait}, team = ${data.team}
        where name = ${data.name}
        returning id, name, team, status, created_at,
          (portrait is not null and length(portrait) > 40) as has_face
      `;
      if (!updated[0]) return { ok: false, error: "加入失败，请重试" };
      return { ok: true, player: mapPlayer(updated[0]) };
    }
    const inserted = await sql<PlayerRow>`
      insert into players (name, team, status, portrait)
      values (${data.name}, ${data.team}, 'alive', ${data.portrait})
      returning id, name, team, status, created_at,
        (portrait is not null and length(portrait) > 40) as has_face
    `;
    if (!inserted[0]) return { ok: false, error: "加入失败，请重试" };
    return { ok: true, player: mapPlayer(inserted[0]) };
  });

async function eliminate(target: string, shooter: string, imageData: string, note: string) {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const flipped = await sql<{ id: number }>`
    update players
    set status = 'eliminated'
    where name = ${target} and status = 'alive'
    returning id
  `;
  if (!flipped[0]) return false;
  await sql`
    insert into shots (shooter_name, target_name, image_data, status, reviewed_at, note)
    values (${shooter}, ${target}, ${imageData}, 'approved', now(), ${note})
  `;
  return true;
}

export const identifyShot = createServerFn({ method: "POST" })
  .validator(
    z.object({
      shooterName: nameSchema,
      imageData: imageSchema,
      ai: aiSchema.optional(),
    }),
  )
  .handler(async ({ data }): Promise<IdentifyResult> => {
    const shooter = data.shooterName.trim();
    const now = Date.now();
    const prev = lastIdentify.get(shooter) ?? 0;
    if (now - prev < 1500) return { ok: false, error: "识别太频繁，稍等几秒" };

    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const me = await sql<{ status: string; portrait: string | null }>`
      select status, portrait from players where name = ${shooter}
    `;
    if (!me[0]) return { ok: false, error: "请先加入战场" };
    if (me[0].status === "eliminated") return { ok: false, error: "你已被淘汰，无法开枪" };
    if (!me[0].portrait || me[0].portrait.length < 40) {
      return { ok: false, error: "先登记你的正脸" };
    }
    if (me[0].portrait === data.imageData) {
      return { ok: true, matched: false, note: "拍到的是你自己" };
    }

    const rivals = await sql<{ name: string; portrait: string }>`
      select name, portrait
      from players
      where status = 'alive'
        and name <> ${shooter}
        and portrait is not null
        and length(portrait) > 40
      order by id asc
      limit 8
    `;
    if (rivals.length === 0) {
      return { ok: false, error: "场上还没有登记过脸的对手" };
    }

    lastIdentify.set(shooter, now);

    const exact = rivals.find((r) => r.portrait === data.imageData);
    if (exact) {
      const ok = await eliminate(exact.name, shooter, data.imageData, "与登记照完全一致");
      if (!ok) return { ok: false, error: `${exact.name} 已被淘汰` };
      return { ok: true, matched: true, targetName: exact.name, confidence: 1, via: "exact" };
    }

    if (!data.ai) {
      return { ok: false, error: "先填写 Base URL、模型和 API Key" };
    }

    try {
      const { matchPortraits } = await import("./vision.server");
      const hit = await matchPortraits(data.imageData, rivals, data.ai);
      if (!hit.matched) {
        await rejectShot(data.imageData, shooter, hit.note);
        return { ok: true, matched: false, note: hit.note };
      }
      const noted = `AI ${Math.round(hit.confidence * 100)}`;
      const ok = await eliminate(hit.name, shooter, data.imageData, noted);
      if (!ok) return { ok: false, error: `${hit.name} 已被淘汰` };
      return {
        ok: true,
        matched: true,
        targetName: hit.name,
        confidence: hit.confidence,
        via: "api",
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "识别接口失败" };
    }
  });

export const getShotImage = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }): Promise<{ imageData: string } | null> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ image_data: string }>`
      select image_data from shots where id = ${data.id} limit 1
    `;
    if (!rows[0]) return null;
    return { imageData: rows[0].image_data };
  });

export const listMyShots = createServerFn({ method: "POST" })
  .validator(z.object({ shooterName: nameSchema }))
  .handler(async ({ data }): Promise<Shot[]> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<ShotRow>`
      select id, shooter_name, target_name, status, created_at, reviewed_at, note
      from shots
      where shooter_name = ${data.shooterName}
      order by id desc
      limit 30
    `;
    return rows.map((row) => mapShot(row, false));
  });

export const seedDemoMatch = createServerFn({ method: "POST" })
  .validator(
    z.object({
      portraits: z
        .array(z.object({ name: nameSchema, imageData: imageSchema }))
        .min(1)
        .max(16),
    }),
  )
  .handler(async ({ data }): Promise<MutResult> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const known = new Set(DEMO_PLAYERS.map((p) => p.name));
    const faces = new Map<string, string>();
    for (const row of data.portraits) {
      if (known.has(row.name)) faces.set(row.name, row.imageData);
    }
    await sql`delete from shots`;
    await sql`delete from players`;
    await sql`update game_meta set status = 'live', started_at = now() where id = 1`;
    for (const p of DEMO_PLAYERS) {
      const portrait = faces.get(p.name) ?? null;
      await sql`
        insert into players (name, team, status, portrait)
        values (${p.name}, ${p.team}, ${p.status}, ${portrait})
      `;
    }
    lastIdentify.clear();
    return { ok: true };
  });
