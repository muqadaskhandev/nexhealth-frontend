import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import {
  publicBookingApi,
  type PublicApiError,
  type PublicApiErrorDetail,
  type PublicBookingFormField,
  type PublicBookingInfo,
  type PublicBookingInsurance,
  type PublicBookingOpening,
  type PublicBookingTimeSlot,
  type PublicBookingType,
} from "../lib/public-booking-api";
import { validateFormField, isBookingDateField } from "./PublicBookingFormFieldInput";
import { DatePicker } from "../components/shared/DatePicker";
import { dobInputBounds, dobIsoError } from "../lib/fieldFormat";
import {
  bookingEmailError,
  bookingPhoneError,
  bookingZipError,
  personNameError,
} from "../lib/bookingFieldGuards";
import { BrandedShell } from "./sharedPublicUi";
import { AgentSpokenText, ChatRobot, ChatRobotTyping } from "./ChatRobot";
import type { PublicBranding } from "../types";

type PatientKind = "new" | "existing";
type BookingFor = "self" | "child" | "other";
type Phase =
  | "loading"
  | "invalid"
  | "location"
  | "kind"
  | "bookingFor"
  | "type"
  | "day"
  | "time"
  | "details"
  | "confirm"
  | "notFound"
  | "done";

type ChatMsg = { role: "agent" | "patient"; content: string };
type DetailKey =
  | "firstName"
  | "lastName"
  | "dob"
  | "contact"
  | "email"
  | "phone"
  | "zip"
  | "gender"
  | "gFirst"
  | "gLast"
  | "gContact"
  | "insurance"
  | "consent"
  | `form:${string}`;

const CHIP =
  "px-3.5 py-1.5 rounded-full text-sm font-medium border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 disabled:opacity-50 transition-colors";

function apiErrorMessage(err: unknown, fallback: string): string {
  const apiErr = err as PublicApiError;
  if (typeof apiErr?.detail === "string") return apiErr.detail;
  const detail = apiErr?.detail as PublicApiErrorDetail | undefined;
  return detail?.message || fallback;
}

function isPatientNotFound(err: unknown): boolean {
  const apiErr = err as PublicApiError;
  return typeof apiErr?.detail === "object" && apiErr.detail?.code === "patient_not_found";
}

function formatAddress(loc: { address: string; city: string; state: string; zip_code: string }) {
  const line2 = [loc.city, loc.state, loc.zip_code].filter(Boolean).join(", ");
  return [loc.address, line2].filter(Boolean).join(" · ");
}

