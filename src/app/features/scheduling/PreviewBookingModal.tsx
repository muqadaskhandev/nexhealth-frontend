import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calendar, CheckCircle2, X } from "lucide-react";
import { IconButton } from "../../components/shared/IconButton";
import { useAuth } from "../../auth/AuthContext";
import { usePractice } from "../../hooks/usePractice";
import {
  staffApi,
  mapAvailabilityBlock,
  mapAvailabilitySlot,
  mapBookingFormField,
  mapBookingInsurance,
  mapProvider,
} from "../../lib/staff-api";
import { PublicBookingDetailsForm } from "../../public/PublicBookingDetailsForm";
import type {
  AppointmentType,
  AvailabilityBlock,
  AvailabilitySlot,
  BookingFormField,
  BookingInsurance,
  Provider,
} from "../../types";
import type { PublicBookingFormField, PublicBookingInsurance } from "../../lib/public-booking-api";

type Step = "kind" | "bookingFor" | "type" | "time" | "details" | "done";
type PatientKind = "new" | "existing";
type BookingFor = "self" | "child" | "other";

type PreviewSlot = {
  date: string;
  label: string;
  minutes: number;
  providerId: string;
  providerName: string;
  startsAt: string;
};

type DayOpening = { date: string; times: PreviewSlot[] };

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDay(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function providerOffersType(provider: Provider, slot: AvailabilitySlot, appointmentTypeId: string): boolean {
  if (slot.useProviderDefaults) return provider.defaultAppointmentTypeIds.includes(appointmentTypeId);
  return slot.appointmentTypeIds.includes(appointmentTypeId);
}

function blockOverlaps(block: AvailabilityBlock, dateStr: string, startMin: number, endMin: number): boolean {
  const dayStart = new Date(`${dateStr}T00:00:00`).getTime();
  const dayEnd = dayStart + DAY_MS;
  const blockStart = new Date(block.startsAt).getTime();
  const blockEnd = new Date(block.endsAt).getTime();
  if (blockEnd <= dayStart || blockStart >= dayEnd) return false;
  const slotStart = dayStart + startMin * 60 * 1000;
  const slotEnd = dayStart + endMin * 60 * 1000;
  return blockStart < slotEnd && blockEnd > slotStart;
}

function computeOpenings(
  appointmentType: AppointmentType,
  providers: Provider[],
  slots: AvailabilitySlot[],
  blocks: AvailabilityBlock[],
  daysNeeded = 14,
  maxScan = 45
): DayOpening[] {
  const eligible = providers.filter(
    (p) => p.status === "active" && p.defaultAppointmentTypeIds.includes(appointmentType.id)
  );
  const results: DayOpening[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let d = 0; results.length < daysNeeded && d < maxScan; d++) {
    const date = new Date(today.getTime() + d * DAY_MS);
    const dateStr = toDateStr(date);
    const dayOfWeek = date.getDay();
    const times: PreviewSlot[] = [];
    const seen = new Set<string>();

    for (const provider of eligible) {
      const providerSlots = slots.filter((s) => {
        if (s.providerId !== provider.id) return false;
        if (!providerOffersType(provider, s, appointmentType.id)) return false;
        if (s.repeatMode === "once") return s.specificDate === dateStr;
        if (s.dayOfWeek !== dayOfWeek) return false;
        if (s.startsOn && dateStr < s.startsOn) return false;
        return true;
      });
      const providerBlocks = blocks.filter((b) => b.providerId === provider.id);

      for (const slot of providerSlots) {
        const start = timeToMinutes(slot.startTime);
        const end = timeToMinutes(slot.endTime);
        for (let t = start; t + appointmentType.durationMinutes <= end; t += appointmentType.durationMinutes) {
          if (providerBlocks.some((b) => blockOverlaps(b, dateStr, t, t + appointmentType.durationMinutes))) continue;
          const key = `${provider.id}-${t}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const starts = new Date(`${dateStr}T00:00:00`);
          starts.setMinutes(t);
          times.push({
            date: dateStr,
            label: minutesToLabel(t),
            minutes: t,
            providerId: provider.id,
            providerName: provider.name,
            startsAt: starts.toISOString(),
          });
        }
      }
    }

    if (times.length > 0) {
      times.sort((a, b) => a.minutes - b.minutes || a.providerName.localeCompare(b.providerName));
      results.push({ date: dateStr, times });
    }
  }

  return results;
}

function toPublicField(f: BookingFormField): PublicBookingFormField {
  return {
    id: f.id,
    label: f.label,
    field_type: f.fieldType,
    required: f.required,
    show_to: f.showTo,
    options: f.options,
    help_text: f.fieldType === "note" ? f.noteText : "",
  };
}

export function PreviewBookingModal({ types, onClose }: { types: AppointmentType[]; onClose: () => void }) {
  const { activeLocation } = useAuth();
  const practice = usePractice(true);

  const separateByType = activeLocation?.separate_by_patient_type ?? true;
  const askForInsurance = activeLocation?.ask_for_insurance ?? false;

  const [step, setStep] = useState<Step>(separateByType ? "kind" : "bookingFor");
  const [patientKind, setPatientKind] = useState<PatientKind>("new");
  const [bookingFor, setBookingFor] = useState<BookingFor>("self");
  const [typeId, setTypeId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<PreviewSlot | null>(null);

  const [providers, setProviders] = useState<Provider[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [fields, setFields] = useState<BookingFormField[]>([]);
  const [insurances, setInsurances] = useState<BookingInsurance[]>([]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [gender, setGender] = useState("");
  const [guarantorFirstName, setGuarantorFirstName] = useState("");
  const [guarantorLastName, setGuarantorLastName] = useState("");
  const [guarantorEmail, setGuarantorEmail] = useState("");
  const [guarantorPhone, setGuarantorPhone] = useState("");
  const [callTextConsent, setCallTextConsent] = useState(true);
  const [insuranceId, setInsuranceId] = useState("");
  const [insuranceSearch, setInsuranceSearch] = useState("");
  const [formAnswers, setFormAnswers] = useState<Record<string, unknown>>({});

  useEffect(() => {
    Promise.all([
      staffApi.providers.list(),
      staffApi.availabilitySlots.list(),
      staffApi.availabilityBlocks.list(),
      staffApi.bookingFormFields.list(),
      staffApi.bookingInsurances.list(),
      staffApi.appointmentTypes.list(),
    ]).then(([p, s, b, f, i]) => {
      setProviders(p.map(mapProvider));
      setSlots(s.map(mapAvailabilitySlot));
      setBlocks(b.map(mapAvailabilityBlock));
      setFields(f.map(mapBookingFormField));
      setInsurances(i.map(mapBookingInsurance));
    });
  }, []);

  const visibleTypes = useMemo(() => {
    return types.filter((t) => {
      if (!t.availableOnline) return false;
      if (!separateByType) return true;
      return patientKind === "new"
        ? t.patientType === "new" || t.patientType === "all"
        : t.patientType === "existing" || t.patientType === "all";
    });
  }, [types, patientKind, separateByType]);

  const selectedType = visibleTypes.find((t) => t.id === typeId) ?? null;

  const openings = useMemo(() => {
    if (!selectedType) return [];
    return computeOpenings(selectedType, providers, slots, blocks);
  }, [selectedType, providers, slots, blocks]);

  const availableProviders = useMemo(() => {
    if (!selectedType) return [];
    return providers.filter(
      (p) => p.status === "active" && p.defaultAppointmentTypeIds.includes(selectedType.id)
    );
  }, [providers, selectedType]);

  const visibleFields = fields.filter((f) => f.showTo === "all" || f.showTo === patientKind);
  const publicFormFields: PublicBookingFormField[] = visibleFields.map(toPublicField);
  const publicInsurances: PublicBookingInsurance[] = insurances.map((i) => ({
    id: i.id,
    name: i.name,
  }));

  function goBack() {
    if (step === "details") setStep("time");
    else if (step === "time") setStep("type");
    else if (step === "type") setStep("bookingFor");
    else if (step === "bookingFor") {
      if (separateByType) setStep("kind");
    } else if (step === "done") setStep("details");
  }

  function pickKind(kind: PatientKind) {
    setPatientKind(kind);
    setTypeId("");
    setSelectedSlot(null);
    setStep("bookingFor");
  }

  function pickBookingFor(value: BookingFor) {
    setBookingFor(value);
    setTypeId("");
    setSelectedSlot(null);
    setStep("type");
  }

  function pickType(id: string) {
    setTypeId(id);
    setSelectedSlot(null);
    setStep("time");
  }

  function pickSlot(slot: PreviewSlot) {
    setSelectedSlot(slot);
    setStep("details");
  }

  function finishPreview() {
    setStep("done");
  }

  function restart() {
    setStep(separateByType ? "kind" : "bookingFor");
    setTypeId("");
    setSelectedSlot(null);
    setFormAnswers({});
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setDob("");
    setZipCode("");
    setGender("");
    setInsuranceId("");
  }

  const canGoBack =
    step === "details" ||
    step === "time" ||
    step === "type" ||
    (step === "bookingFor" && separateByType) ||
    step === "done";

  const practiceName = practice?.name || "Your practice";
  const locationName = activeLocation?.name || "Location";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-6" onClick={onClose}>
      <div
        className="bg-[#f8faf9] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Staff chrome */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900">Preview online booking</p>
            <p className="text-xs text-gray-500 truncate">
              Click through every step — same layout patients see
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-800">
              Preview only — no booking is created
            </span>
            <IconButton
              label="Close"
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
            >
              <X size={16} />
            </IconButton>
          </div>
        </div>

        {/* Patient-facing header (matches public page) */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-5 py-3.5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {practiceName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">{practiceName}</h1>
              <p className="text-xs text-gray-500 truncate">{locationName}</p>
            </div>
          </div>
        </header>

        <div className="overflow-y-auto flex-1 px-4 sm:px-5 py-5 space-y-4">
          {canGoBack && (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700"
            >
              <ArrowLeft size={15} /> Back
            </button>
          )}

          {step === "kind" && (
            <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h2 className="text-base font-bold text-gray-900">Are you a new or returning patient?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(["new", "existing"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => pickKind(k)}
                    className="px-4 py-4 rounded-xl border border-gray-200 hover:border-teal-400 hover:bg-teal-50 text-left transition-colors"
                  >
                    <p className="text-sm font-semibold text-gray-900">
                      {k === "new" ? "New patient" : "Returning patient"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {k === "new" ? "First time visiting this practice" : "I've been seen here before"}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === "bookingFor" && (
            <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <h2 className="text-base font-bold text-gray-900">Who are you booking for?</h2>
              <div className="grid grid-cols-1 gap-3">
                {(
                  [
                    { id: "self" as const, title: "Myself", desc: "I am the patient" },
                    {
                      id: "child" as const,
                      title: "My child or dependent",
                      desc: "I am booking for someone I am responsible for",
                    },
                    {
                      id: "other" as const,
                      title: "Someone else",
                      desc: "I am booking on behalf of another person",
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => pickBookingFor(opt.id)}
                    className="px-4 py-4 rounded-xl border border-gray-200 hover:border-teal-400 hover:bg-teal-50 text-left transition-colors"
                  >
                    <p className="text-sm font-semibold text-gray-900">{opt.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === "type" && (
            <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-base font-bold text-gray-900">Select an appointment type</h2>
              </div>
              {visibleTypes.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-gray-400">
                  No appointment types are available online right now.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {visibleTypes.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => pickType(t.id)}
                      className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50 text-left transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-900">{t.name}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0">{t.durationMinutes} min</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {step === "time" && selectedType && (
            <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-base font-bold text-gray-900">{selectedType.name}</h2>
                <p className="text-sm text-gray-500 mt-1">Choose a time that works for you.</p>
                {availableProviders.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    Available with {availableProviders.map((p) => p.name).join(", ")}
                  </p>
                )}
              </div>
              {openings.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-gray-400">
                  No openings in the next two weeks.
                </p>
              ) : (
                <div className="p-5 space-y-5">
                  {openings.map((day) => (
                    <div key={day.date}>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar size={14} className="text-teal-600" />
                        <p className="text-sm font-semibold text-gray-800">{formatDay(day.date)}</p>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {day.times.map((slot) => (
                          <button
                            key={`${day.date}-${slot.providerId}-${slot.minutes}`}
                            type="button"
                            onClick={() => pickSlot(slot)}
                            className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-800 hover:border-teal-400 hover:bg-teal-50 transition-colors"
                          >
                            {slot.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {step === "details" && selectedSlot && selectedType && (
            <PublicBookingDetailsForm
              patientKind={patientKind}
              bookingFor={bookingFor}
              values={{
                firstName,
                lastName,
                email,
                phone,
                dob,
                zipCode,
                gender,
                guarantorFirstName,
                guarantorLastName,
                guarantorEmail,
                guarantorPhone,
                callTextConsent,
                insuranceId,
                insuranceSearch,
                formAnswers,
              }}
              onChange={(patch) => {
                if (patch.firstName !== undefined) setFirstName(patch.firstName);
                if (patch.lastName !== undefined) setLastName(patch.lastName);
                if (patch.email !== undefined) setEmail(patch.email);
                if (patch.phone !== undefined) setPhone(patch.phone);
                if (patch.dob !== undefined) setDob(patch.dob);
                if (patch.zipCode !== undefined) setZipCode(patch.zipCode);
                if (patch.gender !== undefined) setGender(patch.gender);
                if (patch.guarantorFirstName !== undefined) setGuarantorFirstName(patch.guarantorFirstName);
                if (patch.guarantorLastName !== undefined) setGuarantorLastName(patch.guarantorLastName);
                if (patch.guarantorEmail !== undefined) setGuarantorEmail(patch.guarantorEmail);
                if (patch.guarantorPhone !== undefined) setGuarantorPhone(patch.guarantorPhone);
                if (patch.callTextConsent !== undefined) setCallTextConsent(patch.callTextConsent);
                if (patch.insuranceId !== undefined) setInsuranceId(patch.insuranceId);
                if (patch.insuranceSearch !== undefined) setInsuranceSearch(patch.insuranceSearch);
                if (patch.formAnswers !== undefined) setFormAnswers(patch.formAnswers);
              }}
              formFields={publicFormFields}
              askForInsurance={askForInsurance}
              insurances={publicInsurances}
              onSubmit={finishPreview}
              appointmentSummary={
                <div className="rounded-xl bg-teal-50 border border-teal-100 px-4 py-3.5 text-sm text-teal-900 shadow-sm">
                  <p className="font-semibold">{selectedType.name}</p>
                  <p className="text-teal-800 mt-0.5">
                    {formatDay(selectedSlot.date)} at {selectedSlot.label} with {selectedSlot.providerName}
                  </p>
                </div>
              }
              footerNote={
                <p className="text-center text-[11px] text-amber-700">
                  Preview mode — clicking Book does not create a real appointment.
                </p>
              }
            />
          )}

          {step === "done" && (
            <section className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
              <CheckCircle2 size={40} className="mx-auto text-teal-500" />
              <h2 className="text-lg font-bold text-gray-900">You&apos;re all set!</h2>
              <p className="text-sm text-gray-600">
                This is the confirmation screen patients see after booking.
              </p>
              <p className="text-xs text-gray-400">A confirmation would be sent to {email || "their email"}.</p>
              <button
                type="button"
                onClick={restart}
                className="mt-2 px-5 py-2.5 border border-gray-200 text-gray-800 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Restart preview
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
