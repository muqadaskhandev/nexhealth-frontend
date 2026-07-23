import { useEffect, useState } from "react";
import { ArrowLeft, Copy, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Toggle } from "../../components/shared/Toggle";
import { ConfirmModal } from "../../components/shared/ConfirmModal";
import { IconButton } from "../../components/shared/IconButton";
import { useAuth } from "../../auth/AuthContext";
import { practiceApi } from "../../lib/api";
import { staffApi, mapAppointmentType, mapAvailabilityBlock, mapAvailabilitySlot, mapOperatory, mapProvider } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";
import { ProviderModal } from "./ProviderModal";
import { ProviderDefaultsModal } from "./ProviderDefaultsModal";
import { AvailabilitySlotModal } from "./AvailabilitySlotModal";
import { BlockAvailabilityModal } from "./BlockAvailabilityModal";
import type { AppointmentType, AvailabilityBlock, AvailabilitySlot, Operatory, Provider } from "../../types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime(t: string): string {
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${period}`;
}

function formatDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatHours(slot: AvailabilitySlot): string {
  if (slot.repeatMode === "once" && slot.specificDate) {
    return formatDate(slot.specificDate);
  }
  const day = DAY_LABELS[slot.dayOfWeek ?? 0];
  return slot.startsOn ? `Every week on ${day}, starting ${formatDate(slot.startsOn)}` : `Every week on ${day}`;
}

function formatAppointmentTypes(slot: AvailabilitySlot, types: AppointmentType[]): string {
  if (slot.useProviderDefaults) return "Provider defaults";
  const names = slot.appointmentTypeIds.map((id) => types.find((t) => t.id === id)?.name).filter(Boolean);
  return names.length > 0 ? names.join(", ") : "No types selected";
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ProvidersAvailabilityView({ onBack }: { onBack: () => void }) {
  const { activeLocation, refreshSession } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [operatories, setOperatories] = useState<Operatory[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [addingProvider, setAddingProvider] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [deletingProvider, setDeletingProvider] = useState<Provider | null>(null);
  const [defaultsModal, setDefaultsModal] = useState<{ provider: Provider; mode: "types" | "insurances" } | null>(null);

  const [slotModal, setSlotModal] = useState<{ providerId: string; initial?: AvailabilitySlot } | null>(null);
  const [deletingSlot, setDeletingSlot] = useState<AvailabilitySlot | null>(null);

  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [blockModal, setBlockModal] = useState<{ providerId: string; initial?: AvailabilityBlock } | null>(null);
  const [deletingBlock, setDeletingBlock] = useState<AvailabilityBlock | null>(null);

  const [newOperatoryName, setNewOperatoryName] = useState("");
  const [addingOperatory, setAddingOperatory] = useState(false);
  const [deletingOperatory, setDeletingOperatory] = useState<Operatory | null>(null);
  const [confirmingOperatoryMode, setConfirmingOperatoryMode] = useState(false);
  const [savingOperatoryMode, setSavingOperatoryMode] = useState(false);

  const useOperatories = activeLocation?.set_availability_by_operatory ?? false;

  function refresh() {
    setLoading(true);
    Promise.all([
      staffApi.providers.list(),
      staffApi.operatories.list(),
      staffApi.availabilitySlots.list(),
      staffApi.appointmentTypes.list(),
      staffApi.availabilityBlocks.list(),
    ])
      .then(([p, o, s, t, b]) => {
        setProviders(p.map(mapProvider));
        setOperatories(o.map(mapOperatory));
        setSlots(s.map(mapAvailabilitySlot));
        setAppointmentTypes(t.map(mapAppointmentType));
        setBlocks(b.map(mapAvailabilityBlock));
      })
      .finally(() => setLoading(false));
  }
  useEffect(refresh, []);

  async function toggleProviderStatus(provider: Provider) {
    const next = provider.status === "active" ? "inactive" : "active";
    setProviders((prev) => prev.map((p) => (p.id === provider.id ? { ...p, status: next } : p)));
    try {
      await staffApi.providers.update(provider.id, { status: next });
      toastSuccess(`${provider.name} marked ${next}`);
    } catch (err: unknown) {
      setProviders((prev) => prev.map((p) => (p.id === provider.id ? { ...p, status: provider.status } : p)));
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not update provider status — please try again.");
    }
  }

  async function handleDeleteProvider() {
    if (!deletingProvider) return;
    try {
      await staffApi.providers.delete(deletingProvider.id);
      toastSuccess("Provider deleted");
      setDeletingProvider(null);
      refresh();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not delete this provider — please try again.");
    }
  }

  async function toggleOperatoryActive(operatory: Operatory) {
    setOperatories((prev) => prev.map((o) => (o.id === operatory.id ? { ...o, active: !o.active } : o)));
    try {
      await staffApi.operatories.update(operatory.id, { active: !operatory.active });
      toastSuccess(`${operatory.name} ${!operatory.active ? "opened" : "closed"}`);
    } catch (err: unknown) {
      setOperatories((prev) => prev.map((o) => (o.id === operatory.id ? { ...o, active: operatory.active } : o)));
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not update this operatory — please try again.");
    }
  }

  async function handleAddOperatory() {
    if (!newOperatoryName.trim() || addingOperatory) return;
    setAddingOperatory(true);
    try {
      await staffApi.operatories.create({ name: newOperatoryName.trim() });
      setNewOperatoryName("");
      toastSuccess("Operatory added");
      refresh();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not add this operatory — please try again.");
    } finally {
      setAddingOperatory(false);
    }
  }

  async function handleDeleteOperatory() {
    if (!deletingOperatory) return;
    try {
      await staffApi.operatories.delete(deletingOperatory.id);
      toastSuccess("Operatory deleted");
      setDeletingOperatory(null);
      refresh();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not delete this operatory — please try again.");
    }
  }

  async function handleToggleOperatoryMode() {
    if (!activeLocation || savingOperatoryMode) return;
    setSavingOperatoryMode(true);
    try {
      await practiceApi.updateLocation(activeLocation.id, { set_availability_by_operatory: !useOperatories });
      await refreshSession();
      toastSuccess(`Availability by operatory turned ${!useOperatories ? "on" : "off"}`);
      setConfirmingOperatoryMode(false);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not update this setting — please try again.");
    } finally {
      setSavingOperatoryMode(false);
    }
  }

  async function handleCloneSlot(slot: AvailabilitySlot) {
    try {
      const cloned = await staffApi.availabilitySlots.clone(slot.id);
      toastSuccess("Slot cloned — edit it below");
      refresh();
      setSlotModal({ providerId: slot.providerId, initial: mapAvailabilitySlot(cloned) });
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not clone this slot — please try again.");
    }
  }

  async function handleDeleteSlot() {
    if (!deletingSlot) return;
    try {
      await staffApi.availabilitySlots.delete(deletingSlot.id);
      toastSuccess("Availability slot deleted");
      setDeletingSlot(null);
      refresh();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not delete this slot — please try again.");
    }
  }

  async function handleDeleteBlock() {
    if (!deletingBlock) return;
    try {
      await staffApi.availabilityBlocks.delete(deletingBlock.id);
      toastSuccess("Block removed");
      setDeletingBlock(null);
      refresh();
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not remove this block — please try again.");
    }
  }

  const filteredProviders = providers.filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full min-w-0 px-4 sm:px-6 py-5 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft size={15} /> Appointment types
        </button>
        <span className="text-gray-300 hidden sm:inline">|</span>
        <h1 className="text-2xl font-bold text-gray-900">Providers &amp; availability</h1>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-b border-border">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">Set availability by operatory</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Schedule by chair/column instead of by provider. Changing this will require setting up availability again.
            </p>
          </div>
          <Toggle on={useOperatories} onChange={() => setConfirmingOperatoryMode(true)} />
        </div>

        {useOperatories ? (
          <div className="px-4 sm:px-5 py-3.5 border-b border-border space-y-3">
            <p className="text-xs font-semibold text-gray-600">Operatories</p>
            {operatories.length === 0 ? (
              <p className="text-sm text-gray-400">No operatories yet.</p>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
                {operatories.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="text-sm text-gray-800 truncate">{o.name}</span>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Toggle on={o.active} onChange={() => toggleOperatoryActive(o)} />
                      <IconButton
                        label="Delete"
                        onClick={() => setDeletingOperatory(o)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={newOperatoryName}
                onChange={(e) => setNewOperatoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddOperatory()}
                placeholder="e.g. OP2"
                className="flex-1 min-w-0 px-3.5 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              />
              <button
                onClick={handleAddOperatory}
                disabled={addingOperatory || !newOperatoryName.trim()}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                + Add operatory
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 sm:px-5 py-3 border-b border-border">
            <p className="text-xs text-gray-500">Turn on "Set availability by operatory" to manage individual chairs/columns.</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-3">
          <div className="flex items-center gap-2 flex-1 px-3 py-2 border border-gray-200 rounded-lg">
            <Search size={14} className="text-gray-400 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search providers"
              className="flex-1 min-w-0 outline-none text-sm text-gray-700 placeholder:text-gray-400 bg-transparent"
            />
          </div>
          <button
            onClick={() => setAddingProvider(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus size={15} /> Add provider
          </button>
        </div>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-gray-400">Loading…</p>
      ) : filteredProviders.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">No providers yet.</p>
      ) : (
        <div className="space-y-4">
          {filteredProviders.map((provider) => {
            const providerSlots = slots.filter((s) => s.providerId === provider.id);
            const providerBlocks = blocks.filter((b) => b.providerId === provider.id);
            return (
              <div key={provider.id} className="bg-white rounded-xl border border-border overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-border">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {provider.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-gray-900 truncate">{provider.name}</span>
                        <IconButton
                          label="Edit"
                          onClick={() => setEditingProvider(provider)}
                          className="text-gray-400 hover:text-teal-600 flex-shrink-0"
                        >
                          <Pencil size={12} />
                        </IconButton>
                      </div>
                      <span className="text-xs text-gray-500">{provider.role || "No role set"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-xs font-medium text-gray-600">{provider.status === "active" ? "Active" : "Inactive"}</span>
                      <Toggle on={provider.status === "active"} onChange={() => toggleProviderStatus(provider)} />
                    </label>
                    <IconButton
                      label="Delete"
                      onClick={() => setDeletingProvider(provider)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 px-4 sm:px-5 py-2.5 border-b border-border">
                  <button
                    onClick={() => setDefaultsModal({ provider, mode: "types" })}
                    className="text-left text-xs text-gray-600 hover:text-teal-700"
                  >
                    <span className="font-semibold">Default appointment types</span>{" "}
                    ({provider.defaultAppointmentTypeIds.length}) <span className="text-teal-600">Edit</span>
                  </button>
                  <button
                    onClick={() => setDefaultsModal({ provider, mode: "insurances" })}
                    className="text-left text-xs text-gray-600 hover:text-teal-700"
                  >
                    <span className="font-semibold">Default insurances</span>{" "}
                    ({provider.defaultInsurances.length}) <span className="text-teal-600">Edit</span>
                  </button>
                </div>

                <div className="px-4 sm:px-5 py-3">
                  {providerSlots.length === 0 ? (
                    <p className="text-sm text-gray-400 py-3 text-center">No availability set yet.</p>
                  ) : (
                    <div className="overflow-x-auto -mx-1">
                      <table className="w-full text-sm min-w-[560px]">
                        <thead>
                          <tr className="text-xs text-gray-500">
                            <th className="text-left font-semibold py-1.5 px-1">Hours</th>
                            <th className="text-left font-semibold py-1.5 px-1">Time</th>
                            <th className="text-left font-semibold py-1.5 px-1">Appointment types</th>
                            <th className="text-left font-semibold py-1.5 px-1">Operatory</th>
                            <th className="py-1.5 px-1" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {providerSlots.map((slot) => (
                            <tr key={slot.id}>
                              <td className="py-2 px-1 text-gray-700">{formatHours(slot)}</td>
                              <td className="py-2 px-1 text-gray-700 whitespace-nowrap">
                                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                              </td>
                              <td className="py-2 px-1 text-gray-700 truncate max-w-[200px]">
                                {formatAppointmentTypes(slot, appointmentTypes)}
                              </td>
                              <td className="py-2 px-1 text-gray-700">
                                {slot.operatoryId ? operatories.find((o) => o.id === slot.operatoryId)?.name ?? "—" : activeLocation?.name ?? "Location name"}
                              </td>
                              <td className="py-2 px-1">
                                <div className="flex items-center gap-1 justify-end">
                                  <IconButton
                                    label="Edit"
                                    onClick={() => setSlotModal({ providerId: provider.id, initial: slot })}
                                    className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
                                  >
                                    <Pencil size={12} />
                                  </IconButton>
                                  <IconButton
                                    label="Clone"
                                    onClick={() => handleCloneSlot(slot)}
                                    className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
                                  >
                                    <Copy size={12} />
                                  </IconButton>
                                  <IconButton
                                    label="Delete"
                                    onClick={() => setDeletingSlot(slot)}
                                    className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-red-500 hover:bg-red-50"
                                  >
                                    <Trash2 size={12} />
                                  </IconButton>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <button
                    onClick={() => setSlotModal({ providerId: provider.id })}
                    className="mt-2 flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700"
                  >
                    <Plus size={14} /> Add time
                  </button>
                </div>

                <div className="px-4 sm:px-5 py-3 border-t border-border">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Blocked times</p>
                  {providerBlocks.length === 0 ? (
                    <p className="text-sm text-gray-400 py-1">No blocked times.</p>
                  ) : (
                    <div className="overflow-x-auto -mx-1">
                      <table className="w-full text-sm min-w-[560px]">
                        <thead>
                          <tr className="text-xs text-gray-500">
                            <th className="text-left font-semibold py-1.5 px-1">Starts</th>
                            <th className="text-left font-semibold py-1.5 px-1">Ends</th>
                            <th className="text-left font-semibold py-1.5 px-1">Operatory</th>
                            <th className="text-left font-semibold py-1.5 px-1">Notes</th>
                            <th className="py-1.5 px-1" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {providerBlocks.map((block) => (
                            <tr key={block.id}>
                              <td className="py-2 px-1 text-gray-700 whitespace-nowrap">{formatDateTime(block.startsAt)}</td>
                              <td className="py-2 px-1 text-gray-700 whitespace-nowrap">{formatDateTime(block.endsAt)}</td>
                              <td className="py-2 px-1 text-gray-700">
                                {block.operatoryId ? operatories.find((o) => o.id === block.operatoryId)?.name ?? "—" : "Whole provider"}
                              </td>
                              <td className="py-2 px-1 text-gray-700 truncate max-w-[200px]">{block.notes || "—"}</td>
                              <td className="py-2 px-1">
                                <div className="flex items-center gap-1 justify-end">
                                  <IconButton
                                    label="Edit"
                                    onClick={() => setBlockModal({ providerId: provider.id, initial: block })}
                                    className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
                                  >
                                    <Pencil size={12} />
                                  </IconButton>
                                  <IconButton
                                    label="Delete"
                                    onClick={() => setDeletingBlock(block)}
                                    className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-red-500 hover:bg-red-50"
                                  >
                                    <Trash2 size={12} />
                                  </IconButton>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <button
                    onClick={() => setBlockModal({ providerId: provider.id })}
                    className="mt-2 flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700"
                  >
                    <Plus size={14} /> Block time
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {addingProvider && (
        <ProviderModal
          onClose={() => setAddingProvider(false)}
          onSaved={() => {
            setAddingProvider(false);
            refresh();
          }}
        />
      )}
      {editingProvider && (
        <ProviderModal
          initial={editingProvider}
          onClose={() => setEditingProvider(null)}
          onSaved={() => {
            setEditingProvider(null);
            refresh();
          }}
        />
      )}
      {defaultsModal && (
        <ProviderDefaultsModal
          provider={defaultsModal.provider}
          appointmentTypes={appointmentTypes}
          mode={defaultsModal.mode}
          onClose={() => setDefaultsModal(null)}
          onSaved={() => {
            setDefaultsModal(null);
            refresh();
          }}
        />
      )}
      {slotModal && (
        <AvailabilitySlotModal
          providerId={slotModal.providerId}
          operatories={operatories}
          appointmentTypes={appointmentTypes}
          useOperatories={useOperatories}
          initial={slotModal.initial}
          onClose={() => setSlotModal(null)}
          onSaved={() => {
            setSlotModal(null);
            refresh();
          }}
        />
      )}
      {blockModal && (
        <BlockAvailabilityModal
          providerId={blockModal.providerId}
          operatories={operatories}
          useOperatories={useOperatories}
          initial={blockModal.initial}
          onClose={() => setBlockModal(null)}
          onSaved={() => {
            setBlockModal(null);
            refresh();
          }}
        />
      )}

      {deletingProvider && (
        <ConfirmModal
          title="Delete provider?"
          message={`"${deletingProvider.name}" and all of their availability slots will be permanently removed. This can't be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDeleteProvider}
          onCancel={() => setDeletingProvider(null)}
        />
      )}
      {deletingOperatory && (
        <ConfirmModal
          title="Delete operatory?"
          message={`"${deletingOperatory.name}" and any availability slots assigned to it will be permanently removed. This can't be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDeleteOperatory}
          onCancel={() => setDeletingOperatory(null)}
        />
      )}
      {deletingSlot && (
        <ConfirmModal
          title="Delete availability slot?"
          message="This time slot will no longer be bookable online. This can't be undone."
          confirmLabel="Delete"
          danger
          onConfirm={handleDeleteSlot}
          onCancel={() => setDeletingSlot(null)}
        />
      )}
      {deletingBlock && (
        <ConfirmModal
          title="Remove this block?"
          message="The provider will become bookable online during this window again. This can't be undone."
          confirmLabel="Remove"
          danger
          onConfirm={handleDeleteBlock}
          onCancel={() => setDeletingBlock(null)}
        />
      )}
      {confirmingOperatoryMode && (
        <ConfirmModal
          title={useOperatories ? "Turn off availability by operatory?" : "Turn on availability by operatory?"}
          message="This changes your online booking format and will require setting up availability again. Continue?"
          confirmLabel="Continue"
          submitting={savingOperatoryMode}
          onConfirm={handleToggleOperatoryMode}
          onCancel={() => setConfirmingOperatoryMode(false)}
        />
      )}
    </div>
  );
}
