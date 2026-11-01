"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  GLOSSARY_KEY,
  decodeGlossary,
  encodeGlossary,
  saveTerm,
  type GlossaryEntry,
} from "@/lib/glossary";

type StorageState =
  { kind: "loading" } | { kind: "ready" } | { kind: "error"; message: string };
export function useGlossary() {
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const entriesRef = useRef<GlossaryEntry[]>([]);
  const [storage, setStorage] = useState<StorageState>({ kind: "loading" });
  const blocked = useRef(false);
  useEffect(() => {
    function read() {
      try {
        const loaded = decodeGlossary(localStorage.getItem(GLOSSARY_KEY));
        entriesRef.current = loaded;
        setEntries(loaded);
        blocked.current = false;
        setStorage({ kind: "ready" });
      } catch {
        blocked.current = true;
        setStorage({
          kind: "error",
          message:
            "Saved glossary could not be read. Browser storage may be unavailable or the saved data may be damaged. New terms stay in memory until you reset storage.",
        });
      }
    }
    read();
    const synchronize = (event: StorageEvent) => {
      if (event.key === GLOSSARY_KEY) read();
    };
    window.addEventListener("storage", synchronize);
    return () => window.removeEventListener("storage", synchronize);
  }, []);
  const persist = useCallback((updated: GlossaryEntry[]) => {
    entriesRef.current = updated;
    setEntries(updated);
    if (blocked.current) return;
    try {
      localStorage.setItem(GLOSSARY_KEY, encodeGlossary(updated));
      setStorage({ kind: "ready" });
    } catch {
      blocked.current = true;
      setStorage({
        kind: "error",
        message:
          "Glossary was not saved to this browser. Storage may be full or disabled. Your terms are available for this session.",
      });
    }
  }, []);
  const add = useCallback(
    (entry: GlossaryEntry) => persist(saveTerm(entriesRef.current, entry)),
    [persist],
  );
  const remove = useCallback(
    (id: string) =>
      persist(entriesRef.current.filter((entry) => entry.id !== id)),
    [persist],
  );
  const reset = useCallback(() => {
    try {
      localStorage.removeItem(GLOSSARY_KEY);
      blocked.current = false;
      persist(entriesRef.current);
    } catch {
      setStorage({
        kind: "error",
        message:
          "Browser storage is still unavailable. Terms remain in this session only.",
      });
    }
  }, [persist]);
  return { entries, storage, add, remove, reset };
}
