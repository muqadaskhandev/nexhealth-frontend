import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calendar, CheckCircle2, MapPin } from "lucide-react";
import {
  publicBookingApi,
  type PublicApiError,
  type PublicApiErrorDetail,
  type PublicBookingFormField,
  type PublicBookingInfo,
  type PublicBookingInsurance,
  type PublicBookingOpening,
  type PublicBookingProvider,
  type PublicBookingTimeSlot,
  type PublicBookingType,
} from "../lib/public-booking-api";
import { PublicBookingDetailsForm } from "./PublicBookingDetailsForm";
import { validateFormField } from "./PublicBookingFormFieldInput";
import { Skeleton } from "../components/ui/skeleton";

type Step = "loading" | "invalid" | "location" | "kind" | "bookingFor" | "type" | "time" | "details" | "done";
type PatientKind = "new" | "existing";
type BookingFor = "self" | "child" | "other";

function apiErrorMessage(err: unknown, fallback: string): string {
  const apiErr = err as PublicApiError;
  if (typeof apiErr?.detail === "string") return apiErr.detail;
  const detail = apiErr?.detail as PublicApiErrorDetail | undefined;
  return detail?.message || fallback;
}

function isPatientNotFound(err: unknown): boolean {
  const apiErr = err as PublicApiError;
  if (typeof apiErr?.detail === "object" && apiErr.detail?.code === "patient_not_found") return true;
  return false;
}

function locationUsesPatientTypeSplit(info: PublicBookingInfo, locationId: string): boolean {
  const loc = info.locations.find((l) => l.id === locationId);
  return loc?.separate_by_patient_type ?? info.separate_by_patient_type;
}

function formatAddress(loc: { address: string; city: string; state: string; zip_code: string }) {
  const line2 = [loc.city, loc.state, loc.zip_code].filter(Boolean).join(", ");
  return [loc.address, line2].filter(Boolean).join(" · ");
}

