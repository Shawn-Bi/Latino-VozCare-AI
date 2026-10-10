import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Polls the card the voice agent last showed while a call is active. Real tool events only.
export default function useCallCard(query: { token?: string; demoCallId?: string } | null, active: boolean) {
  const [card, setCard] = useState("");
  const [ended, setEnded] = useState(false);
  const key = query?.token || query?.demoCallId || "";

  useEffect(() => {
    if (!key) return;
    let stop = false;
    const load = async () => {
      const res = await base44.functions.invoke("getCallCard", query ?? {}).catch(() => null);
      if (stop || !res?.data) return;
      setCard(res.data.card || "");
      setEnded(!!res.data.ended);
    };
    load();
    if (!active) return () => { stop = true; };
    const id = setInterval(load, 3000);
    const timeout = setTimeout(() => clearInterval(id), 15 * 60 * 1000);
    return () => { stop = true; clearInterval(id); clearTimeout(timeout); };
  }, [key, active]);

  return { card, ended };
}