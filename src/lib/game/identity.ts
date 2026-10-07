import type { TeamId } from "./types";

const KEY = "shutter-kill-identity";

export type Identity = { name: string; team: TeamId };

export function readIdentity(): Identity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Identity>;
    if (!parsed.name || (parsed.team !== "flare" && parsed.team !== "steel")) {
      return null;
    }
    return { name: parsed.name, team: parsed.team };
  } catch {
    return null;
  }
}

export function writeIdentity(identity: Identity) {
  localStorage.setItem(KEY, JSON.stringify(identity));
}

export function clearIdentity() {
  localStorage.removeItem(KEY);
}
