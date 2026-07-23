import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUp, ArrowDown, Plus, Trash2 } from "lucide-react";
import { staffApi, mapBookingFormField } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import { ConfirmModal } from "../../components/shared/ConfirmModal";
import { IconButton } from "../../components/shared/IconButton";
import { BookingFormFieldModal } from "./BookingFormFieldModal";
import type { BookingFormField } from "../../types";

const TYPE_LABELS: Record<string, string> = {
  text: "Text",
  note: "Note",
  single_select: "Single select",
  multi_select: "Multi select",
};

const SHOW_TO_LABELS: Record<string, string> = {
  all: "All patients",
  new: "New patients",
  existing: "Existing patients",
};

export function BookingFormFieldsView({ onBack }: { onBack: () => void }) {
  const [fields, setFields] = useState<BookingFormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BookingFormField | "new" | null>(null);
  const [dirtyOrder, setDirtyOrder] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingField, setDeletingField] = useState<BookingFormField | null>(null);
  const [deleting, setDeleting] = useState(false);

  function refresh() {
    setLoading(true);
    staffApi.bookingFormFields
      .list()
      .then((rows) => {
        setFields(rows.map(mapBookingFormField));
        setDirtyOrder(false);
      })
      .finally(() => setLoading(false));
  }
  useEffect(refresh, []);

  function move(index: number, dir: -1 | 1) {
    setFields((prev) => {
      const next = [...prev];
      const swapWith = index + dir;
      if (swapWith < 0 || swapWith >= next.length) return prev;
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      return next;
    });
    setDirtyOrder(true);
  }

  async function saveOrder() {
    setSaving(true);
    try {
      const rows = await staffApi.bookingFormFields.reorder(fields.map((f) => f.id));
      setFields(rows.map(mapBookingFormField));
      setDirtyOrder(false);
      toastSuccess("Field order saved");
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not save the new order — please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await staffApi.bookingFormFields.delete(id);
      toastSuccess("Field deleted");
      refresh();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not delete this field — please try again.");
    } finally {
      setDeleting(false);
      setDeletingField(null);
    }
  }

  return (
    <div className="w-full min-w-0 px-4 sm:px-6 py-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
          >
            <ArrowLeft size={15} /> Appointment types
          </button>
          <span className="text-gray-300 hidden sm:inline">|</span>
          <h1 className="text-2xl font-bold text-gray-900">Online booking form fields</h1>
        </div>
        {dirtyOrder && (
          <button
            onClick={saveOrder}
            disabled={saving}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500">
        Add custom questions patients answer when booking online, beyond the default name/contact/DOB fields (which can't be changed).
      </p>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-border">
          <span className="text-sm font-semibold text-gray-800">{fields.length} field{fields.length !== 1 ? "s" : ""}</span>
          <button
            onClick={() => setEditing("new")}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={15} /> New field
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-gray-400">Loading…</p>
        ) : fields.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No custom fields yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {fields.map((field, idx) => (
              <div key={field.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 px-4 sm:px-5 py-3">
                <button onClick={() => setEditing(field)} className="flex-1 min-w-0 text-left hover:text-teal-700 transition-colors">
                  <span className="text-sm text-gray-800">{field.label}</span>{field.required && <span className="text-red-500"> *</span>}
                  <span className="block text-xs text-gray-500 mt-0.5">
                    {TYPE_LABELS[field.fieldType] ?? field.fieldType} · {SHOW_TO_LABELS[field.showTo] ?? field.showTo}
                  </span>
                </button>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <IconButton
                    label="Move up"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowUp size={13} />
                  </IconButton>
                  <IconButton
                    label="Move down"
                    onClick={() => move(idx, 1)}
                    disabled={idx === fields.length - 1}
                    className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowDown size={13} />
                  </IconButton>
                  <IconButton
                    label="Delete"
                    onClick={() => setDeletingField(field)}
                    className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={13} />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <BookingFormFieldModal
          initial={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}

      {deletingField && (
        <ConfirmModal
          title="Delete this field?"
          message={`"${deletingField.label}" will be permanently removed from your online booking form. This can't be undone.`}
          confirmLabel="Delete"
          danger
          submitting={deleting}
          onConfirm={() => handleDelete(deletingField.id)}
          onCancel={() => setDeletingField(null)}
        />
      )}
    </div>
  );
}
