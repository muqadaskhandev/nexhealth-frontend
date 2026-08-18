import { useRef, useState, type ReactNode } from "react";
import { ClipboardList, MessageSquare, Shield, User } from "lucide-react";
import { PublicBookingFormFieldInput, validateFormField } from "./PublicBookingFormFieldInput";
import { DatePicker } from "../components/shared/DatePicker";
import { dobInputBounds } from "../lib/fieldFormat";
import { bookingEmailError, bookingPhoneError, bookingZipError, personNameError } from "../lib/bookingFieldGuards";
import type { PublicBookingFormField, PublicBookingInsurance } from "../lib/public-booking-api";

export type BookingFor = "self" | "child" | "other";
export type PatientKind = "new" | "existing";

export type BookingDetailsValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string;
  zipCode: string;
  gender: string;
  guarantorFirstName: string;
  guarantorLastName: string;
  guarantorEmail: string;
  guarantorPhone: string;
  callTextConsent: boolean;
  insuranceId: string;
  insuranceSearch: string;
  formAnswers: Record<string, unknown>;
};

type FieldErrors = Record<string, string>;

type Props = {
  patientKind: PatientKind;
  bookingFor: BookingFor;
  values: BookingDetailsValues;
  onChange: (patch: Partial<BookingDetailsValues>) => void;
  formFields: PublicBookingFormField[];
  askForInsurance: boolean;
  insurances: PublicBookingInsurance[];
  appointmentSummary: ReactNode;
  error?: string | null;
  submitLabel?: string;
  submitting?: boolean;
  onSubmit: () => void;
  footerNote?: ReactNode;
};

const baseInput =
  "w-full px-3.5 py-2.5 border rounded-xl text-sm text-gray-800 outline-none bg-white transition-all";
const okInput = `${baseInput} border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100`;
const errInput = `${baseInput} border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100 bg-red-50/30`;
const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600 mt-1">{message}</p>;
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white overflow-hidden shadow-sm">
      <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
          {icon}
        </div>
        <div className="min-w-0 pt-0.5">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="p-4 space-y-3.5">{children}</div>
    </div>
  );
}

export function validateBookingDetails(
  patientKind: PatientKind,
  bookingFor: BookingFor,
  values: BookingDetailsValues,
  formFields: PublicBookingFormField[],
  askForInsurance: boolean,
  insurances: PublicBookingInsurance[]
): { ok: boolean; errors: FieldErrors; message: string | null } {
  const errors: FieldErrors = {};

  const firstNameErr = personNameError(values.firstName, "first name");
  if (firstNameErr) errors.firstName = firstNameErr;
  const lastNameErr = personNameError(values.lastName, "last name");
  if (lastNameErr) errors.lastName = lastNameErr;

  if (patientKind === "existing") {
    if (!values.dob) errors.dob = "Date of birth is required.";
    if (!values.email.trim() && !values.phone.trim()) {
      errors.email = "Enter email or phone.";
      errors.phone = "Enter email or phone.";
    } else {
      const em = bookingEmailError(values.email, false);
      const ph = bookingPhoneError(values.phone, false);
      if (values.email.trim() && em) errors.email = em;
      if (values.phone.trim() && ph) errors.phone = ph;
    }
  }

  if (patientKind === "new") {
    const em = bookingEmailError(values.email, true);
    if (em) errors.email = em;
    const ph = bookingPhoneError(values.phone, true);
    if (ph) errors.phone = ph;
    if (!values.dob) errors.dob = "Date of birth is required.";
    const zip = bookingZipError(values.zipCode, true);
    if (zip) errors.zipCode = zip;
    if (!values.gender) errors.gender = "Please select legal sex.";
  }

  if (bookingFor !== "self") {
    const gf = personNameError(values.guarantorFirstName, "guarantor first name");
    if (gf) errors.guarantorFirstName = gf;
    const gl = personNameError(values.guarantorLastName, "guarantor last name");
    if (gl) errors.guarantorLastName = gl;
    if (!values.guarantorEmail.trim() && !values.guarantorPhone.trim()) {
      errors.guarantorEmail = "Enter guarantor email or phone.";
      errors.guarantorPhone = "Enter guarantor email or phone.";
    } else {
      const em = bookingEmailError(values.guarantorEmail, false);
      const ph = bookingPhoneError(values.guarantorPhone, false);
      if (values.guarantorEmail.trim() && em) errors.guarantorEmail = em;
      if (values.guarantorPhone.trim() && ph) errors.guarantorPhone = ph;
    }
  }

  if (askForInsurance && insurances.length > 0 && !values.insuranceId) {
    errors.insuranceId = "Please select your insurance.";
  }

  for (const f of formFields) {
    const msg = validateFormField(f, values.formAnswers[f.id]);
    if (msg) errors[`field:${f.id}`] = msg;
  }

  const keys = Object.keys(errors);
  if (keys.length === 0) return { ok: true, errors: {}, message: null };

  const first = errors[keys[0]];
  return {
    ok: false,
    errors,
    message: first || "Please complete all required fields.",
  };
}