function formatDay(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export function PublicBookingPage({ slug }: { slug: string }) {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const lid = params.get("lid") ?? undefined;
  const locationIds = params.get("location_ids") ?? undefined;
  const providerIds = params.get("provider_ids") ?? undefined;
  const appointmentTypeIds = params.get("appointment_type_ids") ?? undefined;
  const utmSource = params.get("utm_source") ?? undefined;
  const utmMedium = params.get("utm_medium") ?? undefined;
  const utmCampaign = params.get("utm_campaign") ?? undefined;

  const [step, setStep] = useState<Step>("loading");
  const [info, setInfo] = useState<PublicBookingInfo | null>(null);
  const [invalidReason, setInvalidReason] = useState("Online booking is not available.");

  const [locationId, setLocationId] = useState("");
  const [patientKind, setPatientKind] = useState<PatientKind>("new");
  const [bookingFor, setBookingFor] = useState<BookingFor>("self");
  const [types, setTypes] = useState<PublicBookingType[]>([]);
  const [typeId, setTypeId] = useState("");
  const [providers, setProviders] = useState<PublicBookingProvider[]>([]);
  const [openings, setOpenings] = useState<PublicBookingOpening[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<PublicBookingTimeSlot | null>(null);
  const [formFields, setFormFields] = useState<PublicBookingFormField[]>([]);
  const [insurances, setInsurances] = useState<PublicBookingInsurance[]>([]);

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
  const [error, setError] = useState<string | null>(null);
  const [patientNotFound, setPatientNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [typesLoading, setTypesLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const location = info?.locations.find((l) => l.id === locationId) ?? null;
  const separateByType = info && locationId ? locationUsesPatientTypeSplit(info, locationId) : info?.separate_by_patient_type ?? false;
  const selectedType = types.find((t) => t.id === typeId) ?? null;
  const askForInsurance = location?.ask_for_insurance ?? false;

  useEffect(() => {
    publicBookingApi
      .info(slug, lid, locationIds)
      .then((data) => {
        setInfo(data);
        if (data.locations.length === 1) {
          const id = data.locations[0].id;
          setLocationId(id);
          if (data.locations[0].separate_by_patient_type) setStep("kind");
          else setStep("bookingFor");
        } else {
          setStep("location");
        }
      })
      .catch((err: unknown) => {
        const apiErr = err as PublicApiError;
        setInvalidReason(apiErr?.detail || "Online booking is not available.");
        setStep("invalid");
      });
  }, [slug, lid, locationIds]);

  useEffect(() => {
    if (!locationId || step === "loading" || step === "invalid" || step === "location" || step === "kind" || step === "bookingFor") return;
    if (step !== "type" && step !== "time" && step !== "details") return;
    let cancelled = false;
    setTypesLoading(true);
    publicBookingApi
      .types(slug, locationId, patientKind, lid, appointmentTypeIds)
      .then((rows) => {
        if (!cancelled) setTypes(rows);
      })
      .catch(() => {
        if (!cancelled) setTypes([]);
      })
      .finally(() => {
        if (!cancelled) setTypesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, locationId, patientKind, lid, appointmentTypeIds, step]);

  useEffect(() => {
    if (!locationId || !typeId) {
      setSlotsLoading(false);
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    setOpenings([]);
    Promise.all([
      publicBookingApi.providers(slug, locationId, typeId, lid, providerIds),
      publicBookingApi.openings(slug, locationId, typeId, { lid, providerIds, days: 14 }),
    ])
      .then(([providerRows, openingRows]) => {
        if (cancelled) return;
        setProviders(providerRows);
        setOpenings(openingRows);
      })
      .catch(() => {
        if (!cancelled) {
          setProviders([]);
          setOpenings([]);
        }
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, locationId, typeId, lid, providerIds]);

  useEffect(() => {
    if (!locationId || !info) return;
    const loc = info.locations.find((l) => l.id === locationId);
    publicBookingApi.formFields(slug, locationId, patientKind, lid).then(setFormFields).catch(() => setFormFields([]));
    if (loc?.ask_for_insurance) {
      publicBookingApi.insurances(slug, locationId, lid).then(setInsurances).catch(() => setInsurances([]));
    } else {
      setInsurances([]);
      setInsuranceId("");
    }
  }, [slug, locationId, patientKind, lid, info]);

  function pickLocation(id: string) {
    setLocationId(id);
    setTypeId("");
    setSelectedSlot(null);
    if (info && locationUsesPatientTypeSplit(info, id)) setStep("kind");
    else setStep("bookingFor");
  }

  function pickKind(kind: PatientKind) {
    setPatientKind(kind);
    setTypeId("");
    setSelectedSlot(null);
    setPatientNotFound(false);
    setStep("bookingFor");
  }

  function pickBookingFor(value: BookingFor) {
    setBookingFor(value);
    setTypeId("");
    setSelectedSlot(null);
    setTypes([]);
    setTypesLoading(true);
    setStep("type");
  }

  function pickType(id: string) {
    setTypeId(id);
    setSelectedSlot(null);
    setOpenings([]);
    setSlotsLoading(true);
    setStep("time");
  }

  function pickSlot(slot: PublicBookingTimeSlot) {
    setSelectedSlot(slot);
    setStep("details");
  }

  function goBack() {
    setError(null);
    setPatientNotFound(false);
    if (step === "details") setStep("time");
    else if (step === "time") setStep("type");
    else if (step === "type") setStep("bookingFor");
    else if (step === "bookingFor") {
      if (separateByType) setStep("kind");
      else if (info && info.locations.length > 1) setStep("location");
    }
    else if (step === "kind") setStep(info && info.locations.length > 1 ? "location" : "kind");
    else if (step === "location") return;
  }

  function bookAsNewPatient() {
    setPatientKind("new");
    setPatientNotFound(false);
    setError(null);
    setTypeId("");
    setSelectedSlot(null);
    setTypes([]);
    setTypesLoading(true);
    setStep("type");
  }

  async function handleBook() {
    if (submitting || !selectedSlot || !selectedType || !locationId) return;
    setError(null);
    setPatientNotFound(false);
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name.");
      return;
    }
    if (patientKind === "existing") {
      if (!dob) {
        setError("Please enter your date of birth.");
        return;
      }
      if (!email.trim() && !phone.trim()) {
        setError("Please enter your email or phone number so we can find your record.");
        return;
      }
    }
    if (patientKind === "new") {
      if (!email.trim()) {
        setError("Please enter your email address.");
        return;
      }
      if (!phone.trim()) {
        setError("Please enter your phone number.");
        return;
      }
      if (!dob) {
        setError("Please enter your date of birth.");
        return;
      }
      if (!zipCode.trim()) {
        setError("Please enter your zip code.");
        return;
      }
      if (!gender) {
        setError("Please select your legal sex.");
        return;
      }
    }
    if (bookingFor !== "self") {
      if (!guarantorFirstName.trim() || !guarantorLastName.trim()) {
        setError("Please enter the guarantor's first and last name.");
        return;
      }
      if (!guarantorEmail.trim() && !guarantorPhone.trim()) {
        setError("Please enter the guarantor's email or phone number.");
        return;
      }
    }
    if (askForInsurance && insurances.length > 0 && !insuranceId) {
      setError("Please select your insurance.");
      return;
    }
    for (const f of formFields) {
      const fieldError = validateFormField(f, formAnswers[f.id]);
      if (fieldError) {
        setError(fieldError);
        return;
      }
    }

    setSubmitting(true);
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
        },
        lid
      );
      setConfirmation(result.confirmation);
      setStep("done");
      const redirect = info?.booking_redirect_url?.trim();
      if (redirect) {
        const href = redirect.startsWith("http") ? redirect : `https://${redirect}`;
        window.setTimeout(() => {
          window.location.href = href;
        }, 4000);
      }
    } catch (err: unknown) {
      if (isPatientNotFound(err)) {
        setPatientNotFound(true);
        setError(null);
      } else {
        setError(apiErrorMessage(err, "Could not complete your booking — please try again."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const logoUrl = location?.logo_url || info?.practice_logo_url;

  if (step === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading online booking…</p>
      </div>
    );
  }

  if (step === "invalid" || !info) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-gray-700">{invalidReason}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center gap-4">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover border border-gray-100" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-teal-500 text-white flex items-center justify-center text-sm font-bold">
              {info.practice_name.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{info.practice_name}</h1>
            {location && <p className="text-xs text-gray-500 truncate">{location.name}</p>}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {step !== "done" &&
          step !== "location" &&
          !(step === "kind" && info.locations.length === 1) &&
          !(step === "bookingFor" && info.locations.length === 1 && !separateByType) && (
          <button
            onClick={goBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            <ArrowLeft size={15} /> Back
          </button>
        )}

        {step === "location" && (
          <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Choose a location</h2>
              <p className="text-sm text-gray-500 mt-1">Select where you'd like to be seen.</p>
            </div>
            <div className="divide-y divide-gray-100">
              {info.locations.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => pickLocation(loc.id)}
                  className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <MapPin size={16} className="text-teal-600 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{loc.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatAddress(loc)}</p>
                      {loc.phone && <p className="text-xs text-gray-400 mt-0.5">{loc.phone}</p>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === "kind" && (
          <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-bold text-gray-900">Are you a new or returning patient?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(["new", "existing"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => pickKind(k)}
                  className="px-4 py-4 rounded-xl border border-gray-200 hover:border-teal-400 hover:bg-teal-50 text-left transition-colors"
                >
                  <p className="text-sm font-semibold text-gray-900">{k === "new" ? "New patient" : "Returning patient"}</p>
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
              {([
                { id: "self" as const, title: "Myself", desc: "I am the patient" },
                { id: "child" as const, title: "My child or dependent", desc: "I am booking for someone I am responsible for" },
                { id: "other" as const, title: "Someone else", desc: "I am booking on behalf of another person" },
              ]).map((opt) => (
                <button
                  key={opt.id}
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
            {typesLoading ? (
              <AppointmentTypesSkeleton />
            ) : types.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-gray-400">No appointment types are available online right now.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {types.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => pickType(t.id)}
                    className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50 text-left transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-900">{t.name}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0">{t.duration_minutes} min</span>
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
              {providers.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  Available with {providers.map((p) => p.name).join(", ")}
                </p>
              )}
            </div>
            {slotsLoading ? (
              <TimeSlotsSkeleton />
            ) : openings.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-gray-400">No openings in the next two weeks.</p>
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
                          key={`${day.date}-${slot.provider_id}-${slot.minutes}`}
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
          <section className="space-y-4">
            {patientNotFound ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center space-y-4 py-8">
                <h2 className="text-lg font-bold text-gray-900">Oops! We couldn&apos;t find your patient record</h2>
                <p className="text-sm text-gray-600 max-w-md mx-auto">
                  We couldn&apos;t match the information you entered to an existing patient at this practice.
                  Please double-check your name, date of birth, and contact details.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setPatientNotFound(false)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    Update your information
                  </button>
                  <button
                    type="button"
                    onClick={bookAsNewPatient}
                    className="w-full sm:w-auto px-5 py-2.5 border border-gray-200 text-gray-800 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Book as new patient
                  </button>
                </div>
              </div>
            ) : (
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
                formFields={formFields}
                askForInsurance={askForInsurance}
                insurances={insurances}
                error={error}
                submitting={submitting}
                onSubmit={handleBook}
                appointmentSummary={
                  <div className="rounded-xl bg-teal-50 border border-teal-100 px-4 py-3.5 text-sm text-teal-900 shadow-sm">
                    <p className="font-semibold">{selectedType.name}</p>
                    <p className="text-teal-800 mt-0.5">
                      {formatDay(selectedSlot.starts_at.slice(0, 10))} at {selectedSlot.label} with{" "}
                      {selectedSlot.provider_name}
                    </p>
                  </div>
                }
              />
            )}
          </section>
        )}

        {step === "done" && (
          <section className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
            <CheckCircle2 size={40} className="mx-auto text-teal-500" />
            <h2 className="text-lg font-bold text-gray-900">You're all set!</h2>
            <p className="text-sm text-gray-600">{confirmation}</p>
            <p className="text-xs text-gray-400">A confirmation will be sent to {email}.</p>
            {info.booking_redirect_url?.trim() && (
              <div className="pt-2 space-y-2">
                <p className="text-xs text-gray-500">You&apos;ll be redirected to our website shortly…</p>
                <a
                  href={info.booking_redirect_url.trim().startsWith("http") ? info.booking_redirect_url.trim() : `https://${info.booking_redirect_url.trim()}`}
                  className="inline-block text-sm font-semibold text-teal-600 hover:text-teal-700"
                >
                  Return to our website now →
                </a>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function AppointmentTypesSkeleton() {
  return (
    <div className="divide-y divide-gray-100">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between gap-3 px-5 py-4">
          <Skeleton className="h-4 w-40 bg-gray-100" />
          <Skeleton className="h-3 w-12 bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

function TimeSlotsSkeleton() {
  return (
    <div className="p-5 space-y-5">
      {[1, 2].map((day) => (
        <div key={day}>
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="h-4 w-4 rounded bg-gray-100" />
            <Skeleton className="h-4 w-36 bg-gray-100" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((slot) => (
              <Skeleton key={slot} className="h-10 w-full rounded-lg bg-gray-100" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
