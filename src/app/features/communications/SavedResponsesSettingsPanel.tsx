import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { staffApi } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import { ConfirmModal } from "../../components/shared/ConfirmModal";
import { wrapSmartCommand } from "./smartCommands";

export type SavedResponseRow = {
  id: string;
  location_id: string;
  title: string;
  body: string;
  shared_location_ids: string[];
  created_at: string;
  updated_at: string;
};

/** Smart commands available in Saved Messages (help-center list). */
export const SAVED_RESPONSE_COMMANDS = [
  { group: "Patient", token: "PATIENT_FULL_NAME", label: "Patient's full name" },
  { group: "Patient", token: "PATIENT_LAST_NAME", label: "Patient's last name" },
  { group: "Patient", token: "PATIENT_FIRST_NAME", label: "Patient's first name" },
  { group: "Patient", token: "PATIENT_EMAIL", label: "Patient's email address" },
  {
    group: "Location",
    token: "LOCATION_BOOKING_APPOINTMENT",
    label: "Insert location book appointment link",
  },
  { group: "Location", token: "LOCATION_PHONE", label: "Location phone number" },
  { group: "Location", token: "LOCATION_ADDRESS", label: "Location address" },
] as const;

function formatLocationLine(loc: {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}) {
  const cityLine = [loc.city, loc.state, loc.zip_code].filter(Boolean).join(", ");
  return [loc.address, cityLine].filter(Boolean).join(", ") || loc.name;
}

