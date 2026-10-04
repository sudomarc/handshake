import { useState, useEffect, useCallback, useRef } from "react";
import { getAllPairs, getActivePair, StoredPair } from "@/lib/storage";

export function usePairs() {
  const [pairs, setPairs] = useState<StoredPair[]>([]);
  const [activePair, setActivePairState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const cancelledRef = useRef(false);
  const mountedRef = useRef(false);

  const fetchPairs = useCallback(async () => {
    const [pairsData, active] = await Promise.all([getAllPairs(), getActivePair()]);
    if (!cancelledRef.current) {
      return { pairsData, active };
    }
    return null;
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    mountedRef.current = true;

    const fetchAndSet = async () => {
      const result = await fetchPairs();
      if (result && mountedRef.current) {
        setPairs(result.pairsData);
        setActivePairState(result.active);
      }
    };

    fetchPairs().then(() => {
      if (mountedRef.current) {
        setLoading(false);
      }
    });

    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const addPair = async (pairId: string, name?: string) => {
    const { addPair: storageAddPair } = await import("@/lib/storage");
    await storageAddPair(pairId, name);
    const result = await fetchPairs();
    if (result) {
      setPairs(result.pairsData);
      setActivePairState(result.active);
    }
  };

  const removePair = async (pairId: string) => {
    const { removePair: storageRemovePair } = await import("@/lib/storage");
    await storageRemovePair(pairId);
    const result = await fetchPairs();
    if (result) {
      setPairs(result.pairsData);
      setActivePairState(result.active);
    }
  };

  const setActive = async (pairId: string) => {
    const { setActivePair } = await import("@/lib/storage");
    await setActivePair(pairId);
    setActivePairState(pairId);
  };

  return {
    pairs,
    activePair,
    loading,
    addPair,
    removePair,
    setActive,
    refresh: () => fetchPairs(),
  };
}
