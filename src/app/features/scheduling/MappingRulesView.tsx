import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUp, ArrowDown, Plus, Trash2 } from "lucide-react";
import { staffApi, mapMappingRule } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import { ConfirmModal } from "../../components/shared/ConfirmModal";
import { IconButton } from "../../components/shared/IconButton";
import { MappingRuleModal } from "./MappingRuleModal";
import type { AppointmentType, MappingRule } from "../../types";

const FIELD_LABELS: Record<string, string> = {
  visit_type: "Visit Type",
  service_type: "Service Type",
  procedure_code: "Procedure code",
  operatory: "Operatory",
  provider: "Provider",
};

function summarize(rule: MappingRule, types: AppointmentType[]): string {
  const target = types.find((t) => t.id === rule.targetAppointmentTypeId)?.name ?? "Unknown type";
  const parts = rule.conditions.map(
    (c) => `${FIELD_LABELS[c.field] ?? c.field} any of ${c.values.join(", ") || "—"}`
  );
  return `If ${parts.join(" and ")} → then appointment type is ${target}`;
}

export function MappingRulesView({ types, onBack }: { types: AppointmentType[]; onBack: () => void }) {
  const [rules, setRules] = useState<MappingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MappingRule | "new" | null>(null);
  const [dirtyOrder, setDirtyOrder] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingRule, setDeletingRule] = useState<MappingRule | null>(null);
  const [deleting, setDeleting] = useState(false);

  function refresh() {
    setLoading(true);
    staffApi.mappingRules
      .list()
      .then((rows) => {
        setRules(rows.map(mapMappingRule));
        setDirtyOrder(false);
      })
      .finally(() => setLoading(false));
  }
  useEffect(refresh, []);

  function move(index: number, dir: -1 | 1) {
    setRules((prev) => {
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
      const rows = await staffApi.mappingRules.reorder(rules.map((r) => r.id));
      setRules(rows.map(mapMappingRule));
      setDirtyOrder(false);
      toastSuccess("Mapping rule order saved");
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
      await staffApi.mappingRules.delete(id);
      toastSuccess("Mapping rule deleted");
      refresh();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not delete this rule — please try again.");
    } finally {
      setDeleting(false);
      setDeletingRule(null);
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
          <h1 className="text-2xl font-bold text-gray-900">Mapping rules</h1>
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

      <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
        Mapping rules are only needed if you are differentiating communications — <span className="font-semibold">Recalls, Reviews, Campaigns, Templates, or Forms</span> — by appointment type.
        Rules are evaluated top to bottom; the first match wins, so more specific rules should be listed above more general ones.
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-border">
          <span className="text-sm font-semibold text-gray-800">{rules.length} rule{rules.length !== 1 ? "s" : ""}</span>
          <button
            onClick={() => {
              if (types.length === 0) {
                toastError("Create at least one appointment type before adding a mapping rule.");
                return;
              }
              setEditing("new");
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={15} /> New rule
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-gray-400">Loading…</p>
        ) : rules.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No mapping rules yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {rules.map((rule, idx) => (
              <div key={rule.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 px-4 sm:px-5 py-3">
                <button onClick={() => setEditing(rule)} className="flex-1 min-w-0 text-left text-sm text-gray-800 hover:text-teal-700 transition-colors">
                  {summarize(rule, types)}
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
                    disabled={idx === rules.length - 1}
                    className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowDown size={13} />
                  </IconButton>
                  <IconButton
                    label="Delete"
                    onClick={() => setDeletingRule(rule)}
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
        <MappingRuleModal
          types={types}
          initial={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}

      {deletingRule && (
        <ConfirmModal
          title="Delete mapping rule?"
          message={`This rule (${summarize(deletingRule, types)}) will be permanently removed. This can't be undone.`}
          confirmLabel="Delete"
          danger
          submitting={deleting}
          onConfirm={() => handleDelete(deletingRule.id)}
          onCancel={() => setDeletingRule(null)}
        />
      )}
    </div>
  );
}