export function SavedResponseEditorModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: SavedResponseRow | null;
  onClose: () => void;
  onSaved: (row: SavedResponseRow) => void;
}) {
  const { locations, activeLocation } = useAuth();
  const [title, setTitle] = useState(initial?.title || "");
  const [body, setBody] = useState(initial?.body || "");
  const [shared, setShared] = useState<Set<string>>(
    () => new Set(initial?.shared_location_ids || [])
  );
  const [locSearch, setLocSearch] = useState("");
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const otherLocations = useMemo(
    () => locations.filter((l) => l.id !== activeLocation?.id),
    [locations, activeLocation?.id]
  );

  const filteredLocs = useMemo(() => {
    const q = locSearch.trim().toLowerCase();
    if (!q) return otherLocations;
    return otherLocations.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.address || "").toLowerCase().includes(q) ||
        (l.city || "").toLowerCase().includes(q)
    );
  }, [otherLocations, locSearch]);

  const filteredCmds = useMemo(() => {
    const q = cmdQuery.trim().toLowerCase();
    if (!q) return SAVED_RESPONSE_COMMANDS;
    return SAVED_RESPONSE_COMMANDS.filter(
      (c) => c.label.toLowerCase().includes(q) || c.token.toLowerCase().includes(q)
    );
  }, [cmdQuery]);

  function insertToken(token: string) {
    const el = bodyRef.current;
    const insert = wrapSmartCommand(token);
    if (!el) {
      setBody((b) => b + insert);
      setCmdOpen(false);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + insert + body.slice(end);
    setBody(next);
    setCmdOpen(false);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + insert.length;
      el.setSelectionRange(pos, pos);
    });
  }

  async function save() {
    if (!title.trim()) {
      toastError("Give the message a Title.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        body,
        shared_location_ids: [...shared],
      };
      const row = initial
        ? await staffApi.savedResponses.update(initial.id, payload)
        : await staffApi.savedResponses.create(payload);
      onSaved(row);
      toastSuccess(initial ? "Saved response updated" : "Saved response created");
      onClose();
    } catch {
      toastError("Could not save response.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-gray-900">
            {initial ? "Edit saved response" : "New saved response"}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />
          </label>

          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Body</span>
              <button
                type="button"
                onClick={() => setCmdOpen((v) => !v)}
                className="text-xs font-medium text-teal-600 hover:text-teal-700"
              >
                Smart Commands
              </button>
            </div>
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 resize-y"
            />
            {cmdOpen && (
              <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-border rounded-lg shadow-xl overflow-hidden">
                <div className="p-2 border-b border-border">
                  <input
                    value={cmdQuery}
                    onChange={(e) => setCmdQuery(e.target.value)}
                    placeholder="Search"
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md outline-none"
                    autoFocus
                  />
                </div>
                <div className="max-h-56 overflow-y-auto py-1">
                  {(["Patient", "Location"] as const).map((group) => {
                    const items = filteredCmds.filter((c) => c.group === group);
                    if (!items.length) return null;
                    return (
                      <div key={group}>
                        <p className="px-3 py-1.5 text-[11px] font-semibold uppercase text-gray-400">
                          {group}
                        </p>
                        {items.map((c) => (
                          <button
                            key={c.token}
                            type="button"
                            onClick={() => insertToken(c.token)}
                            className="w-full text-left px-3 py-2 text-sm text-teal-700 hover:bg-teal-50"
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <p className="text-[11px] text-gray-400 mt-1">
              Smart commands available: patient name/email and location phone, address, and booking
              link.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Share with other locations</span>
              {otherLocations.length > 0 && (
                <button
                  type="button"
                  className="text-xs font-medium text-teal-600"
                  onClick={() => setShared(new Set(otherLocations.map((l) => l.id)))}
                >
                  Select all
                </button>
              )}
            </div>
            <input
              value={locSearch}
              onChange={(e) => setLocSearch(e.target.value)}
              placeholder="Search"
              className="w-full mb-2 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none"
            />
            <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-100">
              {filteredLocs.length === 0 ? (
                <p className="px-3 py-3 text-sm text-gray-400">No other locations</p>
              ) : (
                filteredLocs.map((loc) => {
                  const on = shared.has(loc.id);
                  return (
                    <label
                      key={loc.id}
                      className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer ${
                        on ? "bg-teal-50/60" : "hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => {
                          setShared((prev) => {
                            const next = new Set(prev);
                            if (next.has(loc.id)) next.delete(loc.id);
                            else next.add(loc.id);
                            return next;
                          });
                        }}
                        className="mt-1"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-900">{loc.name}</span>
                        <span className="block text-xs text-gray-500">
                          {formatLocationLine(loc)}
                        </span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-border flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="px-4 py-2 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-lg disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function MessagesSettingsPanel({
  onOpenCreate,
}: {
  onOpenCreate?: () => void;
} = {}) {
  const [rows, setRows] = useState<SavedResponseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<SavedResponseRow | null | "new">(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function refresh(q?: string) {
    return staffApi.savedResponses
      .list(q)
      .then(setRows)
      .catch(() => {
        setRows([]);
        toastError("Could not load saved responses.");
      });
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refresh(search.trim() || undefined);
    }, 250);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (onOpenCreate) {
      /* reserved for deep-link */
    }
  }, [onOpenCreate]);

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await staffApi.savedResponses.remove(deleteId);
      setRows((prev) => prev.filter((r) => r.id !== deleteId));
      toastSuccess("Saved response deleted");
    } catch {
      toastError("Could not delete.");
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Messages</h2>
        <p className="text-sm text-gray-500 mt-1">
          Increase efficiency, avoid typos, and build your brand with a library of saved responses
          to patient messages.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3 justify-between">
          <div>
            <p className="font-semibold text-gray-900 text-sm">Saved responses</p>
            <p className="text-xs text-gray-500">Commonly used messages for repeat use.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg">
              <Search size={14} className="text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="text-sm outline-none bg-transparent w-32"
              />
            </div>
            <button
              type="button"
              onClick={() => setEditor("new")}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-lg"
            >
              <Plus size={14} /> New
            </button>
          </div>
        </div>

        {loading ? (
          <p className="px-4 py-10 text-sm text-gray-400 text-center">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="px-4 py-14 text-center space-y-3">
            <p className="font-semibold text-gray-800">Saved responses</p>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Sick of typing the same message to patients? Create saved responses to save time,
              maintain your brand, and reduce mistakes.
            </p>
            <button
              type="button"
              onClick={() => setEditor("new")}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-semibold text-teal-700 border border-teal-300 rounded-lg hover:bg-teal-50"
            >
              <Plus size={14} /> New saved response
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li
                key={row.id}
                className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50/80"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 text-sm">{row.title}</p>
                  <p className="text-sm text-gray-500 truncate mt-0.5">{row.body}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditor(row)}
                    className="p-2 text-gray-400 hover:text-teal-700 rounded-lg"
                    aria-label="Edit"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(row.id)}
                    className="p-2 text-gray-400 hover:text-rose-600 rounded-lg"
                    aria-label="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editor !== null && (
        <SavedResponseEditorModal
          initial={editor === "new" ? null : editor}
          onClose={() => setEditor(null)}
          onSaved={(row) => {
            setRows((prev) => {
              const i = prev.findIndex((r) => r.id === row.id);
              if (i === -1) return [...prev, row].sort((a, b) => a.title.localeCompare(b.title));
              const next = [...prev];
              next[i] = row;
              return next;
            });
          }}
        />
      )}

      {deleteId && (
        <ConfirmModal
          title="Delete saved response?"
          message="This cannot be undone."
          confirmLabel="Delete"
          onCancel={() => setDeleteId(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </div>
  );
}
