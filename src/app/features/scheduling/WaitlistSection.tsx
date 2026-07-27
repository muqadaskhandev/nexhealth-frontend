import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { staffApi, mapAsapEntry, mapWaitlistEntry, mapWaitlistRequest } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import { AddToAsapModal } from "./AddToAsapModal";
import { AddToWaitlistModal } from "./AddToWaitlistModal";
import { NewWaitlistRequestView } from "./NewWaitlistRequestView";
import { WaitlistActiveRequestCard } from "./WaitlistActiveRequestCard";
import { WaitlistRequestDetailView } from "./WaitlistRequestDetailView";
import { isRequestActive } from "./waitlistRequestUtils";
import type { AsapEntry, WaitlistEntry, WaitlistRequest } from "../../types";

type View = { name: "list" } | { name: "new" } | { name: "detail"; requestId: string };
type ListTab = "requests" | "asap" | "entries";
type RequestTab = "active" | "completed";

export function WaitlistSection() {
  const [view, setView] = useState<View>({ name: "list" });
  const [listTab, setListTab] = useState<ListTab>("requests");
  const [requests, setRequests] = useState<WaitlistRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestTab, setRequestTab] = useState<RequestTab>("active");

  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [asapEntries, setAsapEntries] = useState<AsapEntry[]>([]);
  const [loadingAsap, setLoadingAsap] = useState(true);

  const [showAddWaitlist, setShowAddWaitlist] = useState(false);
  const [showAddAsap, setShowAddAsap] = useState(false);

  function refreshRequests() {
    setLoadingRequests(true);
    staffApi.waitlistRequests
      .list()
      .then((rows) => setRequests(rows.map(mapWaitlistRequest)))
      .finally(() => setLoadingRequests(false));
  }

  function refreshEntries() {
    setLoadingEntries(true);
    staffApi.waitlist
      .list()
      .then((rows) => setEntries(rows.map(mapWaitlistEntry)))
      .finally(() => setLoadingEntries(false));
  }

  function refreshAsap() {
    setLoadingAsap(true);
    staffApi.asapList
      .list()
      .then((rows) => setAsapEntries(rows.map(mapAsapEntry)))
      .finally(() => setLoadingAsap(false));
  }

  useEffect(() => {
    refreshRequests();
    refreshEntries();
    refreshAsap();
  }, []);

  async function removeEntry(id: string) {
    try {
      await staffApi.waitlist.remove(id);
      toastSuccess("Removed from waitlist");
      refreshEntries();
    } catch {
      toastError("Could not remove this entry.");
    }
  }

  async function removeAsap(id: string) {
    try {
      await staffApi.asapList.remove(id);
      toastSuccess("Removed from ASAP list");
      refreshAsap();
    } catch {
      toastError("Could not remove from ASAP list.");
    }
  }

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

  const tabCls = (active: boolean) =>
    `px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex-shrink-0 ${
      active ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
    }`;

  return (
    <div className="px-4 sm:px-6 py-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Waitlist</h1>
          <p className="text-sm text-gray-500">Manage your ASAP list, waitlist entries, and fill openings with requests.</p>
        </div>
        {listTab === "requests" && (
          <button
            onClick={() => setView({ name: "new" })}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus size={15} /> New waitlist request
          </button>
        )}
        {listTab === "asap" && (
          <button
            onClick={() => setShowAddAsap(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus size={15} /> Add to ASAP list
          </button>
        )}
        {listTab === "entries" && (
          <button
            onClick={() => setShowAddWaitlist(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus size={15} /> Add to waitlist
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 overflow-x-auto">
        {([
          { id: "requests" as const, label: "Waitlist requests" },
          { id: "asap" as const, label: "ASAP list" },
          { id: "entries" as const, label: "Waitlist entries" },
        ]).map((t) => (
          <button key={t.id} className={tabCls(listTab === t.id)} onClick={() => setListTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {listTab === "requests" && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-1 px-4 sm:px-5 pt-3 overflow-x-auto">
            {(["active", "completed"] as const).map((t) => (
              <button key={t} className={tabCls(requestTab === t)} onClick={() => setRequestTab(t)}>
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
                .map((r) => (
                  <WaitlistActiveRequestCard
                    key={r.id}
                    request={r}
                    completed={requestTab === "completed"}
                    onChanged={refreshRequests}
                    onManage={() => setView({ name: "detail", requestId: r.id })}
                  />
                ))}
            </div>
          )}
        </div>
      )}

      {listTab === "asap" && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-border">
            <p className="text-sm font-semibold text-gray-900">ASAP list</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Patients marked as ASAP in your health record — used when sending waitlist requests from &quot;Your waitlist.&quot;
            </p>
          </div>
          {loadingAsap ? (
            <p className="py-8 text-center text-sm text-gray-400">Loading…</p>
          ) : asapEntries.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No patients on the ASAP list yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-gray-50">
                    <th className="text-left px-5 py-3 font-semibold">Patient</th>
                    <th className="text-left px-5 py-3 font-semibold">Scheduled</th>
                    <th className="text-left px-5 py-3 font-semibold">Provider</th>
                    <th className="text-left px-5 py-3 font-semibold">Type</th>
                    <th className="text-left px-5 py-3 font-semibold">Notes</th>
                    <th className="w-10 px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {asapEntries.map((e) => (
                    <tr key={e.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 font-medium">{e.patientName}</td>
                      <td className="px-5 py-3 text-gray-600">
                        {new Date(e.startsAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      </td>
                      <td className="px-5 py-3">{e.providerName}</td>
                      <td className="px-5 py-3">{e.appointmentType}</td>
                      <td className="px-5 py-3 text-gray-600 max-w-[200px] truncate">{e.notes || "—"}</td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => removeAsap(e.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          title="Remove from ASAP list"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {listTab === "entries" && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-border">
            <p className="text-sm font-semibold text-gray-900">Waitlist entries</p>
            <p className="text-xs text-gray-500 mt-0.5">Patients waiting to be notified of any opening at your practice.</p>
          </div>
          {loadingEntries ? (
            <p className="py-8 text-center text-sm text-gray-400">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No patients on the waitlist yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-gray-50">
                    <th className="text-left px-5 py-3 font-semibold">Patient</th>
                    <th className="text-left px-5 py-3 font-semibold">Provider</th>
                    <th className="text-left px-5 py-3 font-semibold">Type</th>
                    <th className="text-left px-5 py-3 font-semibold">Notes</th>
                    <th className="text-left px-5 py-3 font-semibold">Added</th>
                    <th className="w-10 px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 font-medium">{e.patientName}</td>
                      <td className="px-5 py-3">{e.providerName || "Any"}</td>
                      <td className="px-5 py-3">{e.appointmentType || "Any"}</td>
                      <td className="px-5 py-3 text-gray-600 max-w-[200px] truncate">{e.notes || "—"}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {new Date(e.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => removeEntry(e.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          title="Remove from waitlist"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showAddWaitlist && (
        <AddToWaitlistModal
          onClose={() => setShowAddWaitlist(false)}
          onAdded={refreshEntries}
        />
      )}
      {showAddAsap && (
        <AddToAsapModal
          onClose={() => setShowAddAsap(false)}
          onAdded={refreshAsap}
        />
      )}
    </div>
  );
}