export function PublicBookingDetailsForm({
  patientKind,
  bookingFor,
  values,
  onChange,
  formFields,
  askForInsurance,
  insurances,
  appointmentSummary,
  error,
  submitLabel = "Book appointment",
  submitting = false,
  onSubmit,
  footerNote,
}: Props) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [localError, setLocalError] = useState<string | null>(null);
  const errorBannerRef = useRef<HTMLDivElement>(null);

  const filteredInsurances = insurances.filter(
    (i) =>
      !values.insuranceSearch.trim() ||
      i.name.toLowerCase().includes(values.insuranceSearch.trim().toLowerCase())
  );
  const selectedInsurance = insurances.find((i) => i.id === values.insuranceId);
  const displayError = localError || error;

  function clearErrorKeys(...keys: string[]) {
    setFieldErrors((prev) => {
      if (keys.every((k) => !prev[k])) return prev;
      const next = { ...prev };
      for (const k of keys) delete next[k];
      return next;
    });
    setLocalError(null);
  }

  function patch(p: Partial<BookingDetailsValues>) {
    const keys: string[] = [];
    if (p.firstName !== undefined) keys.push("firstName");
    if (p.lastName !== undefined) keys.push("lastName");
    if (p.email !== undefined) keys.push("email", "phone");
    if (p.phone !== undefined) keys.push("email", "phone");
    if (p.dob !== undefined) keys.push("dob");
    if (p.zipCode !== undefined) keys.push("zipCode");
    if (p.gender !== undefined) keys.push("gender");
    if (p.guarantorFirstName !== undefined) keys.push("guarantorFirstName");
    if (p.guarantorLastName !== undefined) keys.push("guarantorLastName");
    if (p.guarantorEmail !== undefined || p.guarantorPhone !== undefined) {
      keys.push("guarantorEmail", "guarantorPhone");
    }
    if (p.insuranceId !== undefined) keys.push("insuranceId");
    if (p.formAnswers !== undefined) {
      for (const id of Object.keys(p.formAnswers)) {
        if (p.formAnswers[id] !== values.formAnswers[id]) keys.push(`field:${id}`);
      }
    }
    if (keys.length > 0) clearErrorKeys(...keys);
    onChange(p);
  }

  function handleSubmit() {
    const result = validateBookingDetails(
      patientKind,
      bookingFor,
      values,
      formFields,
      askForInsurance,
      insurances
    );
    setFieldErrors(result.errors);
    setLocalError(result.message);
    if (!result.ok) {
      requestAnimationFrame(() => {
        errorBannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    setLocalError(null);
    onSubmit();
  }

  return (
    <div className="space-y-4">
      {appointmentSummary}

      {displayError && (
        <div
          ref={errorBannerRef}
          className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 font-medium"
          role="alert"
        >
          {displayError}
        </div>
      )}

      <Section
        icon={<User size={16} />}
        title="Your information"
        description="Tell us how to reach you for this appointment"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>
              {bookingFor === "self" ? "First name" : "Patient first name"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              value={values.firstName}
              onChange={(e) => patch({ firstName: e.target.value })}
              className={fieldErrors.firstName ? errInput : okInput}
              placeholder="Jane"
              aria-invalid={Boolean(fieldErrors.firstName)}
            />
            <FieldError message={fieldErrors.firstName} />
          </div>
          <div>
            <label className={labelCls}>
              {bookingFor === "self" ? "Last name" : "Patient last name"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              value={values.lastName}
              onChange={(e) => patch({ lastName: e.target.value })}
              className={fieldErrors.lastName ? errInput : okInput}
              placeholder="Doe"
              aria-invalid={Boolean(fieldErrors.lastName)}
            />
            <FieldError message={fieldErrors.lastName} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>
              Email{patientKind === "new" ? <span className="text-red-500"> *</span> : null}
            </label>
            <input
              type="email"
              value={values.email}
              onChange={(e) => patch({ email: e.target.value })}
              className={fieldErrors.email ? errInput : okInput}
              placeholder="jane@email.com"
              aria-invalid={Boolean(fieldErrors.email)}
            />
            <FieldError message={fieldErrors.email} />
          </div>
          <div>
            <label className={labelCls}>
              Phone{patientKind === "new" ? <span className="text-red-500"> *</span> : null}
            </label>
            <input
              type="tel"
              value={values.phone}
              onChange={(e) => patch({ phone: e.target.value })}
              className={fieldErrors.phone ? errInput : okInput}
              placeholder="(555) 555-5555"
              aria-invalid={Boolean(fieldErrors.phone)}
            />
            <FieldError message={fieldErrors.phone} />
            {patientKind === "existing" && !fieldErrors.phone && (
              <p className="text-[11px] text-gray-400 mt-1">Email or phone must match our records.</p>
            )}
          </div>
        </div>

        <div>
          <label className={labelCls}>
            Date of birth <span className="text-red-500">*</span>
          </label>
          <DatePicker
            value={values.dob}
            min={dobInputBounds().min}
            max={dobInputBounds().max}
            onChange={(iso) => patch({ dob: iso })}
            aria-label="Date of birth"
            inputClassName={fieldErrors.dob ? "border-red-400 ring-2 ring-red-100" : ""}
          />
          <FieldError message={fieldErrors.dob} />
        </div>

        {patientKind === "new" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>
                Zip code <span className="text-red-500">*</span>
              </label>
              <input
                value={values.zipCode}
                onChange={(e) => patch({ zipCode: e.target.value })}
                className={fieldErrors.zipCode ? errInput : okInput}
                placeholder="11201"
                aria-invalid={Boolean(fieldErrors.zipCode)}
              />
              <FieldError message={fieldErrors.zipCode} />
            </div>
            <div>
              <label className={labelCls}>
                Legal sex <span className="text-red-500">*</span>
              </label>
              <select
                value={values.gender}
                onChange={(e) => patch({ gender: e.target.value })}
                className={`${fieldErrors.gender ? errInput : okInput} bg-white`}
                aria-invalid={Boolean(fieldErrors.gender)}
              >
                <option value="">Select…</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <FieldError message={fieldErrors.gender} />
            </div>
          </div>
        )}
      </Section>

      {bookingFor !== "self" && (
        <Section icon={<ClipboardList size={16} />} title="Guarantor information" description="Contact for the person booking">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>
                First name <span className="text-red-500">*</span>
              </label>
              <input
                value={values.guarantorFirstName}
                onChange={(e) => patch({ guarantorFirstName: e.target.value })}
                className={fieldErrors.guarantorFirstName ? errInput : okInput}
              />
              <FieldError message={fieldErrors.guarantorFirstName} />
            </div>
            <div>
              <label className={labelCls}>
                Last name <span className="text-red-500">*</span>
              </label>
              <input
                value={values.guarantorLastName}
                onChange={(e) => patch({ guarantorLastName: e.target.value })}
                className={fieldErrors.guarantorLastName ? errInput : okInput}
              />
              <FieldError message={fieldErrors.guarantorLastName} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={values.guarantorEmail}
                onChange={(e) => patch({ guarantorEmail: e.target.value })}
                className={fieldErrors.guarantorEmail ? errInput : okInput}
              />
              <FieldError message={fieldErrors.guarantorEmail} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input
                type="tel"
                value={values.guarantorPhone}
                onChange={(e) => patch({ guarantorPhone: e.target.value })}
                className={fieldErrors.guarantorPhone ? errInput : okInput}
              />
              <FieldError message={fieldErrors.guarantorPhone} />
            </div>
          </div>
        </Section>
      )}

      {askForInsurance && insurances.length > 0 && (
        <Section icon={<Shield size={16} />} title="Insurance" description="Search and select your carrier">
          {selectedInsurance && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2.5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700">Selected</p>
                <p className="text-sm font-medium text-teal-900">{selectedInsurance.name}</p>
              </div>
              <button
                type="button"
                onClick={() => patch({ insuranceId: "" })}
                className="text-xs font-semibold text-teal-700 hover:text-teal-900"
              >
                Change
              </button>
            </div>
          )}
          {!selectedInsurance && (
            <>
              <input
                value={values.insuranceSearch}
                onChange={(e) => patch({ insuranceSearch: e.target.value })}
                placeholder="Search insurers…"
                className={fieldErrors.insuranceId ? errInput : okInput}
              />
              <div
                className={`max-h-44 overflow-y-auto rounded-xl border divide-y divide-gray-100 bg-white ${
                  fieldErrors.insuranceId ? "border-red-400" : "border-gray-200"
                }`}
              >
                {filteredInsurances.length === 0 ? (
                  <p className="px-3.5 py-3 text-xs text-gray-400">No matching insurers.</p>
                ) : (
                  filteredInsurances.map((ins) => (
                    <button
                      key={ins.id}
                      type="button"
                      onClick={() => patch({ insuranceId: ins.id, insuranceSearch: "" })}
                      className="w-full text-left px-3.5 py-2.5 text-sm text-gray-800 hover:bg-teal-50 hover:text-teal-800 transition-colors"
                    >
                      {ins.name}
                    </button>
                  ))
                )}
              </div>
              <FieldError message={fieldErrors.insuranceId} />
            </>
          )}
        </Section>
      )}

      {formFields.length > 0 && (
        <Section
          icon={<MessageSquare size={16} />}
          title="Additional questions"
          description="A few more details for your visit"
        >
          {formFields.map((f) => {
            const err = fieldErrors[`field:${f.id}`];
            return (
              <div
                key={f.id}
                className={`rounded-xl border p-3.5 ${
                  err ? "border-red-300 bg-red-50/40" : "border-gray-100 bg-gray-50/50"
                }`}
              >
                <PublicBookingFormFieldInput
                  field={f}
                  value={values.formAnswers[f.id]}
                  invalid={Boolean(err)}
                  onChange={(value) =>
                    patch({ formAnswers: { ...values.formAnswers, [f.id]: value } })
                  }
                />
                <FieldError message={err} />
              </div>
            );
          })}
        </Section>
      )}

      <label className="flex items-start gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-3.5 cursor-pointer shadow-sm">
        <input
          type="checkbox"
          checked={values.callTextConsent}
          onChange={(e) => patch({ callTextConsent: e.target.checked })}
          className="mt-0.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
        />
        <span className="text-xs text-gray-600 leading-relaxed">
          By leaving checked, I agree with the Call/Text Consent and resubscribe to communications from this
          practice.
        </span>
      </label>

      {displayError && (
        <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 font-medium" role="alert">
          {displayError}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3.5 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-teal-500/20"
      >
        {submitting ? "Booking…" : submitLabel}
      </button>
      {footerNote}
    </div>
  );
}
