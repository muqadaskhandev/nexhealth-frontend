import { useEffect, useRef, useState } from "react";
import { ArrowLeft, GripVertical, Plus, Trash2 } from "lucide-react";
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
  payment: "Payment",
};

const SHOW_TO_LABELS: Record<string, string> = {
  all: "All patients",
  new: "New patients",
  existing: "Existing patients",
};

export function BookingFormFieldsView({
  onBack,
  embedded = false,
}: {
  onBack?: () => void;
  embedded?: boolean;
}) {
  const [fields, setFields] = useState<BookingFormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BookingFormField | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingField, setDeletingField] = useState<BookingFormField | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  function refresh() {
    setLoading(true);
    staffApi.bookingFormFields
      .list()
      .then((rows) => setFields(rows.map(mapBookingFormField)))
      .finally(() => setLoading(false));
  }
  useEffect(refresh, []);

  function reorderList(list: BookingFormField[], from: number, to: number): BookingFormField[] {
    if (from === to) return list;
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  }

  async function persistOrder(ordered: BookingFormField[]) {
    setSaving(true);
    try {
      const rows = await staffApi.bookingFormFields.reorder(ordered.map((f) => f.id));
      setFields(rows.map(mapBookingFormField));
      toastSuccess("Field order saved");
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not save the new order — please try again.");
      refresh();
    } finally {
      setSaving(false);
    }
  }

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndexRef.current === null) return;
    setDropIndex(index);
  }

  async function handleDrop(index: number) {
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    setDragIndex(null);
    setDropIndex(null);
    if (from === null || from === index) return;

    const reordered = reorderList(fields, from, index);
    setFields(reordered);
    await persistOrder(reordered);
  }

  function handleDragEnd() {
    dragIndexRef.current = null;
    setDragIndex(null);
    setDropIndex(null);
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

  const rootCls = embedded ? "space-y-5" : "w-full min-w-0 px-4 sm:px-6 py-5 space-y-5";

  return (
    <div className={rootCls}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {!embedded && onBack && (
            <>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
              >
                <ArrowLeft size={15} /> Appointment types
              </button>
              <span className="text-gray-300 hidden sm:inline">|</span>
            </>
          )}
          <h1 className="text-2xl font-bold text-gray-900">
            {embedded ? "Online booking form" : "Online booking form fields"}
          </h1>
        </div>
        {saving && <span className="text-xs text-gray-400">Saving order…</span>}
      </div>

      <p className="text-sm text-gray-500">
        Add custom questions patients answer when booking online, beyond the default name/contact/DOB fields (which can't be changed).
        Drag fields using the grab bars to reorder.
      </p>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-border">
          <span className="text-sm font-semibold text-gray-800">{fields.length} field{fields.length !== 1 ? "s" : ""}</span>
          <button
            onClick={() => setEditing("new")}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={15} /> Add a form field
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-gray-400">Loading…</p>
        ) : fields.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No custom fields yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {fields.map((field, idx) => (
              <div
                key={field.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={() => handleDrop(idx)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 transition-colors ${
                  dragIndex === idx ? "opacity-40" : ""
                } ${dropIndex === idx && dragIndex !== null && dragIndex !== idx ? "bg-teal-50 border-t-2 border-teal-400" : ""}`}
              >
                <div
                  className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
                  title="Drag to reorder"
                >
                  <GripVertical size={18} />
                </div>
                <button
                  onClick={() => setEditing(field)}
                  className="flex-1 min-w-0 text-left hover:text-teal-700 transition-colors"
                >
                  <span className="text-sm text-gray-800">{field.label}</span>
                  {field.required && <span className="text-red-500"> *</span>}
                  <span className="block text-xs text-gray-500 mt-0.5">
                    {TYPE_LABELS[field.fieldType] ?? field.fieldType} · {SHOW_TO_LABELS[field.showTo] ?? field.showTo}
                  </span>
                </button>
                <IconButton
                  label="Delete"
                  onClick={() => setDeletingField(field)}
                  className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-red-500 hover:bg-red-50 flex-shrink-0"
                >
                  <Trash2 size={13} />
                </IconButton>
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
