import { useEffect, useState } from "react";
import { FileText, Receipt, Sparkles, User, X } from "lucide-react";
import { staffApi, type ApiAppointmentDetails, type ApiAppointmentFormItem } from "../../lib/staff-api";
import { AgentSessionModal } from "../forms/AgentSessionModal";
import { FormAnswersModal } from "../forms/FormAnswersModal";
import { ChatFileLink, extractFileUrl, fileLabelFromUrl } from "../forms/chatFileLinks";
import { BookingChatModal } from "./BookingChatModal";

function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    if ("authorized" in rec || "last_four" in rec || "cardholder_name" in rec) {
      const parts = [
        rec.cardholder_name,
        rec.last_four ? `••••${rec.last_four}` : "",
        rec.expiry,
        rec.authorized ? "authorized" : "",
      ].filter(Boolean);
      return parts.join(" · ") || "Payment";
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function bookedViaMeta(via: string): { label: string; className: string } {
  if (via === "angelina") {
    return { label: "Chat intake", className: "bg-teal-50 text-teal-800 border-teal-200" };
  }
  if (via === "patient") {
    return { label: "Classic form", className: "bg-blue-50 text-blue-800 border-blue-200" };
  }
  return { label: "Added by staff", className: "bg-gray-100 text-gray-700 border-gray-200" };
}

function submittedByMeta(item: ApiAppointmentFormItem): { label: string; className: string } {
  if (item.submitted_by === "angelina") {
    return { label: "Submitted by Angelina", className: "bg-teal-50 text-teal-800 border-teal-200" };
  }
  if (item.submitted_by === "patient") {
    return { label: "Submitted by patient", className: "bg-blue-50 text-blue-800 border-blue-200" };
  }
  if (item.agent_session_id) {
    return { label: "In progress with Angelina", className: "bg-amber-50 text-amber-800 border-amber-200" };
  }
  return { label: "Not submitted", className: "bg-gray-100 text-gray-600 border-gray-200" };
}

export function AppointmentDetailsModal({
  appointmentId,
  patientName,
  onClose,
}: {
  appointmentId: string;
  patientName: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<ApiAppointmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answersRequestIds, setAnswersRequestIds] = useState<string[] | null>(null);
  const [chatSessionIds, setChatSessionIds] = useState<string[] | null>(null);
  const [showBookingChat, setShowBookingChat] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    staffApi.appointments
      .details(appointmentId)
      .then((row) => {
        if (!cancelled) setData(row);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const apiErr = err as { detail?: string };
        setError(apiErr?.detail || "Could not load appointment details.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  const via = bookedViaMeta(data?.booked_via || "staff");
  const appt = data?.appointment;
  const transcript = data?.booking_transcript || [];
  const submittedRequestIds = (data?.forms || []).filter((f) => f.submitted_by !== "pending").map((f) => f.request_id);
  const chatIdsFromForms = [...new Set((data?.forms || []).map((f) => f.agent_session_id).filter((id): id is string => Boolean(id)))];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Appointment details</h2>
              <p className="text-sm text-gray-500 mt-0.5">{patientName}</p>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="px-5 py-4 overflow-y-auto flex-1 space-y-5">
            {loading && <p className="text-sm text-gray-500">Loading…</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            {data && appt && (
              <>
                <section className="rounded-xl border border-gray-100 p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${via.className}`}>
                      {via.label}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">{appt.status.replace("-", " ")}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {appt.appointment_type} with {appt.provider_name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {fmtWhen(appt.starts_at)} · {appt.duration_minutes} minutes
                  </p>
                  {appt.visit_reason && <p className="text-xs text-teal-700 mt-1">Visit: {appt.visit_reason}</p>}
                  {appt.visit_notes && <p className="text-xs text-gray-600 mt-1">{appt.visit_notes}</p>}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {submittedRequestIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAnswersRequestIds(submittedRequestIds)}
                        className="text-xs font-semibold text-teal-700 hover:text-teal-900"
                      >
                        View answers
                      </button>
                    )}
                    {(chatIdsFromForms.length > 0 || transcript.length > 0) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (chatIdsFromForms.length > 0) setChatSessionIds(chatIdsFromForms);
                          else setShowBookingChat(true);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900"
                      >
                        <Sparkles size={12} />
                        View chat intake
                      </button>
                    )}
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={15} className="text-teal-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Submitted details</h3>
                  </div>
                  {data.booking_answers.length === 0 ? (
                    <p className="text-sm text-gray-500">No extra booking questions were answered.</p>
                  ) : (
                    <dl className="rounded-xl border border-gray-100 divide-y divide-gray-100">
                      {data.booking_answers.map((row) => {
                        const fileUrl = extractFileUrl(row.value);
                        return (
                          <div key={`${row.id}-${row.label}`} className="px-3 py-2 grid grid-cols-3 gap-2">
                            <dt className="col-span-1 text-xs font-medium text-gray-500 break-words">{row.label}</dt>
                            <dd className="col-span-2 text-sm text-gray-900 whitespace-pre-wrap break-words">
                              {fileUrl ? (
                                <ChatFileLink href={fileUrl} label={fileLabelFromUrl(fileUrl)} />
                              ) : (
                                formatValue(row.value)
                              )}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  )}
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <User size={15} className="text-teal-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Intake forms</h3>
                  </div>
                  {data.forms.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No intake forms were sent for this visit yet. Those are requested after the office confirms, or from Forms.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.forms.map((form) => {
                        const by = submittedByMeta(form);
                        return (
                          <div key={form.request_id} className="rounded-xl border border-gray-100 px-3 py-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{form.form_name}</p>
                                <p className="text-xs text-gray-500 mt-0.5 capitalize">
                                  {form.status}
                                  {form.submitted_at ? ` · ${fmtWhen(form.submitted_at)}` : ""}
                                </p>
                              </div>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${by.className}`}>
                                {by.label}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {form.submitted_by !== "pending" && (
                                <button
                                  type="button"
                                  onClick={() => setAnswersRequestIds([form.request_id])}
                                  className="text-xs font-semibold text-teal-700 hover:text-teal-900"
                                >
                                  View form
                                </button>
                              )}
                              {form.agent_session_id && (
                                <button
                                  type="button"
                                  onClick={() => setChatSessionIds([form.agent_session_id!])}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900"
                                >
                                  <Sparkles size={12} />
                                  View AI record
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {chatIdsFromForms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setChatSessionIds(chatIdsFromForms)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900"
                    >
                      <Sparkles size={12} />
                      View all AI records
                    </button>
                  )}
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt size={15} className="text-teal-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Receipts</h3>
                  </div>
                  {data.receipts.length === 0 ? (
                    <p className="text-sm text-gray-500">No payment or receipt for this visit yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.receipts.map((r, i) => (
                        <div key={`${r.kind}-${r.created_at}-${i}`} className="rounded-xl border border-gray-100 px-3 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{r.description}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {r.details}
                                {r.created_at ? ` · ${fmtWhen(r.created_at)}` : ""}
                              </p>
                            </div>
                            <span className="text-xs font-semibold capitalize text-gray-700">{r.status}</span>
                          </div>
                          {r.amount && <p className="text-sm font-semibold text-gray-900 mt-1">${r.amount}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      </div>

      {answersRequestIds && (
        <FormAnswersModal
          patientName={patientName}
          requestIds={answersRequestIds}
          onClose={() => setAnswersRequestIds(null)}
          onViewChat={(sessionIds) => {
            setAnswersRequestIds(null);
            setChatSessionIds(sessionIds);
          }}
        />
      )}
      {chatSessionIds && (
        <AgentSessionModal
          sessionIds={chatSessionIds}
          patientName={patientName}
          onClose={() => setChatSessionIds(null)}
        />
      )}
      {showBookingChat && (
        <BookingChatModal
          patientName={patientName}
          turns={transcript}
          onClose={() => setShowBookingChat(false)}
        />
      )}
    </>
  );
}
