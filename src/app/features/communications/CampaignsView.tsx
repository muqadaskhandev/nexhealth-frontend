import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Download,
  Eye,
  Heart,
  Image as ImageIcon,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { staffApi, type ApiCampaign } from "../../lib/staff-api";
import { toastError, toastSuccess } from "../../lib/toast";

type Tab = "drafts" | "scheduled" | "sent" | "favorites" | "all";
type FilterKey =
  | "demographic"
  | "appointment"
  | "procedure"
  | "insurance"
  | "waitlist"
  | "continuing"
  | "search"
  | "csv";

const TABS: { id: Tab; label: string }[] = [
  { id: "drafts", label: "Drafts" },
  { id: "scheduled", label: "Scheduled" },
  { id: "sent", label: "Sent" },
  { id: "favorites", label: "Favorites" },
  { id: "all", label: "All" },
];

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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

function CopyCampaignModal({
  source,
  onClose,
  onCreated,
}: {
  source: ApiCampaign;
  onClose: () => void;
  onCreated: (c: ApiCampaign) => void;
}) {
  const { locations, activeLocation } = useAuth();
  const [title, setTitle] = useState(`Copy of ${source.title}`);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(activeLocation ? [activeLocation.id] : [])
  );
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.address || "").toLowerCase().includes(q) ||
        (l.city || "").toLowerCase().includes(q)
    );
  }, [locations, search]);

  async function submit() {
    if (!title.trim()) {
      toastError("Enter a campaign title");
      return;
    }
    if (selected.size === 0) {
      toastError("Select at least one location");
      return;
    }
    setSaving(true);
    try {
      const row = await staffApi.campaigns.copy(source.id, {
        title: title.trim(),
        location_ids: [...selected],
      });
      toastSuccess("Campaign copy created");
      onCreated(row);
    } catch {
      toastError("Could not copy campaign.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-gray-900">Copy campaign</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Campaign title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-400"
            />
            <span className="text-[11px] text-gray-400">Not visible to patients</span>
          </label>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Locations</span>
              <div className="flex gap-2 text-xs font-medium text-teal-600">
                <button type="button" onClick={() => setSelected(new Set())}>
                  Deselect all
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(new Set(locations.map((l) => l.id)))}
                >
                  Select all
                </button>
              </div>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full mb-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y">
              {filtered.map((loc) => {
                const on = selected.has(loc.id);
                return (
                  <label
                    key={loc.id}
                    className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer ${
                      on ? "bg-teal-50/70" : "hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(loc.id)) next.delete(loc.id);
                          else next.add(loc.id);
                          return next;
                        });
                      }}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium text-gray-900">{loc.name}</span>
                      <span className="block text-xs text-gray-500">{formatLocationLine(loc)}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-border flex gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className="px-4 py-2 text-sm font-semibold text-white bg-teal-500 rounded-lg hover:bg-teal-600 disabled:opacity-50"
          >
            Continue
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ScheduleModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (iso: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl border border-border p-4 space-y-3">
        <h3 className="font-semibold text-gray-900">Schedule campaign</h3>
        <p className="text-sm text-gray-500">
          Note: NexHealth cannot individually schedule specific messages to specific patients within
          Messages.
        </p>
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-3 py-2 text-sm text-teal-700">
            Cancel
          </button>
          <button
            type="button"
            disabled={!value || saving}
            onClick={() => {
              setSaving(true);
              const iso = new Date(value).toISOString();
              void onConfirm(iso).finally(() => setSaving(false));
            }}
            className="px-4 py-2 text-sm font-semibold text-white bg-teal-500 rounded-lg disabled:opacity-50"
          >
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
}

function ImageInsertModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (img: {
    id: string;
    name: string;
    data_url: string;
    alt: string;
    width?: number;
    height?: number;
    link_url: string;
  }) => void;
}) {
  const [alt, setAlt] = useState("");
  const [link, setLink] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [dataUrl, setDataUrl] = useState("");
  const [name, setName] = useState("");

  function onFile(file: File | null) {
    if (!file) return;
    setName(file.name);
    const reader = new FileReader();
    reader.onload = () => setDataUrl(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-gray-900">Insert/Edit Image</h3>
          <button type="button" onClick={onClose}>
            <X size={18} className="text-gray-400" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div
            className="border-2 border-dashed border-gray-200 rounded-lg px-4 py-8 text-center text-sm text-gray-500"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFile(e.dataTransfer.files?.[0] || null);
            }}
          >
            <p>Drag and drop your desired image into the box, or</p>
            <label className="inline-block mt-2 text-teal-600 font-medium cursor-pointer">
              Browse for an image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0] || null)}
              />
            </label>
            {name && <p className="mt-2 text-xs text-gray-700">{name}</p>}
          </div>
          <label className="block text-sm">
            <span className="text-gray-700">Alternative description</span>
            <input
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-700">Link URL (optional — e.g. video)</span>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg"
              placeholder="https://"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm">
              <span className="text-gray-700">Width</span>
              <input
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-700">Height</span>
              <input
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </label>
          </div>
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Images cannot be added to SMS campaigns due to carrier requirements. Videos cannot be
            directly embedded — upload an image and overlay a link so patients can launch the video.
          </p>
        </div>
        <div className="px-4 py-3 border-t flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 text-sm text-gray-600">
            Cancel
          </button>
          <button
            type="button"
            disabled={!dataUrl}
            onClick={() => {
              onSave({
                id: crypto.randomUUID(),
                name,
                data_url: dataUrl,
                alt,
                width: width ? Number(width) : undefined,
                height: height ? Number(height) : undefined,
                link_url: link,
              });
              onClose();
            }}
            className="px-4 py-2 text-sm font-semibold text-white bg-teal-500 rounded-lg disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function WizardSteps({ step }: { step: string }) {
  const steps = [
    { id: "audience", label: "Select audience" },
    { id: "verify", label: "Verify patients" },
    { id: "build", label: "Build & send" },
  ];
  const idx = steps.findIndex((s) => s.id === step);
  return (
    <div className="flex items-center gap-2 text-sm flex-wrap">
      {steps.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s.id} className="flex items-center gap-2">
            {i > 0 && <span className="text-gray-300">›</span>}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
                active
                  ? "bg-teal-500 text-white font-semibold"
                  : done
                    ? "bg-teal-50 text-teal-800 font-medium"
                    : "bg-gray-100 text-gray-500"
              }`}
            >
              {done ? "✓" : i + 1} {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CampaignEditor({
  campaign,
  onChange,
  onBack,
}: {
  campaign: ApiCampaign;
  onChange: (c: ApiCampaign) => void;
  onBack: () => void;
}) {
  const [filterTab, setFilterTab] = useState<FilterKey>("demographic");
  const [audience, setAudience] = useState<{
    total: number;
    patients: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
      dob: string | null;
    }[];
  } | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingSms, setEditingSms] = useState(false);
  const [aiPrompt, setAiPrompt] = useState(campaign.ai_prompt || "");
  const [imageOpen, setImageOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [titleEdit, setTitleEdit] = useState(campaign.title);

  const filters = (campaign.audience_filters || {}) as Record<string, unknown>;

  async function patch(body: Record<string, unknown>) {
    const updated = await staffApi.campaigns.update(campaign.id, body);
    onChange(updated);
    return updated;
  }

  async function refreshAudience() {
    const data = await staffApi.campaigns.audience(campaign.id);
    setAudience(data);
  }

  useEffect(() => {
    if (campaign.wizard_step === "verify" || campaign.wizard_step === "build") {
      void refreshAudience().catch(() => setAudience({ total: 0, patients: [] }));
    }
  }, [campaign.id, campaign.wizard_step, campaign.audience_filters, campaign.excluded_patient_ids]);

  async function setFilter(partial: Record<string, unknown>) {
    const next = { ...filters, ...partial };
    await patch({ audience_filters: next });
  }

  const filteredPatients = useMemo(() => {
    const rows = audience?.patients || [];
    const q = patientSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (p) =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        (p.phone || "").includes(q)
    );
  }, [audience, patientSearch]);

  if (campaign.is_favorite_template) {
    return (
      <div className="px-4 sm:px-6 py-5 space-y-4 max-w-4xl">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-teal-700 hover:underline"
        >
          <ArrowLeft size={14} /> Campaigns
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Heart size={18} className="text-rose-500 fill-rose-500" /> {campaign.title}
            </h1>
            <p className="text-sm text-gray-500 mt-1">NexHealth pre-built template · Draft</p>
          </div>
          <button
            type="button"
            onClick={() => setBusy(true)}
            className="px-4 py-2 text-sm font-semibold text-white bg-teal-500 rounded-lg hover:bg-teal-600"
            id="make-copy-btn"
          >
            Make a copy
          </button>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 grid sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 min-h-[160px]">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Email preview</p>
            <p className="font-semibold text-gray-800">{campaign.email_subject}</p>
            <pre className="mt-2 text-sm text-gray-600 whitespace-pre-wrap font-sans">
              {campaign.email_body}
            </pre>
          </div>
          <div>
            <p className="text-sm text-gray-700 mb-2">
              Subject: <span className="font-medium">{campaign.email_subject}</span>
            </p>
            <button
              type="button"
              className="text-sm text-teal-700 font-medium"
              onClick={() => toastSuccess("Email preview shown on the left")}
            >
              View email
            </button>
            <p className="text-sm text-gray-500 mt-4">
              You can also copy campaigns without previewing first by using the ellipsis (…) on the
              list.
            </p>
          </div>
        </div>
        {busy && (
          <CopyCampaignModal
            source={campaign}
            onClose={() => setBusy(false)}
            onCreated={(c) => {
              setBusy(false);
              onChange(c);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-5 space-y-4 max-w-5xl">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-teal-700 hover:underline"
      >
        <ArrowLeft size={14} /> Campaigns
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <input
            value={titleEdit}
            onChange={(e) => setTitleEdit(e.target.value)}
            onBlur={() => {
              if (titleEdit.trim() && titleEdit !== campaign.title) {
                void patch({ title: titleEdit.trim() }).catch(() =>
                  toastError("Could not rename")
                );
              }
            }}
            className="text-xl font-bold text-gray-900 bg-transparent outline-none border-b border-transparent focus:border-teal-400 min-w-0"
          />
          <Pencil size={14} className="text-gray-400 flex-shrink-0" />
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
            {campaign.status}
          </span>
        </div>
        {campaign.wizard_step === "build" && campaign.status !== "sent" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setScheduleOpen(true)}
              className="px-3 py-2 text-sm font-semibold text-teal-700 border border-teal-300 rounded-lg hover:bg-teal-50"
            >
              Schedule
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void staffApi.campaigns
                  .send(campaign.id)
                  .then((c) => {
                    onChange(c);
                    toastSuccess("Campaign sent");
                  })
                  .catch((err: { detail?: string }) =>
                    toastError(err?.detail || "Could not send campaign")
                  )
                  .finally(() => setBusy(false));
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-teal-500 rounded-lg hover:bg-teal-600 disabled:opacity-50"
            >
              <Send size={14} /> Send
            </button>
          </div>
        )}
        {campaign.wizard_step !== "build" && (
          <button
            type="button"
            className="px-4 py-2 text-sm font-semibold text-white bg-teal-500 rounded-lg"
            onClick={() => {
              const next =
                campaign.wizard_step === "audience"
                  ? "verify"
                  : campaign.wizard_step === "verify"
                    ? "build"
                    : "build";
              void (async () => {
                if (next === "verify" || next === "build") {
                  const preview = await staffApi.campaigns.audience(campaign.id);
                  await patch({
                    wizard_step: next,
                    selected_patient_ids: preview.patients.map((p) => p.id),
                  });
                } else {
                  await patch({ wizard_step: next });
                }
              })().catch(() => toastError("Could not continue"));
            }}
          >
            Continue
          </button>
        )}
      </div>

      <WizardSteps step={campaign.wizard_step} />

      {campaign.wizard_step === "audience" && (
        <div className="bg-white rounded-xl border border-border overflow-hidden grid md:grid-cols-[200px_1fr]">
          <aside className="border-r border-border p-3 space-y-1">
            <p className="px-2 text-[11px] font-semibold uppercase text-gray-400 mb-1">
              Patient filters
            </p>
            {(
              [
                ["demographic", "Demographic info"],
                ["appointment", "Appointment"],
                ["procedure", "Procedure"],
                ["insurance", "Insurance"],
                ["waitlist", "Waitlist"],
                ["continuing", "Continuing care"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilterTab(id)}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-sm ${
                  filterTab === id ? "bg-teal-50 text-teal-800 font-semibold" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
            <p className="px-2 pt-3 text-[11px] font-semibold uppercase text-gray-400">
              Manual filters
            </p>
            {(
              [
                ["search", "Search patients"],
                ["csv", "Upload CSV"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilterTab(id)}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-sm ${
                  filterTab === id ? "bg-teal-50 text-teal-800 font-semibold" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </aside>
          <div className="p-4 space-y-4">
            <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 text-sm text-slate-700">
              By default, NexHealth sends campaigns to <strong>active patients</strong> synced from
              your EHR. Narrow the list with demographic, appointment, procedure, insurance,
              waitlist, continuing care, search, or CSV upload filters.
            </div>

            {filterTab === "demographic" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Demographic info</h3>
                <p className="text-sm text-gray-500">Filter patients by demographic information.</p>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-gray-800">Age</legend>
                  {(
                    [
                      ["all", "All"],
                      ["over_18", "Over 18 years old"],
                      ["under_18", "Under 18 years old"],
                      ["custom", "Custom age range"],
                    ] as const
                  ).map(([val, label]) => (
                    <label key={val} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="age"
                        checked={(filters.age || "all") === val}
                        onChange={() => void setFilter({ age: val })}
                      />
                      {label}
                    </label>
                  ))}
                  {(filters.age || "all") === "custom" && (
                    <div className="flex items-center gap-2 pl-6">
                      <input
                        type="number"
                        placeholder="Min age"
                        className="w-24 px-2 py-1.5 border rounded-lg text-sm"
                        value={(filters.age_min as number) ?? ""}
                        onChange={(e) =>
                          void setFilter({
                            age_min: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                      <span className="text-gray-400">to</span>
                      <input
                        type="number"
                        placeholder="Max age"
                        className="w-24 px-2 py-1.5 border rounded-lg text-sm"
                        value={(filters.age_max as number) ?? ""}
                        onChange={(e) =>
                          void setFilter({
                            age_max: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                    </div>
                  )}
                </fieldset>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-gray-800">Gender</legend>
                  {(
                    [
                      ["all", "All"],
                      ["female", "Female"],
                      ["male", "Male"],
                      ["other", "Other"],
                    ] as const
                  ).map(([val, label]) => (
                    <label key={val} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="gender"
                        checked={(filters.gender || "all") === val}
                        onChange={() => void setFilter({ gender: val })}
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
              </div>
            )}

            {filterTab === "appointment" && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Appointment</h3>
                <p className="text-sm text-gray-500">
                  Whether the patient has had an appointment or has one booked in the future.
                </p>
                {(
                  [
                    ["all", "All"],
                    ["has_past", "Has had an appointment"],
                    ["has_future", "Has a future appointment"],
                    ["none", "No appointments"],
                  ] as const
                ).map(([val, label]) => (
                  <label key={val} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={(filters.appointment || "all") === val}
                      onChange={() => void setFilter({ appointment: val })}
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}

            {filterTab === "procedure" && (
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">Procedure</h3>
                <p className="text-sm text-gray-500">
                  Available for Dentrix, Dentrix Ascend, Dentrix Enterprise, Denticon, Eaglesoft, and
                  Open Dental — including whether a procedure code has/has not been added to the
                  patient&apos;s visit or chart (e.g. unscheduled treatment).
                </p>
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  Procedure code filters require EHR sync for those systems. Use appointment and
                  demographic filters in this demo environment.
                </p>
              </div>
            )}

            {filterTab === "insurance" && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Insurance</h3>
                <p className="text-sm text-gray-500">
                  Available for Dentrix, Dentrix Enterprise, Open Dental, and Eaglesoft — filter by
                  name, group number, and/or employer.
                </p>
                <input
                  value={(filters.insurance_name as string) || ""}
                  onChange={(e) => void setFilter({ insurance_name: e.target.value })}
                  placeholder="Name, group number, or employer"
                  className="w-full max-w-md px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            )}

            {filterTab === "waitlist" && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Waitlist</h3>
                <p className="text-sm text-gray-500">Requires access to Scheduling.</p>
                {(
                  [
                    ["all", "All patients"],
                    ["on_asap", "On ASAP / Sooner if Possible list"],
                  ] as const
                ).map(([val, label]) => (
                  <label key={val} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={(filters.waitlist || "all") === val}
                      onChange={() => void setFilter({ waitlist: val })}
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}

            {filterTab === "continuing" && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Continuing care</h3>
                <p className="text-sm text-gray-500">
                  Patients due for recall care based on the due date recorded in your system.
                </p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(filters.continuing_care_due)}
                    onChange={(e) => void setFilter({ continuing_care_due: e.target.checked })}
                  />
                  Due for recall care
                </label>
              </div>
            )}

            {filterTab === "search" && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Search patients</h3>
                <p className="text-sm text-gray-500">Manually search by name to include specific patients.</p>
                <input
                  placeholder="Enter names, comma-separated"
                  className="w-full max-w-md px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  defaultValue={((filters.search_names as string[]) || []).join(", ")}
                  onBlur={(e) => {
                    const names = e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    void setFilter({ search_names: names });
                  }}
                />
              </div>
            )}

            {filterTab === "csv" && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Upload CSV</h3>
                <p className="text-sm text-gray-500">
                  Upload a CSV with last name, first name, phone number, and email — great for
                  patients from health record reports.
                </p>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="text-sm"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const text = String(reader.result || "");
                      const lines = text.split(/\r?\n/).slice(1).filter(Boolean);
                      const names = lines
                        .map((line) => {
                          const [last, first] = line.split(",");
                          return `${first || ""} ${last || ""}`.trim();
                        })
                        .filter(Boolean);
                      void setFilter({
                        search_names: [
                          ...new Set([
                            ...((filters.search_names as string[]) || []),
                            ...names,
                          ]),
                        ],
                        csv_uploaded: true,
                      });
                      toastSuccess(`Imported ${names.length} rows from CSV`);
                    };
                    reader.readAsText(file);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {campaign.wizard_step === "verify" && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-800">
              {audience?.total ?? "…"} patients selected
            </p>
            <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg">
              <Search size={14} className="text-gray-400" />
              <input
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Search patients"
                className="text-sm outline-none bg-transparent w-40"
              />
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Patients</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPatients.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-2">
                    <p className="font-medium text-gray-900">
                      {p.first_name} {p.last_name}
                    </p>
                    {p.dob && (
                      <p className="text-xs text-gray-400">
                        {new Date(p.dob).toLocaleDateString()}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{p.email || "—"}</td>
                  <td className="px-4 py-2 text-gray-600">{p.phone || "—"}</td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      className="text-gray-400 hover:text-rose-600"
                      onClick={() => {
                        const excluded = [
                          ...(campaign.excluded_patient_ids || []),
                          p.id,
                        ];
                        void patch({ excluded_patient_ids: excluded }).then(() =>
                          refreshAudience()
                        );
                      }}
                    >
                      <X size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                    No patients match these filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {campaign.wizard_step === "build" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-border p-4 space-y-4">
            {campaign.has_email ? (
              <div className="flex flex-wrap gap-4 items-start">
                <div className="w-40 h-28 rounded-lg border border-gray-100 bg-gradient-to-br from-teal-50 to-white flex items-center justify-center text-teal-700 text-xs font-semibold">
                  Email preview
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="text-sm font-semibold text-gray-900">Email</p>
                  <p className="text-sm text-gray-600">
                    Subject: {campaign.email_subject || "(no subject)"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingEmail(true)}
                      className="px-3 py-1.5 text-sm font-medium text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => toastSuccess("Preview: " + (campaign.email_subject || "Email"))}
                      className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg"
                    >
                      View email
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void staffApi.campaigns
                          .sendTest(campaign.id, "email")
                          .then((r) => toastSuccess(r.message))
                          .catch(() => toastError("Could not send test"));
                      }}
                      className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg"
                    >
                      Send test
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void patch({ has_email: false }).then(() =>
                          toastSuccess("Email removed")
                        );
                      }}
                      className="p-1.5 text-gray-400 hover:text-rose-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  void patch({ has_email: true }).then(() => setEditingEmail(true));
                }}
                className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700"
              >
                <Plus size={14} /> Add email message
              </button>
            )}

            {campaign.has_sms ? (
              <div className="border-t border-border pt-4 space-y-2">
                <p className="text-sm font-semibold text-gray-900">Text message</p>
                <p className="text-sm text-gray-600 line-clamp-2">{campaign.sms_body || "(empty)"}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSms(true)}
                    className="px-3 py-1.5 text-sm font-medium text-teal-700 border border-teal-200 rounded-lg"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void patch({ has_sms: false })}
                    className="p-1.5 text-gray-400 hover:text-rose-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => {
                    void patch({ has_sms: true }).then(() => setEditingSms(true));
                  }}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700"
                >
                  <Plus size={14} /> Add text message
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  SMS messages are limited to 425 characters or fewer to ensure deliverability.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-900">
            After sending a Campaign, you can see who sent each campaign within the Campaigns main
            page.
          </div>
        </div>
      )}

      {editingEmail && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setEditingEmail(false)} />
          <div className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-gray-900">Email builder</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void staffApi.campaigns
                      .sendTest(campaign.id, "email")
                      .then((r) => toastSuccess(r.message));
                  }}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
                >
                  Send test
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void patch({
                      email_subject: campaign.email_subject,
                      email_body: campaign.email_body,
                      email_preview_text: campaign.email_preview_text,
                      email_images: campaign.email_images,
                      ai_prompt: aiPrompt,
                    }).then(() => {
                      toastSuccess("Saved");
                      setEditingEmail(false);
                    });
                  }}
                  className="px-3 py-1.5 text-sm font-semibold text-white bg-teal-500 rounded-lg"
                >
                  Save and exit
                </button>
                <button type="button" onClick={() => setEditingEmail(false)}>
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
            </div>
            <div className="flex-1 grid md:grid-cols-[1fr_280px] min-h-0 overflow-hidden">
              <div className="p-4 border-r border-border overflow-y-auto space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setImageOpen(true)}
                    className="p-2 rounded-lg border border-gray-200 text-teal-700 hover:bg-teal-50"
                    title="Insert image"
                  >
                    <ImageIcon size={16} />
                  </button>
                  <span className="text-xs text-gray-400">Image · Smart commands in body</span>
                </div>
                <textarea
                  value={campaign.email_body}
                  onChange={(e) => onChange({ ...campaign, email_body: e.target.value })}
                  rows={16}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                />
                {(campaign.email_images || []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {campaign.email_images.map((img) => (
                      <div key={img.id} className="relative">
                        <img
                          src={img.data_url}
                          alt={img.alt || img.name}
                          className="h-20 rounded-lg border object-cover"
                        />
                        {img.link_url && (
                          <a
                            href={img.link_url}
                            target="_blank"
                            rel="noreferrer"
                            className="absolute inset-0"
                            title="Linked media"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 overflow-y-auto space-y-4 bg-gray-50/50">
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">Details</p>
                  <label className="block text-xs text-gray-500 mb-1">Subject line</label>
                  <input
                    value={campaign.email_subject}
                    onChange={(e) => onChange({ ...campaign, email_subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  />
                  <label className="block text-xs text-gray-500 mt-2 mb-1">Preview text</label>
                  <input
                    value={campaign.email_preview_text}
                    onChange={(e) =>
                      onChange({ ...campaign, email_preview_text: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                    <Sparkles size={14} className="text-amber-500" /> Generate with AI
                  </p>
                  <p className="text-xs text-gray-500">
                    Briefly outline your desired content, then click Generate with AI.
                  </p>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={3}
                    placeholder='e.g. "Let patients know my office will be closed today"'
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!aiPrompt.trim()) {
                        toastError("Enter a short outline first");
                        return;
                      }
                      void staffApi.campaigns
                        .generateAi(campaign.id, { prompt: aiPrompt, channel: "email" })
                        .then((r) => {
                          onChange({
                            ...campaign,
                            email_subject: r.subject || campaign.email_subject,
                            email_body: r.body,
                            email_preview_text: r.preview_text || campaign.email_preview_text,
                            ai_prompt: aiPrompt,
                          });
                          toastSuccess("Draft generated");
                        })
                        .catch(() => toastError("AI generate failed"));
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-teal-500 rounded-lg"
                  >
                    <Sparkles size={14} /> Generate with AI
                  </button>
                </div>
              </div>
            </div>
          </div>
          {imageOpen && (
            <ImageInsertModal
              onClose={() => setImageOpen(false)}
              onSave={(img) => {
                onChange({
                  ...campaign,
                  email_images: [...(campaign.email_images || []), img],
                });
                toastSuccess("Image added");
              }}
            />
          )}
        </div>
      )}

      {editingSms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setEditingSms(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold">Text message</h3>
              <button type="button" onClick={() => setEditingSms(false)}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-500">
                Keep SMS much shorter than email. Max 425 characters.
              </p>
              <textarea
                value={campaign.sms_body}
                onChange={(e) =>
                  onChange({ ...campaign, sms_body: e.target.value.slice(0, 425) })
                }
                rows={5}
                className="w-full px-3 py-2 border border-teal-300 rounded-lg text-sm"
              />
              <p className="text-xs text-gray-400 text-right">
                {campaign.sms_body.length}/425
              </p>
              <div className="flex gap-2">
                <input
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Outline for AI…"
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    void staffApi.campaigns
                      .generateAi(campaign.id, { prompt: aiPrompt || "Friendly reminder", channel: "sms" })
                      .then((r) => onChange({ ...campaign, sms_body: r.body.slice(0, 425) }));
                  }}
                  className="px-3 py-2 text-sm font-medium text-teal-700 border border-teal-200 rounded-lg"
                >
                  Generate with AI
                </button>
              </div>
            </div>
            <div className="px-4 py-3 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setEditingSms(false)} className="text-sm text-gray-600 px-3 py-2">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void patch({ sms_body: campaign.sms_body, has_sms: true, ai_prompt: aiPrompt }).then(
                    () => {
                      toastSuccess("SMS saved");
                      setEditingSms(false);
                    }
                  );
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-teal-500 rounded-lg"
              >
                Save and exit
              </button>
            </div>
          </div>
        </div>
      )}

      {scheduleOpen && (
        <ScheduleModal
          onClose={() => setScheduleOpen(false)}
          onConfirm={async (iso) => {
            const c = await staffApi.campaigns.schedule(campaign.id, iso);
            onChange(c);
            setScheduleOpen(false);
            toastSuccess("Campaign scheduled");
          }}
        />
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  rate,
  icon,
}: {
  label: string;
  value: number;
  rate?: number;
  icon?: string;
}) {
  return (
    <div className="flex-1 min-w-[110px] px-3 py-3 text-center border-r border-gray-100 last:border-0">
      <p className="text-xs text-gray-500 mb-1">
        {icon ? `${icon} ` : ""}
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      {rate !== undefined && (
        <p className="text-xs text-gray-400 mt-0.5">{rate}%</p>
      )}
    </div>
  );
}

function SentCampaignAnalytics({
  campaign,
  onBack,
  onChange,
  onCopy,
}: {
  campaign: ApiCampaign;
  onBack: () => void;
  onChange: (c: ApiCampaign) => void;
  onCopy: () => void;
}) {
  const [data, setData] = useState<Awaited<ReturnType<typeof staffApi.campaigns.analytics>> | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [viewEmail, setViewEmail] = useState(false);
  const [showGlossary, setShowGlossary] = useState(true);

  useEffect(() => {
    setLoading(true);
    void staffApi.campaigns
      .analytics(campaign.id)
      .then(setData)
      .catch(() => toastError("Could not load campaign analytics"))
      .finally(() => setLoading(false));
  }, [campaign.id]);

  async function downloadCsv() {
    try {
      const res = await fetch(staffApi.campaigns.analyticsCsvUrl(campaign.id), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("fail");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `campaign-${campaign.id}-analytics.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toastSuccess("CSV downloaded");
    } catch {
      toastError("Could not download CSV");
    }
  }

  const emailStats = data?.channels.find((c) => c.channel === "email");
  const smsStats = data?.channels.find((c) => c.channel === "sms");

  return (
    <div className="px-4 sm:px-6 py-5 space-y-4 max-w-4xl">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-teal-700 hover:underline"
      >
        <ArrowLeft size={14} /> Campaigns
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{campaign.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Campaign history &amp; analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !campaign.is_starred;
              void staffApi.campaigns
                .star(campaign.id, next)
                .then((c) => {
                  onChange(c);
                  toastSuccess(next ? "Added to Favorites" : "Removed from Favorites");
                })
                .catch(() => toastError("Could not update favorite"));
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border ${
              campaign.is_starred
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Heart
              size={14}
              className={campaign.is_starred ? "fill-rose-500 text-rose-500" : ""}
            />{" "}
            Favorite
          </button>
          <button
            type="button"
            onClick={onCopy}
            className="px-3 py-2 text-sm font-semibold text-teal-700 border border-teal-300 rounded-lg hover:bg-teal-50"
          >
            Make a copy
          </button>
        </div>
      </div>

      {loading || !data ? (
        <p className="text-sm text-gray-400 py-10 text-center">Loading analytics…</p>
      ) : (
        <>
          {(data.has_email || data.has_sms) && (
            <div className="bg-white rounded-xl border border-border p-4 space-y-4">
              {data.has_email && (
                <div className="flex flex-wrap gap-4 items-start">
                  <div className="w-36 h-28 rounded-lg border border-gray-100 bg-gradient-to-br from-slate-50 to-teal-50 flex items-center justify-center overflow-hidden">
                    {(campaign.email_images || [])[0]?.data_url ? (
                      <img
                        src={campaign.email_images[0].data_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-teal-700 px-2 text-center">
                        Email campaign
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-gray-900">
                      Email{" "}
                      {data.sent_at && (
                        <span className="font-normal text-teal-700 ml-1">
                          {formatWhen(data.sent_at)}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="text-gray-500">Subject:</span>{" "}
                      <span className="font-medium">{data.email_subject || "—"}</span>
                    </p>
                    <p className="text-sm text-gray-500">
                      Preview: {data.email_preview_text || "—"}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setViewEmail(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <Eye size={14} /> View email
                      </button>
                      <button
                        type="button"
                        onClick={() => void downloadCsv()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <Download size={14} /> CSV
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {data.has_sms && !data.has_email && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void downloadCsv()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
                  >
                    <Download size={14} /> CSV
                  </button>
                </div>
              )}

              {(data.appointments_booked || 0) > 0 && data.has_email && (
                <div className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm text-sky-950">
                  <span className="inline-flex items-center gap-2">
                    <Calendar size={16} className="text-sky-600 flex-shrink-0" />
                    <span>
                      <strong>{data.appointments_booked}</strong> Appointments booked from this email
                      campaign.
                    </span>
                  </span>
                  <button
                    type="button"
                    className="text-sky-700 font-medium hover:underline"
                    onClick={() =>
                      toastSuccess(
                        "Appointments attributed to patients who engaged with this campaign"
                      )
                    }
                  >
                    Learn more
                  </button>
                </div>
              )}

              {emailStats && (
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 flex flex-wrap overflow-hidden">
                  <MetricCard label="Sent" value={emailStats.sent} />
                  <MetricCard
                    label="Opens"
                    value={emailStats.opens}
                    rate={emailStats.open_rate}
                  />
                  <MetricCard
                    label="Clicks"
                    value={emailStats.clicks}
                    rate={emailStats.click_rate}
                  />
                  <MetricCard
                    label="Unsubscribes"
                    value={emailStats.unsubscribes}
                    rate={emailStats.unsubscribe_rate}
                  />
                  <MetricCard
                    label="Undelivered"
                    value={emailStats.undelivered}
                    rate={emailStats.undelivered_rate}
                  />
                </div>
              )}

              {smsStats && (
                <div className="space-y-2">
                  {data.has_email && (
                    <p className="text-sm font-semibold text-gray-800">SMS metrics</p>
                  )}
                  <div className="rounded-xl border border-gray-100 bg-gray-50/50 flex flex-wrap overflow-hidden">
                    <MetricCard label="Sent" value={smsStats.sent} />
                    <MetricCard
                      label="Responses"
                      value={smsStats.responses}
                      rate={smsStats.response_rate}
                    />
                    <MetricCard
                      label="Unsubscribes"
                      value={smsStats.unsubscribes}
                      rate={smsStats.unsubscribe_rate}
                    />
                    <MetricCard
                      label="Undelivered"
                      value={smsStats.undelivered}
                      rate={smsStats.undelivered_rate}
                    />
                  </div>
                </div>
              )}

              {data.has_email && data.has_sms && (
                <button
                  type="button"
                  onClick={() => void downloadCsv()}
                  className="inline-flex items-center gap-1.5 text-sm text-teal-700 font-medium"
                >
                  <Download size={14} /> Download CSV with more details
                </button>
              )}
            </div>
          )}

          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-4">
            <button
              type="button"
              className="w-full flex items-center justify-between text-left"
              onClick={() => setShowGlossary((v) => !v)}
            >
              <h3 className="font-bold text-gray-900">Interpret Campaign analytics</h3>
              <span className="text-xs text-teal-700 font-medium">
                {showGlossary ? "Hide" : "Show"}
              </span>
            </button>
            {showGlossary && (
              <ul className="mt-3 space-y-2 text-sm text-gray-800 list-disc pl-5">
                <li>
                  <strong>Sent:</strong> {data.glossary.sent}
                </li>
                <li>
                  <strong>Unsubscribes:</strong> {data.glossary.unsubscribes}
                </li>
                <li>
                  <strong>Undelivered:</strong> {data.glossary.undelivered}
                </li>
                <li>
                  <strong>[Email only] Opens:</strong> {data.glossary.opens}
                </li>
                <li>
                  <strong>[Email only] Clicks:</strong> {data.glossary.clicks}
                </li>
                <li>
                  <strong>[SMS only] Responses:</strong> {data.glossary.responses}
                </li>
              </ul>
            )}
          </div>
        </>
      )}

      {viewEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setViewEmail(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-gray-900">View email</h3>
              <button type="button" onClick={() => setViewEmail(false)}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto">
              <p className="text-sm">
                <span className="text-gray-500">Subject:</span>{" "}
                <strong>{data?.email_subject || campaign.email_subject}</strong>
              </p>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans bg-gray-50 rounded-lg p-3 border border-gray-100">
                {data?.email_body || campaign.email_body}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CampaignsView() {
  const [tab, setTab] = useState<Tab>("favorites");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ApiCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ApiCampaign | null>(null);
  const [copySource, setCopySource] = useState<ApiCampaign | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    return staffApi.campaigns
      .list(tab, q.trim() || undefined)
      .then(setRows)
      .catch(() => {
        setRows([]);
        toastError("Could not load campaigns");
      });
  }, [tab, q]);

  useEffect(() => {
    setLoading(true);
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function newBlank() {
    try {
      const c = await staffApi.campaigns.create({ title: "Untitled campaign" });
      setActive(c);
      toastSuccess("Blank campaign created");
    } catch {
      toastError("Could not create campaign");
    }
  }

  if (active) {
    if (active.status === "sent") {
      return (
        <>
          <SentCampaignAnalytics
            campaign={active}
            onBack={() => {
              setActive(null);
              void refresh();
            }}
            onChange={(c) => {
              setActive(c);
              void refresh();
            }}
            onCopy={() => setCopySource(active)}
          />
          {copySource && (
            <CopyCampaignModal
              source={copySource}
              onClose={() => setCopySource(null)}
              onCreated={(c) => {
                setCopySource(null);
                setActive(c);
              }}
            />
          )}
        </>
      );
    }
    return (
      <CampaignEditor
        campaign={active}
        onChange={(c) => {
          setActive(c);
          void refresh();
        }}
        onBack={() => {
          setActive(null);
          void refresh();
        }}
      />
    );
  }

  return (
    <div className="px-4 sm:px-6 py-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">
            Quickly reach patients with personalized emails and texts. Start from Favorites or create
            a blank campaign.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void newBlank()}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-teal-500 rounded-lg hover:bg-teal-600"
        >
          <Plus size={16} /> New campaign
        </button>
      </div>

      <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-950">
        You can also start with a blank campaign by clicking <strong>New campaign</strong>. Pre-built
        templates live under <strong>Favorites</strong>. Open the <strong>Sent</strong> tab and click
        a campaign to review analytics.
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-wrap gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium ${
                  tab === t.id
                    ? "bg-teal-500 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg">
            <Search size={14} className="text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              className="text-sm outline-none bg-transparent w-36"
            />
          </div>
        </div>

        {loading ? (
          <p className="px-4 py-12 text-center text-sm text-gray-400">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-gray-400">No campaigns in this tab</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Updated on</th>
                <th className="px-4 py-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => setActive(row)}
                    >
                      <span className="inline-flex items-center gap-1.5 font-medium text-gray-900">
                        {(row.is_favorite_template || row.is_starred) && (
                          <Heart size={14} className="text-rose-500 fill-rose-500" />
                        )}
                        {row.title}
                      </span>
                      {row.created_by_name && (
                        <span className="block text-xs text-gray-400 mt-0.5">
                          by {row.created_by_name}
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="block">{formatWhen(row.updated_at)}</span>
                    {row.status === "sent" && row.sent_at && (
                      <span className="text-xs text-gray-400">Sent {formatWhen(row.sent_at)}</span>
                    )}
                    {row.status === "scheduled" && row.scheduled_at && (
                      <span className="text-xs text-gray-400">
                        Scheduled {formatWhen(row.scheduled_at)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 relative">
                    <button
                      type="button"
                      className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
                      onClick={() => setMenuId(menuId === row.id ? null : row.id)}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {menuId === row.id && (
                      <div className="absolute right-4 top-10 z-10 bg-white border border-border rounded-lg shadow-lg py-1 w-40">
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                          onClick={() => {
                            setMenuId(null);
                            setCopySource(row);
                          }}
                        >
                          Make a copy
                        </button>
                        {!row.is_favorite_template && (
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                            onClick={() => {
                              setMenuId(null);
                              void staffApi.campaigns
                                .remove(row.id)
                                .then(() => {
                                  toastSuccess("Deleted");
                                  void refresh();
                                })
                                .catch(() => toastError("Could not delete"));
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {copySource && (
        <CopyCampaignModal
          source={copySource}
          onClose={() => setCopySource(null)}
          onCreated={(c) => {
            setCopySource(null);
            setActive(c);
          }}
        />
      )}
    </div>
  );
}
