import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { staffApi, mapWaitlistRequest } from "../../lib/staff-api";
import { NewWaitlistRequestView } from "./NewWaitlistRequestView";
import { WaitlistRequestDetailView } from "./WaitlistRequestDetailView";
import type { WaitlistRequest, WaitlistRequestSlot } from "../../types";

const EXPIRY_BUFFER_MINUTES = 15;

function isSlotOpen(slot: WaitlistRequestSlot): boolean {
  if (slot.claimedByPatientId || slot.cancelledAt) return false;
  return Date.now() <= new Date(slot.startsAt).getTime() - EXPIRY_BUFFER_MINUTES * 60 * 1000;
}

function isRequestActive(request: WaitlistRequest): boolean {
  return request.status === "sent" && request.slots.some(isSlotOpen);
}

type View = { name: "list" } | { name: "new" } | { name: "detail"; requestId: string };
type RequestTab = "active" | "completed";

export function WaitlistSection() {
  const [view, setView] = useState<View>({ name: "list" });
  const [requests, setRequests] = useState<WaitlistRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestTab, setRequestTab] = useState<RequestTab>("active");

  const [entries, setEntries] = useState<
    {
      id: string;
      patient_name: string;
      provider_name: string;
      appointment_type: string;
      notes: string;
      status: string;
    }[]
  >([]);

  function refreshRequests() {
    setLoadingRequests(true);
    staffApi.waitlistRequests
      .list()
      .then((rows) => setRequests(rows.map(mapWaitlistRequest)))
      .finally(() => setLoadingRequests(false));
  }

  useEffect(() => {
    refreshRequests();
    staffApi.waitlist().then((rows) => setEntries(rows as typeof entries));
  }, []);

  if (view.name === "new") {
    return (
      <NewWaitlistRequestView
        onBack={() => setView({ name: "list" })}
        onCreated={() => {
          refreshRequests();
          setView({ name: "list" });
        }}
      />
    );
  }
  if (view.name === "detail") {
    return (
      <WaitlistRequestDetailView
        requestId={view.requestId}
        onBack={() => setView({ name: "list" })}
        onChanged={refreshRequests}
      />
    );
  }

  return (
    <div className="px-4 sm:px-6 py-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Waitlist</h1>
          <p className="text-sm text-gray-500">Fill last-minute openings from the waitlist.</p>
        </div>
        <button
          onClick={() => setView({ name: "new" })}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
        >
          <Plus size={15} /> New waitlist request
        </button>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="flex items-center gap-1 px-4 sm:px-5 pt-3 overflow-x-auto">
          {(["active", "completed"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setRequestTab(t)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex-shrink-0 ${
                requestTab === t ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {t === "active" ? "Active Requests" : "Completed Requests"}
            </button>
          ))}
        </div>
        {loadingRequests ? (
          <p className="py-8 text-center text-sm text-gray-400">Loading…</p>
        ) : requests.filter((r) => (requestTab === "active" ? isRequestActive(r) : !isRequestActive(r))).length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            {requestTab === "active" ? "No active waitlist requests." : "No completed waitlist requests yet."}
          </p>
        ) : (
          <div className="divide-y divide-border mt-3">
            {requests
              .filter((r) => (requestTab === "active" ? isRequestActive(r) : !isRequestActive(r)))
              .map((r) => {
                const claimed = r.slots.filter((s) => s.claimedByPatientId).length;
                return (
                  <button
                    key={r.id}
                    onClick={() => setView({ name: "detail", requestId: r.id })}
                    className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 px-4 sm:px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <span
                        className={`inline-block px-2 py-0.5 mr-2 rounded-full text-xs font-semibold capitalize border ${
                          r.status === "cancelled"
                            ? "bg-gray-100 text-gray-500 border-gray-200"
                            : "bg-teal-50 text-teal-700 border-teal-200"
                        }`}
                      >
                        {r.status}
                      </span>
                      <span className="text-sm font-medium text-gray-800">
                        {r.slots.length} slot{r.slots.length !== 1 ? "s" : ""} · {r.patients.length} patient
                        {r.patients.length !== 1 ? "s" : ""} · {claimed} claimed
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      Sent {new Date(r.sentAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </button>
                );
              })}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Waitlist entries</h2>
        <p className="text-xs text-gray-500 mb-3">Patients who asked to be notified of any opening.</p>
        <div className="bg-white rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="text-left px-5 py-3 font-semibold">Patient</th>
                <th className="text-left px-5 py-3 font-semibold">Provider</th>
                <th className="text-left px-5 py-3 font-semibold">Type</th>
                <th className="text-left px-5 py-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium">{e.patient_name}</td>
                  <td className="px-5 py-3">{e.provider_name}</td>
                  <td className="px-5 py-3">{e.appointment_type}</td>
                  <td className="px-5 py-3 text-gray-600">{e.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
