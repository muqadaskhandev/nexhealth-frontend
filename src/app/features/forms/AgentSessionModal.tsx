import { useEffect, useState } from "react";
import { X, Sparkles, MessageSquare } from "lucide-react";
import { staffApi, type ApiAgentSessionDetail } from "../../lib/staff-api";
import { ChatFileLink, extractFileUrl, fileForTurn, fileLabelFromUrl } from "./chatFileLinks";

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

function sessionLabel(d: ApiAgentSessionDetail, index: number): string {
  return d.form_name || `Form ${index + 1}`;
}

export function AgentSessionModal({
  sessionIds,
  patientName,
  onClose,
}: {
  sessionIds: string[];
  patientName: string;
  onClose: () => void;
}) {
  const [details, setDetails] = useState<ApiAgentSessionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"transcript" | "answers">("transcript");
  const [activeId, setActiveId] = useState<string>("all");

  useEffect(() => {
    const ids = [...new Set(sessionIds.filter(Boolean))];
    if (ids.length === 0) {
      setError("No chat intake session found for this request.");
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all(ids.map((id) => staffApi.forms.agentSessions.get(id)))
      .then((rows) => {
        rows.sort((a, b) => (a.form_name || "").localeCompare(b.form_name || ""));
        setDetails(rows);
        setActiveId(rows.length > 1 ? "all" : rows[0]?.session_id || "all");
      })
      .catch((err: unknown) => {
        const apiErr = err as { detail?: string };
        setError(apiErr?.detail || "Could not load chat intake.");
      })
      .finally(() => setLoading(false));
  }, [sessionIds.join("|")]);

  const visible = activeId === "all" ? details : details.filter((d) => d.session_id === activeId);
  const messageCount = visible.reduce((n, d) => n + d.turns.length, 0);
  const answerCount = visible.reduce((n, d) => n + d.answers.length, 0);
  const answered = visible.reduce((n, d) => n + (d.progress?.answered ?? 0), 0);
  const total = visible.reduce((n, d) => n + (d.progress?.total ?? 0), 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
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
              {details.length === 1 && details[0].form_name ? ` · ${details[0].form_name}` : details.length > 1 ? ` · ${details.length} forms` : ""}
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

        {details.length > 1 && (
          <div className="px-5 pt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveId("all")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                activeId === "all" ? "bg-teal-500 text-white border-teal-500" : "border-gray-200 text-gray-600 hover:border-teal-300"
              }`}
            >
              All forms
            </button>
            {details.map((d, i) => (
              <button
                key={d.session_id}
                type="button"
                onClick={() => setActiveId(d.session_id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                  activeId === d.session_id ? "bg-teal-500 text-white border-teal-500" : "border-gray-200 text-gray-600 hover:border-teal-300"
                }`}
              >
                {sessionLabel(d, i)}
              </button>
            ))}
          </div>
        )}

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

          {!loading && !error && tab === "transcript" && (
            <div className="space-y-8">
              {visible.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No messages in this session.</p>
              ) : (
                visible.map((detail, di) => (
                  <section key={detail.session_id}>
                    {visible.length > 1 && (
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        {sessionLabel(detail, di)}
                      </p>
                    )}
                    {detail.turns.length === 0 ? (
                      <p className="text-sm text-gray-400">No messages in this form.</p>
                    ) : (
                      <div className="space-y-3">
                        {detail.turns.map((t, i) => {
                          const file = fileForTurn(t, detail.answers, detail.draft_answers);
                          return (
                          <div
                            key={`${detail.session_id}-${t.created_at}-${i}`}
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
                              <p className="text-[10px] opacity-70 mb-0.5 capitalize">
                                {t.role}
                                {t.created_at ? ` · ${fmtTime(t.created_at)}` : ""}
                              </p>
                              {t.content}
                              {file && (
                                <span className="block mt-1.5">
                                  <ChatFileLink href={file.url} label={file.label} dark={t.role === "patient"} />
                                </span>
                              )}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                ))
              )}
            </div>
          )}

          {!loading && !error && tab === "answers" && (
            <div className="space-y-8">
              {visible.every((d) => d.answers.length === 0) ? (
                <p className="text-sm text-gray-400 text-center py-8">No structured answers recorded.</p>
              ) : (
                visible.map((detail, di) => (
                  <section key={detail.session_id} className="space-y-4">
                    {visible.length > 1 && (
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {sessionLabel(detail, di)}
                      </p>
                    )}
                    {detail.answers.map((a) => (
                      <div key={`${detail.session_id}-${a.field_id}`} className="border border-gray-100 rounded-xl p-4">
                        <p className="text-sm font-semibold text-gray-900 mb-2">{a.field_label}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Patient said</p>
                            {extractFileUrl(a.parsed_value) || extractFileUrl(a.raw_patient_text) ? (
                              <ChatFileLink
                                href={(extractFileUrl(a.parsed_value) || extractFileUrl(a.raw_patient_text))!}
                                label={(a.raw_patient_text || "").replace(/^uploaded\s+/i, "").trim() || fileLabelFromUrl((extractFileUrl(a.parsed_value) || extractFileUrl(a.raw_patient_text))!)}
                              />
                            ) : (
                              <p className="text-gray-700 whitespace-pre-wrap">{a.raw_patient_text || "—"}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                              Parsed value {a.ai_generated && <span className="text-teal-600">(AI)</span>}
                            </p>
                            {extractFileUrl(a.parsed_value) ? (
                              <ChatFileLink
                                href={extractFileUrl(a.parsed_value)!}
                                label={(a.raw_patient_text || "").replace(/^uploaded\s+/i, "").trim() || fileLabelFromUrl(extractFileUrl(a.parsed_value)!)}
                              />
                            ) : (
                              <pre className="text-gray-700 whitespace-pre-wrap font-sans text-sm">{formatValue(a.parsed_value)}</pre>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Status: {a.status}</p>
                      </div>
                    ))}
                  </section>
                ))
              )}
            </div>
          )}
        </div>

        {!loading && details.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <MessageSquare size={12} />
              {messageCount} messages · {answerCount} fields captured
            </span>
            {total > 0 && (
              <span>
                Progress: {answered}/{total}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