function formatDay(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function classicBookingHref(slug: string): string {
  const u = new URL(window.location.href);
  u.pathname = `/appt/${slug}`;
  u.searchParams.delete("mode");
  return `${u.pathname}${u.search}`;
}

function formatIsoDisplay(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return iso;
  return `${m[2]}/${m[3]}/${m[1]}`;
}

function parseContact(text: string): { email: string; phone: string } {
  const t = text.trim();
  if (looksLikeEmail(t)) return { email: t, phone: "" };
  return { email: "", phone: t };
}

function buildDetailQueue(
  patientKind: PatientKind,
  bookingFor: BookingFor,
  askForInsurance: boolean,
  insurances: PublicBookingInsurance[],
  formFields: PublicBookingFormField[]
): DetailKey[] {
  const keys: DetailKey[] = ["firstName", "lastName"];
  if (patientKind === "existing") {
    keys.push("dob", "contact");
  } else {
    keys.push("email", "phone", "dob", "zip", "gender");
  }
  if (bookingFor !== "self") keys.push("gFirst", "gLast", "gContact");
  if (askForInsurance && insurances.length > 0) keys.push("insurance");
  for (const f of formFields) {
    if (f.field_type === "note") continue;
    keys.push(`form:${f.id}`);
  }
  keys.push("consent");
  return keys;
}

function questionFor(key: DetailKey, formFields: PublicBookingFormField[]): string {
  if (key.startsWith("form:")) {
    const id = key.slice(5);
    const f = formFields.find((x) => x.id === id);
    return f?.label ? `${f.label}${f.required ? "" : " (optional)"}` : "One more question:";
  }
  switch (key) {
    case "firstName":
      return "What's the patient's first name?";
    case "lastName":
      return "And the last name?";
    case "dob":
      return "What's the date of birth?";
    case "contact":
      return "What's the email or phone number we have on file?";
    case "email":
      return "What's the best email address?";
    case "phone":
      return "What's a good phone number?";
    case "zip":
      return "What's the zip code?";
    case "gender":
      return "What's the legal sex on file?";
    case "gFirst":
      return "What's the guarantor's first name?";
    case "gLast":
      return "And the guarantor's last name?";
    case "gContact":
      return "What's the guarantor's email or phone number?";
    case "insurance":
      return "Which insurance should we use?";
    case "consent":
      return "Is it okay if the office calls or texts you about this visit?";
    default:
      return "Please continue.";
  }
}

export function PublicBookingAgentPage({ slug }: { slug: string }) {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const lid = params.get("lid") ?? undefined;
  const locationIds = params.get("location_ids") ?? undefined;
  const providerIds = params.get("provider_ids") ?? undefined;
  const appointmentTypeIds = params.get("appointment_type_ids") ?? undefined;
  const utmSource = params.get("utm_source") ?? undefined;
  const utmMedium = params.get("utm_medium") ?? undefined;
  const utmCampaign = params.get("utm_campaign") ?? undefined;

  const [phase, setPhase] = useState<Phase>("loading");
  const [info, setInfo] = useState<PublicBookingInfo | null>(null);
  const [invalidReason, setInvalidReason] = useState("Online booking is not available.");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [locationId, setLocationId] = useState("");
  const [patientKind, setPatientKind] = useState<PatientKind>("new");
  const [bookingFor, setBookingFor] = useState<BookingFor>("self");
  const [types, setTypes] = useState<PublicBookingType[]>([]);
  const [typeId, setTypeId] = useState("");
  const [openings, setOpenings] = useState<PublicBookingOpening[]>([]);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<PublicBookingTimeSlot | null>(null);
  const [formFields, setFormFields] = useState<PublicBookingFormField[]>([]);
  const [insurances, setInsurances] = useState<PublicBookingInsurance[]>([]);
  const [multiSelect, setMultiSelect] = useState<string[]>([]);

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
  const [formAnswers, setFormAnswers] = useState<Record<string, unknown>>({});
  const [detailQueue, setDetailQueue] = useState<DetailKey[]>([]);
  const [detailIndex, setDetailIndex] = useState(0);
  const [confirmation, setConfirmation] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const threadRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const location = info?.locations.find((l) => l.id === locationId) ?? null;
  const selectedType = types.find((t) => t.id === typeId) ?? null;
  const dayOpening = openings.find((o) => o.date === selectedDay) ?? null;
  const currentDetail = phase === "details" ? detailQueue[detailIndex] : undefined;
  const currentFormField =
    currentDetail?.startsWith("form:") ? formFields.find((f) => f.id === currentDetail.slice(5)) ?? null : null;

  const branding: PublicBranding | null = info
    ? {
        practiceName: info.practice_name,
        practiceLogoUrl: info.practice_logo_url,
        locationName: location?.name ?? "",
        locationAddress: location ? formatAddress(location) : "",
        locationPhone: location?.phone ?? "",
      }
    : null;

  function push(role: "agent" | "patient", content: string) {
    setMessages((prev) => [...prev, { role, content }]);
  }

  function ask(text: string, next: Phase) {
    push("agent", text);
    setPhase(next);
    setBusy(false);
    setError(null);
    setInput("");
  }

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, phase]);

  useEffect(() => {
    publicBookingApi
      .info(slug, lid, locationIds)
      .then((data) => {
        setInfo(data);
        if (startedRef.current) return;
        startedRef.current = true;
        const greeting = `Hi! I'm Angelina. I can schedule a visit at ${data.practice_name}.`;
        if (data.locations.length === 1) {
          const loc = data.locations[0];
          setLocationId(loc.id);
          push("agent", greeting);
          if (loc.separate_by_patient_type) {
            ask("Are you a new patient, or have you been here before?", "kind");
          } else {
            ask("Who is this appointment for?", "bookingFor");
          }
        } else {
          ask(`${greeting} Which location works best?`, "location");
        }
      })
      .catch((err: unknown) => {
        const apiErr = err as PublicApiError;
        setInvalidReason(typeof apiErr?.detail === "string" ? apiErr.detail : "Online booking is not available.");
        setPhase("invalid");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, lid, locationIds]);

  useEffect(() => {
    if (!locationId || !info) return;
    publicBookingApi.formFields(slug, locationId, patientKind, lid).then(setFormFields).catch(() => setFormFields([]));
    const loc = info.locations.find((l) => l.id === locationId);
    if (loc?.ask_for_insurance) {
      publicBookingApi.insurances(slug, locationId, lid).then(setInsurances).catch(() => setInsurances([]));
    } else {
      setInsurances([]);
      setInsuranceId("");
    }
  }, [slug, locationId, patientKind, lid, info]);

  async function loadTypesThenAsk(kind: PatientKind) {
    setBusy(true);
    try {
      const rows = await publicBookingApi.types(slug, locationId, kind, lid, appointmentTypeIds);
      setTypes(rows);
      if (rows.length === 0) {
        ask("I don't see any appointment types available right now. You can try the classic booking page instead.", "invalid");
        return;
      }
      ask("What kind of visit do you need?", "type");
    } catch {
      ask("I couldn't load appointment types. Please try the classic booking page.", "invalid");
    }
  }

  async function loadOpeningsThenAsk(nextTypeId: string) {
    setBusy(true);
    try {
      const rows = await publicBookingApi.openings(slug, locationId, nextTypeId, {
        lid,
        providerIds,
        days: 14,
      });
      setOpenings(rows);
      if (rows.length === 0 || rows.every((d) => d.times.length === 0)) {
        ask("I don't see any open times in the next two weeks. Try another visit type, or use the classic booking page.", "type");
        return;
      }
      ask("Which day works for you?", "day");
    } catch {
      ask("I couldn't load available times. Please try again or use the classic booking page.", "type");
    }
  }

  function startDetails(kind: PatientKind, forWhom: BookingFor, fields: PublicBookingFormField[], ins: PublicBookingInsurance[]) {
    const queue = buildDetailQueue(kind, forWhom, Boolean(location?.ask_for_insurance && ins.length > 0), ins, fields);
    setFormFields(fields);
    setInsurances(ins);
    setDetailQueue(queue);
    setDetailIndex(0);
    ask(questionFor(queue[0], fields), "details");
  }

  function advanceDetails(fromIndex: number, nextKind = patientKind, nextFor = bookingFor) {
    const queue = buildDetailQueue(
      nextKind,
      nextFor,
      Boolean(location?.ask_for_insurance && insurances.length > 0),
      insurances,
      formFields
    );
    setDetailQueue(queue);
    const next = fromIndex + 1;
    if (next >= queue.length) {
      ask("Here's what I'll book. Does this look right?", "confirm");
      return;
    }
    setDetailIndex(next);
    ask(questionFor(queue[next], formFields), "details");
  }

  function pickLocation(id: string, name: string) {
    if (busy) return;
    push("patient", name);
    setLocationId(id);
    const loc = info?.locations.find((l) => l.id === id);
    if (loc?.separate_by_patient_type) ask("Are you a new patient, or have you been here before?", "kind");
    else ask("Who is this appointment for?", "bookingFor");
  }

  function pickKind(kind: PatientKind, label: string) {
    if (busy) return;
    push("patient", label);
    setPatientKind(kind);
    ask("Who is this appointment for?", "bookingFor");
  }

  function pickBookingFor(value: BookingFor, label: string) {
    if (busy) return;
    push("patient", label);
    setBookingFor(value);
    void loadTypesThenAsk(patientKind);
  }

  function pickType(row: PublicBookingType) {
    if (busy) return;
    push("patient", row.name);
    setTypeId(row.id);
    setSelectedSlot(null);
    setSelectedDay("");
    void loadOpeningsThenAsk(row.id);
  }

  function pickDay(date: string) {
    if (busy) return;
    push("patient", formatDay(date));
    setSelectedDay(date);
    ask("What time works best?", "time");
  }

  async function pickSlot(slot: PublicBookingTimeSlot) {
    if (busy) return;
    const label = slot.provider_name ? `${slot.label} with ${slot.provider_name}` : slot.label;
    push("patient", label);
    setSelectedSlot(slot);
    setBusy(true);
    try {
      const [fields, ins] = await Promise.all([
        publicBookingApi.formFields(slug, locationId, patientKind, lid),
        location?.ask_for_insurance
          ? publicBookingApi.insurances(slug, locationId, lid)
          : Promise.resolve([] as PublicBookingInsurance[]),
      ]);
      startDetails(patientKind, bookingFor, fields, ins);
    } catch {
      startDetails(patientKind, bookingFor, formFields, insurances);
    }
  }

  function applyDetail(key: DetailKey, raw: string): string | null {
    const value = raw.trim();
    if (key === "firstName") {
      const err = personNameError(value, "first name");
      if (err) return err;
      setFirstName(value);
      return null;
    }
    if (key === "lastName") {
      const err = personNameError(value, "last name");
      if (err) return err;
      setLastName(value);
      return null;
    }
    if (key === "dob") {
      const err = dobIsoError(value);
      if (err) return err;
      setDob(value);
      return null;
    }
    if (key === "contact") {
      const parsed = parseContact(value);
      if (!parsed.email && !parsed.phone) return "Enter the email or phone we have on file.";
      if (parsed.email) {
        const err = bookingEmailError(parsed.email, false);
        if (err) return err;
      }
      if (parsed.phone) {
        const err = bookingPhoneError(parsed.phone, false);
        if (err) return err;
      }
      setEmail(parsed.email);
      setPhone(parsed.phone);
      return null;
    }
    if (key === "email") {
      const err = bookingEmailError(value, true);
      if (err) return err;
      setEmail(value);
      return null;
    }
    if (key === "phone") {
      const err = bookingPhoneError(value, true);
      if (err) return err;
      setPhone(value);
      return null;
    }
    if (key === "zip") {
      const err = bookingZipError(value, true);
      if (err) return err;
      setZipCode(value);
      return null;
    }
    if (key === "gender") {
      if (value !== "Male" && value !== "Female") return "Please choose Male or Female.";
      setGender(value);
      return null;
    }
    if (key === "gFirst") {
      const err = personNameError(value, "guarantor first name");
      if (err) return err;
      setGuarantorFirstName(value);
      return null;
    }
    if (key === "gLast") {
      const err = personNameError(value, "guarantor last name");
      if (err) return err;
      setGuarantorLastName(value);
      return null;
    }
    if (key === "gContact") {
      const parsed = parseContact(value);
      if (!parsed.email && !parsed.phone) return "Enter the guarantor's email or phone.";
      if (parsed.email) {
        const err = bookingEmailError(parsed.email, false);
        if (err) return err;
      }
      if (parsed.phone) {
        const err = bookingPhoneError(parsed.phone, false);
        if (err) return err;
      }
      setGuarantorEmail(parsed.email);
      setGuarantorPhone(parsed.phone);
      return null;
    }
    if (key === "insurance") {
      const match = insurances.find((i) => i.id === value || i.name.toLowerCase() === value.toLowerCase());
      if (!match) return "Please choose an insurance from the list.";
      setInsuranceId(match.id);
      return null;
    }
    if (key === "consent") {
      const yes = /^(yes|y|ok|okay|sure|true)$/i.test(value);
      const no = /^(no|n|false)$/i.test(value);
      if (!yes && !no) return "Please choose Yes or No.";
      setCallTextConsent(yes);
      return null;
    }
    if (key.startsWith("form:")) {
      const field = formFields.find((f) => f.id === key.slice(5));
      if (!field) return null;
      let nextVal: unknown = value;
      if (field.field_type === "multi_select") nextVal = multiSelect;
      if (field.field_type === "payment") {
        nextVal = { authorized: true, cardholder_name: "Pay at office", last_four: "0000", expiry: "12/99" };
      }
      const fieldError = validateFormField(field, nextVal);
      if (fieldError) return fieldError;
      setFormAnswers((prev) => ({ ...prev, [field.id]: nextVal }));
      setMultiSelect([]);
      return null;
    }
    return null;
  }

  function submitDetail(raw: string, display?: string) {
    if (busy || !currentDetail) return;
    const shown = (display ?? raw).trim();
    if (!shown && currentFormField && !currentFormField.required && currentFormField.field_type !== "multi_select") {
      push("patient", "Skip");
      advanceDetails(detailIndex);
      return;
    }
    const err = applyDetail(currentDetail, raw);
    if (err) {
      setError(err);
      return;
    }
    push("patient", shown);
    setError(null);
    setInput("");
    advanceDetails(detailIndex);
  }

  function skipOptional() {
    if (!currentFormField || currentFormField.required) return;
    push("patient", "Skip");
    setInput("");
    advanceDetails(detailIndex);
  }

  async function confirmBook() {
    if (submitting || !selectedSlot || !selectedType || !locationId) return;
    setSubmitting(true);
    setBusy(true);
    setError(null);
    try {
      const result = await publicBookingApi.book(
        slug,
        {
          location_id: locationId,
          appointment_type_id: selectedType.id,
          provider_id: selectedSlot.provider_id,
          starts_at: selectedSlot.starts_at,
          patient_kind: patientKind,
          booking_for: bookingFor,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          dob: dob || undefined,
          zip_code: zipCode.trim(),
          gender,
          guarantor_first_name: bookingFor !== "self" ? guarantorFirstName.trim() : undefined,
          guarantor_last_name: bookingFor !== "self" ? guarantorLastName.trim() : undefined,
          guarantor_email: bookingFor !== "self" ? guarantorEmail.trim() : undefined,
          guarantor_phone: bookingFor !== "self" ? guarantorPhone.trim() : undefined,
          call_text_consent: callTextConsent,
          insurance_id: insuranceId || undefined,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          form_answers: formAnswers,
          booking_channel: "agent",
        },
        lid
      );
      setConfirmation(result.confirmation);
      setConfirmationEmail(result.email || email.trim());
      setShowConfirmModal(true);
      ask("You're all set. Your appointment is booked. The office will confirm it next.", "done");
    } catch (err: unknown) {
      if (isPatientNotFound(err)) {
        ask(
          "I couldn't match that to a patient on file. You can update the details, or book as a new patient.",
          "notFound"
        );
      } else {
        const msg = apiErrorMessage(err, "Could not complete your booking — please try again.");
        if (/no longer available/i.test(msg) && typeId) {
          setSelectedSlot(null);
          setSelectedDay("");
          setError(null);
          setSubmitting(false);
          push("agent", "That time was just taken. Let's pick another day from the openings here in chat.");
          void loadOpeningsThenAsk(typeId);
          return;
        }
        setError(msg);
        setPhase("confirm");
        setBusy(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function bookAsNewPatient() {
    push("patient", "Book as a new patient");
    setPatientKind("new");
    setBusy(true);
    try {
      const fields = await publicBookingApi.formFields(slug, locationId, "new", lid);
      startDetails("new", bookingFor, fields, insurances);
    } catch {
      startDetails("new", bookingFor, formFields, insurances);
    }
  }

  function retryDetails() {
    push("patient", "Update my information");
    startDetails(patientKind, bookingFor, formFields, insurances);
  }

  const hideTextInput =
    phase === "location" ||
    phase === "kind" ||
    phase === "bookingFor" ||
    phase === "type" ||
    phase === "day" ||
    phase === "time" ||
    phase === "confirm" ||
    phase === "notFound" ||
    phase === "done" ||
    phase === "invalid" ||
    currentDetail === "gender" ||
    currentDetail === "insurance" ||
    currentDetail === "consent" ||
    currentDetail === "dob" ||
    Boolean(currentFormField && isBookingDateField(currentFormField)) ||
    currentFormField?.field_type === "single_select" ||
    currentFormField?.field_type === "multi_select" ||
    currentFormField?.field_type === "payment";

  if (phase === "loading" && messages.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading online booking…</p>
      </div>
    );
  }

  if (phase === "invalid" && messages.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-gray-700">{invalidReason}</p>
        </div>
      </div>
    );
  }

  const lastAgentIndex = messages.reduce((acc, t, i) => (t.role === "agent" ? i : acc), -1);

  return (
    <BrandedShell branding={branding}>
      <div className="flex flex-col h-[min(100dvh,800px)] max-w-lg mx-auto">
        <div className="px-4 py-3 border-b border-gray-100 bg-white/80">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <ChatRobot mood={busy || submitting ? "thinking" : "asking"} size={44} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">Angelina</p>
                <p className="text-xs text-gray-500 truncate">
                  {phase === "done" ? "Appointment booked" : "Scheduling your visit"}
                </p>
              </div>
            </div>
            <a href={classicBookingHref(slug)} className="text-[11px] font-medium text-teal-700 hover:underline shrink-0">
              Classic booking
            </a>
          </div>
        </div>

        <div ref={threadRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((t, i) => (
            <div key={`${i}-${t.role}`} className={`flex items-end gap-2 ${t.role === "patient" ? "justify-end" : "justify-start"}`}>
              {t.role === "agent" && <ChatRobot mood="idle" size={36} />}
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  t.role === "patient"
                    ? "bg-teal-500 text-white rounded-br-md"
                    : "bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm"
                }`}
              >
                {t.role === "agent" && i === lastAgentIndex && phase !== "done" ? (
                  <AgentSpokenText text={t.content} animate />
                ) : (
                  t.content
                )}
              </div>
            </div>
          ))}
          {(busy || submitting) && <ChatRobotTyping />}
        </div>

        {error && <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

        {phase === "done" && (
          <div className="p-4 border-t border-gray-100 bg-white text-center space-y-1">
            <p className="text-sm font-semibold text-gray-900">This chat is closed.</p>
            <p className="text-xs text-gray-500">Your appointment is booked. The office will confirm it.</p>
          </div>
        )}

        {phase !== "done" && (
          <div className="p-4 border-t border-gray-100 bg-white">
            {phase === "location" && info && (
              <div className="flex flex-wrap gap-2">
                {info.locations.map((loc) => (
                  <button key={loc.id} type="button" disabled={busy} className={CHIP} onClick={() => pickLocation(loc.id, loc.name)}>
                    {loc.name}
                  </button>
                ))}
              </div>
            )}

            {phase === "kind" && (
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} className={CHIP} onClick={() => pickKind("new", "New patient")}>
                  New patient
                </button>
                <button type="button" disabled={busy} className={CHIP} onClick={() => pickKind("existing", "I've been here before")}>
                  Existing patient
                </button>
              </div>
            )}

            {phase === "bookingFor" && (
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} className={CHIP} onClick={() => pickBookingFor("self", "Myself")}>
                  Myself
                </button>
                <button type="button" disabled={busy} className={CHIP} onClick={() => pickBookingFor("child", "My child")}>
                  My child
                </button>
                <button type="button" disabled={busy} className={CHIP} onClick={() => pickBookingFor("other", "Someone else")}>
                  Someone else
                </button>
              </div>
            )}

            {phase === "type" && (
              <div className="flex flex-wrap gap-2">
                {types.map((row) => (
                  <button key={row.id} type="button" disabled={busy} className={CHIP} onClick={() => pickType(row)}>
                    {row.name}
                  </button>
                ))}
              </div>
            )}

            {phase === "day" && (
              <div className="flex flex-wrap gap-2">
                {openings
                  .filter((o) => o.times.length > 0)
                  .map((o) => (
                    <button key={o.date} type="button" disabled={busy} className={CHIP} onClick={() => pickDay(o.date)}>
                      {formatDay(o.date)}
                    </button>
                  ))}
              </div>
            )}

            {phase === "time" && dayOpening && (
              <div className="flex flex-wrap gap-2">
                {dayOpening.times.map((slot) => (
                  <button
                    key={`${slot.starts_at}-${slot.provider_id}`}
                    type="button"
                    disabled={busy}
                    className={CHIP}
                    onClick={() => pickSlot(slot)}
                  >
                    {slot.provider_name ? `${slot.label} · ${slot.provider_name}` : slot.label}
                  </button>
                ))}
              </div>
            )}

            {phase === "details" && currentDetail === "dob" && (
              <div className="space-y-2">
                <DatePicker
                  value={dob}
                  min={dobInputBounds().min}
                  max={dobInputBounds().max}
                  onChange={(iso) => setDob(iso)}
                  aria-label="Date of birth"
                />
                <button
                  type="button"
                  disabled={busy || !dob}
                  className="w-full py-2.5 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600 disabled:opacity-60"
                  onClick={() => submitDetail(dob, dob)}
                >
                  Continue
                </button>
              </div>
            )}

            {phase === "details" && currentDetail === "gender" && (
              <div className="flex flex-wrap gap-2">
                {["Male", "Female"].map((opt) => (
                  <button key={opt} type="button" disabled={busy} className={CHIP} onClick={() => submitDetail(opt)}>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {phase === "details" && currentDetail === "insurance" && (
              <div className="flex flex-wrap gap-2">
                {insurances.map((ins) => (
                  <button key={ins.id} type="button" disabled={busy} className={CHIP} onClick={() => submitDetail(ins.id, ins.name)}>
                    {ins.name}
                  </button>
                ))}
              </div>
            )}

            {phase === "details" && currentDetail === "consent" && (
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} className={CHIP} onClick={() => submitDetail("yes", "Yes")}>
                  Yes
                </button>
                <button type="button" disabled={busy} className={CHIP} onClick={() => submitDetail("no", "No")}>
                  No
                </button>
              </div>
            )}

            {phase === "details" && currentFormField && isBookingDateField(currentFormField) && (
              <div className="space-y-2">
                <DatePicker
                  value={input}
                  onChange={setInput}
                  aria-label={currentFormField.label}
                />
                <button
                  type="button"
                  disabled={busy || (currentFormField.required && !input)}
                  className="w-full py-2.5 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600 disabled:opacity-60"
                  onClick={() => submitDetail(input, formatIsoDisplay(input) || "Skip")}
                >
                  Continue
                </button>
              </div>
            )}

            {phase === "details" && currentFormField?.field_type === "single_select" && (
              <div className="flex flex-wrap gap-2">
                {currentFormField.options.map((opt) => (
                  <button key={opt} type="button" disabled={busy} className={CHIP} onClick={() => submitDetail(opt)}>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {phase === "details" && currentFormField?.field_type === "multi_select" && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {currentFormField.options.map((opt) => {
                    const on = multiSelect.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          setMultiSelect((prev) => (prev.includes(opt) ? prev.filter((v) => v !== opt) : [...prev, opt]))
                        }
                        className={`${CHIP} ${on ? "border-teal-500 bg-teal-500 text-white" : ""}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  disabled={busy || (currentFormField.required && multiSelect.length === 0)}
                  className="w-full py-2.5 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600 disabled:opacity-60"
                  onClick={() => submitDetail(multiSelect.join(", ") || "None")}
                >
                  Continue
                </button>
              </div>
            )}

            {phase === "details" && currentFormField?.field_type === "payment" && (
              <button
                type="button"
                disabled={busy}
                className="w-full py-2.5 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600 disabled:opacity-60"
                onClick={() => submitDetail("I'll pay at the office")}
              >
                I'll pay at the office
              </button>
            )}

            {phase === "confirm" && selectedSlot && selectedType && (
              <div className="space-y-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-800 space-y-0.5">
                  {location && <p>{location.name}</p>}
                  <p className="font-medium">{selectedType.name}</p>
                  <p>
                    {formatDay(selectedSlot.starts_at.slice(0, 10))} · {selectedSlot.label}
                    {selectedSlot.provider_name ? ` · ${selectedSlot.provider_name}` : ""}
                  </p>
                  <p>
                    {firstName} {lastName}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  className="w-full py-3 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600 disabled:opacity-60"
                  onClick={() => void confirmBook()}
                >
                  {submitting ? "Booking…" : "Submit booking"}
                </button>
              </div>
            )}

            {phase === "invalid" && (
              <a
                href={classicBookingHref(slug)}
                className="block w-full text-center py-2.5 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600"
              >
                Open classic booking
              </a>
            )}

            {phase === "notFound" && (
              <div className="flex flex-wrap gap-2">
                <button type="button" className={CHIP} onClick={retryDetails}>
                  Update my information
                </button>
                <button type="button" className={CHIP} onClick={bookAsNewPatient}>
                  Book as a new patient
                </button>
              </div>
            )}

            {phase === "details" && !hideTextInput && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm disabled:bg-gray-100"
                    placeholder="Type your answer…"
                    value={input}
                    disabled={busy}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submitDetail(input);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => submitDetail(input)}
                    disabled={busy || !input.trim()}
                    className="p-2.5 rounded-xl bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-50"
                    aria-label="Send"
                  >
                    <Send size={20} />
                  </button>
                </div>
                {currentFormField && !currentFormField.required && (
                  <button type="button" className="text-xs font-medium text-gray-500 hover:text-teal-600" onClick={skipOptional}>
                    Skip this question (optional)
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {showConfirmModal && selectedSlot && selectedType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 text-center space-y-4">
            <CheckCircle2 size={48} className="mx-auto text-teal-500" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Appointment booked</h2>
              <p className="text-sm text-gray-600 mt-1">
                {confirmationEmail
                  ? `We'll email ${confirmationEmail} when the office confirms this visit.`
                  : "The office will confirm this appointment. You can close this chat."}
              </p>
            </div>
            <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-left text-sm text-teal-900 space-y-0.5">
              {location && <p className="font-medium">{location.name}</p>}
              <p className="font-semibold">{selectedType.name}</p>
              <p>
                {formatDay(selectedSlot.starts_at.slice(0, 10))} · {selectedSlot.label}
                {selectedSlot.provider_name ? ` · ${selectedSlot.provider_name}` : ""}
              </p>
              <p>
                {firstName} {lastName}
              </p>
            </div>
            <button
              type="button"
              className="w-full py-3 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-xl"
              onClick={() => {
                setShowConfirmModal(false);
                const redirect = info?.booking_redirect_url?.trim();
                if (redirect) {
                  window.location.href = redirect.startsWith("http") ? redirect : `https://${redirect}`;
                }
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </BrandedShell>
  );
}
