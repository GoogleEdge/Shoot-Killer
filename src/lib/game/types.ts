export const TEAMS = {
  flare: { id: "flare", label: "焰组", short: "FLARE" },
  steel: { id: "steel", label: "钢组", short: "STEEL" },
} as const;

export type TeamId = keyof typeof TEAMS;
export type PlayerStatus = "alive" | "eliminated";
export type ShotStatus = "pending" | "approved" | "rejected";

export type Player = {
  id: number;
  name: string;
  team: TeamId;
  status: PlayerStatus;
  hasFace: boolean;
  createdAt: string;
};

export type Shot = {
  id: number;
  shooterName: string;
  targetName: string;
  status: ShotStatus;
  createdAt: string;
  reviewedAt: string | null;
  note: string | null;
  imageData?: string;
};

export type FeedItem = {
  id: number;
  shooterName: string;
  targetName: string;
  createdAt: string;
};

export type BattleState = {
  status: "live" | "ended";
  startedAt: string;
  alive: number;
  eliminated: number;
  players: Player[];
  feed: FeedItem[];
};

export type MutResult = { ok: true } | { ok: false; error: string };

export type IdentifyResult =
  | {
      ok: true;
      matched: true;
      targetName: string;
      confidence: number;
      via: "api" | "exact";
    }
  | { ok: true; matched: false; note: string }
  | { ok: false; error: string };

export const DEMO_PLAYERS: { name: string; team: TeamId; status: PlayerStatus }[] = [
  { name: "林深", team: "flare", status: "alive" },
  { name: "周予", team: "steel", status: "alive" },
  { name: "阿北", team: "flare", status: "alive" },
  { name: "小满", team: "steel", status: "alive" },
  { name: "老K", team: "flare", status: "alive" },
  { name: "苏晚", team: "steel", status: "alive" },
  { name: "何川", team: "flare", status: "alive" },
  { name: "陈麦", team: "steel", status: "eliminated" },
  { name: "江左", team: "flare", status: "alive" },
  { name: "白夜", team: "steel", status: "alive" },
  { name: "顾衡", team: "flare", status: "eliminated" },
  { name: "宋慈", team: "steel", status: "alive" },
];
