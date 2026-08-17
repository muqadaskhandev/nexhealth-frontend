import { useEffect, useState } from "react";
import { X, FileText, Sparkles } from "lucide-react";
import { staffApi, type ApiFormSubmissionDetail } from "../../lib/staff-api";
import { ChatFileLink, extractFileUrl, fileLabelFromUrl } from "./chatFileLinks";

const MEDICAL_CATS = ["condition", "allergy", "medication"] as const;
const MEDICAL_TITLES: Record<(typeof MEDICAL_CATS)[number], string> = {
  condition: "Conditions",
  allergy: "Allergies",
  medication: "Medications",
};

function formatMedicalAnswer(value: Record<string, unknown>): string | null {
  const hasCats = MEDICAL_CATS.some((c) => value[c] != null);
  if (!hasCats) return null;
  const parts: string[] = [];
  for (const cat of MEDICAL_CATS) {
    const block = value[cat];
    if (!block || typeof block !== "object" || Array.isArray(block)) continue;
    const rec = block as { responses?: Record<string, string>; writeIns?: string[]; labels?: Record<string, string> };
    const names: string[] = [];
    for (const [id, ans] of Object.entries(rec.responses ?? {})) {
      if (String(ans).toLowerCase() !== "yes") continue;
      names.push(rec.labels?.[id] || rec.labels?.[id.toLowerCase()] || id);
    }
    for (const w of rec.writeIns ?? []) {
      if (w.trim()) names.push(w.trim());
    }
    if (names.length > 0) parts.push(`${MEDICAL_TITLES[cat]}: ${names.join(", ")}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "None listed";
}

function formatAnswer(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    const medical = formatMedicalAnswer(value as Record<string, unknown>);
    if (medical) return medical;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function FormAnswersModal({
  patientName,
  requestIds,
  onClose,
  onViewChat,
}: {
  patientName: string;
  requestIds: string[];
  onClose: () => void;
  onViewChat?: (sessionIds: string[]) => void;
}) {
  const [rows, setRows] = useState<ApiFormSubmissionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    staffApi.forms.requests
      .submissions(requestIds)
      .then(setRows)
      .catch((err: unknown) => {
        const apiErr = err as { detail?: string };
        setError(apiErr?.detail || "Could not load submitted answers.");
      })
      .finally(() => setLoading(false));
  }, [requestIds]);

  const agentSessionIds = [...new Set(rows.map((r) => r.agent_session_id).filter((id): id is string => Boolean(id)))];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-teal-500" />
              <h2 className="text-lg font-bold text-gray-900">Form answers</h2>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{patientName}</p>
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

        <div className="px-5 py-4 overflow-y-auto flex-1">
          {loading && <p className="text-sm text-gray-500">Loading…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !error && rows.length === 0 && (
            <p className="text-sm text-gray-500">No submitted answers found.</p>
          )}
          {rows.map((row, idx) => (
            <section key={`${row.form_name}-${idx}`} className={idx > 0 ? "mt-6" : ""}>
              <h3 className="text-sm font-semibold text-gray-900">{row.form_name}</h3>
              <p className="text-xs text-gray-500 mb-2">
                Submitted {fmtTime(row.submitted_at)}
                {row.intake_source === "agent" ? " · Chat intake" : ""}
              </p>
              <dl className="rounded-xl border border-gray-100 divide-y divide-gray-100">
                {Object.entries(row.answers || {}).length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">No fields answered.</div>
                ) : (
                  Object.entries(row.answers || {}).map(([label, value]) => (
                    <div key={label} className="px-3 py-2 grid grid-cols-3 gap-2">
                      <dt className="col-span-1 text-xs font-medium text-gray-500 break-words">{label}</dt>
                      <dd className="col-span-2 text-sm text-gray-900 whitespace-pre-wrap break-words">
                        {extractFileUrl(value) ? (
                          <ChatFileLink href={extractFileUrl(value)!} label={fileLabelFromUrl(extractFileUrl(value)!)} />
                        ) : (
                          formatAnswer(value)
                        )}
                      </dd>
                    </div>
                  ))
                )}
              </dl>
            </section>
          ))}
        </div>

        {agentSessionIds.length > 0 && onViewChat && (
          <div className="px-5 py-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => onViewChat(agentSessionIds)}
              className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800"
            >
              <Sparkles size={14} />
              View chat transcript
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
