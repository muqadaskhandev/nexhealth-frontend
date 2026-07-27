import { useEffect, useState } from "react";
import { EHR_COMING_SOON_MESSAGE, ehrApi, type EhrFeaturesResponse } from "../lib/ehr-features";

const FALLBACK: EhrFeaturesResponse = {
  enabled: false,
  message: EHR_COMING_SOON_MESSAGE,
  features: [],
};

export function useEhrFeatures(enabled = true) {
  const [data, setData] = useState<EhrFeaturesResponse>(FALLBACK);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setData(FALLBACK);
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    ehrApi
      .features()
      .then((response) => {
        if (alive) setData(response);
      })
      .catch(() => {
        if (alive) setData(FALLBACK);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [enabled]);

  return { ...data, loading };
}
