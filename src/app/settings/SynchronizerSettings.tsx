import { useEffect, useState } from "react";
import { practiceApi, type Practice } from "../lib/api";
import { SynchronizerPanel } from "./SynchronizerPanel";

export function SynchronizerSettings() {
  const [practice, setPractice] = useState<Practice | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    practiceApi
      .me()
      .then(setPractice)
      .catch((err: { detail?: string }) =>
        setError(err?.detail || "Could not load Synchronizer settings.")
      );
  }, []);

  if (!practice) {
    return <p className="text-sm text-gray-500">{error || "Loading…"}</p>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>
      )}
      <SynchronizerPanel
        practice={practice}
        onPracticeChange={setPractice}
        onError={setError}
      />
    </div>
  );
}
