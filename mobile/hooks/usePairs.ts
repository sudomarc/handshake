import { useCallback, useEffect, useState } from "react";
import {
  addPair as storeAdd,
  getActivePair,
  getAllPairs,
  removePair as storeRemove,
  updatePair as storeUpdate,
  setActivePair,
  type StoredPair,
} from "@/lib/storage";

export function usePairs() {
  const [pairs, setPairs] = useState<StoredPair[]>([]);
  const [activePair, setActivePairState] = useState<StoredPair | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [all, active] = await Promise.all([getAllPairs(), getActivePair()]);
    setPairs(all);
    setActivePairState(active);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addPair = useCallback(
    async (pairId: string, name?: string) => {
      await storeAdd(pairId, name);
      await refresh();
    },
    [refresh],
  );

  const removePair = useCallback(
    async (pairId: string) => {
      await storeRemove(pairId);
      await refresh();
    },
    [refresh],
  );

  const setActive = useCallback(
    async (pairId: string) => {
      await setActivePair(pairId);
      await refresh();
    },
    [refresh],
  );

  const updatePair = useCallback(
    async (pairId: string, patch: { name?: string; privateContext?: string }) => {
      await storeUpdate(pairId, patch);
      await refresh();
    },
    [refresh],
  );

  return { pairs, activePair, loading, addPair, removePair, setActive, updatePair, refresh };
}
