import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";

// Polls the card the voice agent last showed while a call is active. Real tool events only.
export default function useCallCard(query: { token?: string; demoCallId?: string } | null, active: boolean) {
  const [card, setCard] = useState("");
  const [ended, setEnded] = useState(false);
  const key = query?.token || query?.demoCallId || "";

  // Keep the last card on screen across a new call request; reset only for a different call.
  const lastKey = useRef("");
  useEffect(() => {
    if (!key) return;
    if (lastKey.current && lastKey.current !== key) setCard("");
    lastKey.current = key; setEnded(false);
  }, [key]);
  useEffect(() => {
    if (!key) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const expiresAt = Date.now() + 15 * 60 * 1000;
    const load = async () => {
      const res = await base44.functions.invoke("getCallCard", query ?? {}).catch(() => null);
      if (stop) return;
      if (res?.data) {
        setCard(res.data.card || "");
        setEnded(!!res.data.ended);
      }
      // Schedule only after the previous request completes; slow provider reads
      // cannot return out of order and put an older card back on screen.
      if (active && !res?.data?.ended && Date.now() < expiresAt) timer = setTimeout(load, 3000);
    };
    load();
    return () => { stop = true; clearTimeout(timer); };
  }, [key, active]);

  return { card, ended };
}