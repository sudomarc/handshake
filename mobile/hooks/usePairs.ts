import { useCallback, useEffect, useState } from "react";
import {
  addPair as storeAdd,
  getAllPairs,
  removePair as storeRemove,
  updatePair as storeUpdate,
  type StoredPair,
} from "@/lib/storage";

export function usePairs() {
  const [pairs, setPairs] = useState<StoredPair[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const all = await getAllPairs();
    setPairs(all);
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

  const updatePair = useCallback(
    async (pairId: string, patch: { name?: string }) => {
      await storeUpdate(pairId, patch);
      await refresh();
    },
    [refresh],
  );

  return { pairs, loading, addPair, removePair, updatePair, refresh };
}