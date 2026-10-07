import { useCallback, useEffect, useState } from "react";
import { getBattleState } from "./server";
import type { BattleState } from "./types";

export function useBattleState(intervalMs = 2500) {
  const [state, setState] = useState<BattleState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await getBattleState();
      setState(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "战场同步失败");
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      if (!alive) return;
      await refresh();
    };
    void tick();
    const id = window.setInterval(() => void tick(), intervalMs);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [intervalMs, refresh]);

  return { state, error, refresh };
}
