import { useEffect, useState } from "react";
import { X, Sparkles, MessageSquare } from "lucide-react";
import { staffApi, type ApiAgentSessionDetail } from "../../lib/staff-api";

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export function AgentSessionModal({
  sessionId,
  patientName,
  onClose,
}: {
  sessionId: string;
  patientName: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ApiAgentSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"transcript" | "answers">("transcript");

  useEffect(() => {
    staffApi.forms.agentSessions
      .get(sessionId)
      .then(setDetail)
      .catch((err: unknown) => {
        const apiErr = err as { detail?: string };
        setError(apiErr?.detail || "Could not load chat intake.");
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-teal-500" />
              <h2 className="text-lg font-bold text-gray-900">Chat intake</h2>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {patientName}
              {detail?.form_name ? ` · ${detail.form_name}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pt-3 flex gap-1 border-b border-gray-100">
          {(["transcript", "answers"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                tab === t ? "text-teal-700 border-b-2 border-teal-500" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "transcript" ? "Transcript" : "AI vs patient answers"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && <p className="text-sm text-gray-400 text-center py-8">Loading…</p>}
          {error && <p className="text-sm text-red-600 text-center py-8">{error}</p>}

          {!loading && !error && detail && tab === "transcript" && (
            <div className="space-y-3">
              {detail.turns.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No messages in this session.</p>
              ) : (
                detail.turns.map((t, i) => (
                  <div
                    key={`${t.created_at}-${i}`}
                    className={`flex ${t.role === "patient" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                        t.role === "patient"
                          ? "bg-teal-500 text-white rounded-br-md"
                          : t.role === "system"
                            ? "bg-gray-100 text-gray-500 text-xs italic"
                            : "bg-gray-50 border border-gray-200 text-gray-800 rounded-bl-md"
                      }`}
                    >
                      <p className="text-[10px] opacity-70 mb-0.5 capitalize">{t.role}</p>
                      {t.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {!loading && !error && detail && tab === "answers" && (
            <div className="space-y-4">
              {detail.answers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No structured answers recorded.</p>
              ) : (
                detail.answers.map((a) => (
                  <div key={a.field_id} className="border border-gray-100 rounded-xl p-4">
                    <p className="text-sm font-semibold text-gray-900 mb-2">{a.field_label}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Patient said</p>
                        <p className="text-gray-700 whitespace-pre-wrap">{a.raw_patient_text || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                          Parsed value {a.ai_generated && <span className="text-teal-600">(AI)</span>}
                        </p>
                        <pre className="text-gray-700 whitespace-pre-wrap font-sans text-sm">{formatValue(a.parsed_value)}</pre>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Status: {a.status}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {detail && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <MessageSquare size={12} />
              {detail.turns.length} messages · {detail.answers.length} fields captured
            </span>
            {detail.progress && (
              <span>
                Progress: {detail.progress.answered}/{detail.progress.total}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
