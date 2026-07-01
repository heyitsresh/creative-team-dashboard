import { useCallback, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Debounced autosave, same pattern the Pendleton dashboard used for shared
 * edits: call `save(payload)` on every keystroke/change, it coalesces rapid
 * changes and POSTs the latest value `delayMs` after the user stops typing.
 */
export function useAutosave<T>(
  endpoint: string,
  { delayMs = 600, method = "POST" }: { delayMs?: number; method?: string } = {}
) {
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    (payload: T) => {
      if (timer.current) clearTimeout(timer.current);
      setState("saving");
      timer.current = setTimeout(async () => {
        try {
          const res = await fetch(endpoint, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error(await res.text());
          setState("saved");
          setTimeout(() => setState("idle"), 1500);
        } catch (err) {
          console.error("autosave failed", err);
          setState("error");
        }
      }, delayMs);
    },
    [endpoint, method, delayMs]
  );

  return { save, state };
}
