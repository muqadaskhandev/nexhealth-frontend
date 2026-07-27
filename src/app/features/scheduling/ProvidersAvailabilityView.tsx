import { useEffect, useState } from "react";
import { ArrowLeft, Ban, Calendar, Clock, Copy, Pencil, Plus, Search, Trash2 } from "lucide-react";
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

function providerInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const actionBtnCls =
  "w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors";
const dangerBtnCls =
  "w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors";

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
        <p className="py-12 text-center text-sm text-gray-400">Loading providers…</p>
      ) : filteredProviders.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm font-medium text-gray-600">No providers yet</p>
          <p className="text-xs text-gray-400 mt-1">Add a provider to start setting up online booking availability.</p>
          <button
            onClick={() => setAddingProvider(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={15} /> Add provider
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredProviders.map((provider) => {
            const providerSlots = slots.filter((s) => s.providerId === provider.id);
            const providerBlocks = blocks.filter((b) => b.providerId === provider.id);
            const isActive = provider.status === "active";
            return (
              <div
                key={provider.id}
                className={`bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden transition-opacity ${
                  isActive ? "" : "opacity-75"
                }`}
              >
                {/* Header */}
                <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {provider.avatarUrl ? (
                      <img
                        src={provider.avatarUrl}
                        alt=""
                        className="w-11 h-11 rounded-full object-cover flex-shrink-0 ring-2 ring-white shadow-sm"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold flex-shrink-0 ring-2 ring-white shadow-sm">
                        {providerInitials(provider.name)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-gray-900 truncate">{provider.name}</h3>
                        <IconButton
                          label="Edit"
                          onClick={() => setEditingProvider(provider)}
                          className="text-gray-400 hover:text-teal-600 flex-shrink-0"
                        >
                          <Pencil size={13} />
                        </IconButton>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${
                            isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{provider.role || "No role set"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200">
                      <span className="text-xs font-medium text-gray-600">Online booking</span>
                      <Toggle on={isActive} onChange={() => toggleProviderStatus(provider)} />
                    </div>
                    <IconButton
                      label="Delete"
                      onClick={() => setDeletingProvider(provider)}
                      className={dangerBtnCls}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                </div>

                {/* Defaults */}
                <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50/40">
                  <button
                    onClick={() => setDefaultsModal({ provider, mode: "types" })}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:border-teal-300 hover:bg-teal-50/50 transition-colors"
                  >
                    <Calendar size={14} className="text-teal-600 flex-shrink-0" />
                    <span>
                      Appointment types
                      <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                        {provider.defaultAppointmentTypeIds.length}
                      </span>
                    </span>
                  </button>
                  <button
                    onClick={() => setDefaultsModal({ provider, mode: "insurances" })}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:border-teal-300 hover:bg-teal-50/50 transition-colors"
                  >
                    <span>
                      Default insurances
                      <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                        {provider.defaultInsurances.length}
                      </span>
                    </span>
                  </button>
                </div>

                {/* Availability */}
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Clock size={15} className="text-teal-600" />
                      <h4 className="text-sm font-semibold text-gray-900">Availability</h4>
                      {providerSlots.length > 0 && (
                        <span className="text-xs font-medium text-gray-500">
                          {providerSlots.length} slot{providerSlots.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setSlotModal({ providerId: provider.id })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                    >
                      <Plus size={14} /> Add time
                    </button>
                  </div>

                  {providerSlots.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center">
                      <p className="text-sm font-medium text-gray-600">No availability set yet</p>
                      <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                        Add weekly hours so patients can book this provider online.
                      </p>
                      <button
                        onClick={() => setSlotModal({ providerId: provider.id })}
                        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        <Plus size={14} /> Add first time slot
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {providerSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="group flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-teal-200 hover:shadow-sm transition-all"
                        >
                          <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Hours</p>
                              <p className="text-sm text-gray-800">{formatHours(slot)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Time</p>
                              <p className="text-sm text-gray-800 whitespace-nowrap">
                                {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                              </p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Types</p>
                              <p className="text-sm text-gray-800 truncate">
                                {formatAppointmentTypes(slot, appointmentTypes)}
                              </p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Operatory</p>
                              <p className="text-sm text-gray-800 truncate">
                                {slot.operatoryId
                                  ? operatories.find((o) => o.id === slot.operatoryId)?.name ?? "—"
                                  : activeLocation?.name ?? "Location"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0 sm:opacity-80 sm:group-hover:opacity-100">
                            <IconButton
                              label="Edit"
                              onClick={() => setSlotModal({ providerId: provider.id, initial: slot })}
                              className={actionBtnCls}
                            >
                              <Pencil size={13} />
                            </IconButton>
                            <IconButton
                              label="Clone"
                              onClick={() => handleCloneSlot(slot)}
                              className={actionBtnCls}
                            >
                              <Copy size={13} />
                            </IconButton>
                            <IconButton
                              label="Delete"
                              onClick={() => setDeletingSlot(slot)}
                              className={dangerBtnCls}
                            >
                              <Trash2 size={13} />
                            </IconButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Blocked times */}
                <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/30">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Ban size={15} className="text-gray-400" />
                      <h4 className="text-sm font-semibold text-gray-900">Blocked times</h4>
                      {providerBlocks.length > 0 && (
                        <span className="text-xs font-medium text-gray-500">
                          {providerBlocks.length} block{providerBlocks.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setBlockModal({ providerId: provider.id })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Plus size={14} /> Block time
                    </button>
                  </div>

                  {providerBlocks.length === 0 ? (
                    <p className="text-sm text-gray-400 pl-6">No blocked times — vacations and closures can be added here.</p>
                  ) : (
                    <div className="space-y-2">
                      {providerBlocks.map((block) => (
                        <div
                          key={block.id}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white"
                        >
                          <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Starts</p>
                              <p className="text-sm text-gray-800 whitespace-nowrap">{formatDateTime(block.startsAt)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Ends</p>
                              <p className="text-sm text-gray-800 whitespace-nowrap">{formatDateTime(block.endsAt)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Operatory</p>
                              <p className="text-sm text-gray-800">
                                {block.operatoryId
                                  ? operatories.find((o) => o.id === block.operatoryId)?.name ?? "—"
                                  : "Whole provider"}
                              </p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Notes</p>
                              <p className="text-sm text-gray-800 truncate">{block.notes || "—"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <IconButton
                              label="Edit"
                              onClick={() => setBlockModal({ providerId: provider.id, initial: block })}
                              className={actionBtnCls}
                            >
                              <Pencil size={13} />
                            </IconButton>
                            <IconButton
                              label="Delete"
                              onClick={() => setDeletingBlock(block)}
                              className={dangerBtnCls}
                            >
                              <Trash2 size={13} />
                            </IconButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
