import { useEffect, useState } from "react";
import { practiceApi, type Practice } from "../lib/api";

export function usePractice(enabled: boolean) {
  const [practice, setPractice] = useState<Practice | null>(null);

  useEffect(() => {
    if (!enabled) {
      setPractice(null);
      return;
    }

    let alive = true;
    practiceApi
      .me()
      .then((data) => {
        if (alive) setPractice(data);
      })
      .catch(() => {
        if (alive) setPractice(null);
      });

    return () => {
      alive = false;
    };
  }, [enabled]);

  return practice;
}
