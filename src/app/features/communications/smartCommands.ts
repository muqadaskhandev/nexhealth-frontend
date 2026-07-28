/** Smart Commands catalog for template / campaign message personalization. */

export type SmartCommand = {
  /** Token inserted into the message body, e.g. COMPANY_LOGO */
  token: string;
  /** Display label in the picker */
  label: string;
  /** Hover tooltip explaining what gets substituted */
  description: string;
  /** Sample value used in Preview mode */
  preview: string;
  /**
   * When set, only show on these template slugs.
   * Omit = available on all templates (subject to product notes in description).
   */
  templates?: string[];
};

export type SmartCommandGroup = {
  id: string;
  label: string;
  commands: SmartCommand[];
};

/** Core static groups (Forms + Appointment slots are merged in at runtime). */
export const SMART_COMMAND_GROUPS: SmartCommandGroup[] = [
  {
    id: "company",
    label: "Company",
    commands: [
      {
        token: "COMPANY_LOGO",
        label: "Company Logo",
        description: "Insert the logo you've uploaded.",
        preview: "[Logo]",
      },
      {
        token: "COMPANY_BOOKING_APPOINTMENT",
        label: "Booking appointment",
        description: "Button to widget to book appointments (includes all locations). Requires Scheduling.",
        preview: "[Book appointment]",
      },
      {
        token: "SURVEY_SMS_RATING",
        label: "Survey SMS rating",
        description: "Insert a prompt to rate your service. Used with Reviews templates.",
        preview: "How was your visit? Reply 1–5",
        templates: ["reviews"],
      },
    ],
  },
  {
    id: "location",
    label: "Location",
    commands: [
      {
        token: "LOCATION_NAME",
        label: "Location name",
        description: "Inserts the name for the location associated with the communication.",
        preview: "Better Dental - New York",
      },
      {
        token: "LOCATION_ADDRESS",
        label: "Location address",
        description: "Inserts the address for the location associated with the communication.",
        preview: "123 Main St, New York, NY",
      },
      {
        token: "LOCATION_PHONE",
        label: "Location phone",
        description: "Inserts the phone number for the location associated with the communication.",
        preview: "(555) 555-0100",
      },
      {
        token: "LOCATION_BOOKING_APPOINTMENT",
        label: "Booking appointment",
        description: "Button to book an appointment for this location only. Requires Scheduling.",
        preview: "[Book at this location]",
      },
    ],
  },
  {
    id: "patient",
    label: "Patient",
    commands: [
      {
        token: "PATIENT_FIRST_NAME",
        label: "Patient first name",
        description: "Inserts the patient's first name as it appears in their record.",
        preview: "Alex",
      },
      {
        token: "PATIENT_LAST_NAME",
        label: "Patient last name",
        description: "Inserts the patient's last name as it appears in their record.",
        preview: "Rivera",
      },
      {
        token: "PATIENT_FULL_NAME",
        label: "Patient full name",
        description: "Inserts the patient's full name as it appears in their record.",
        preview: "Alex Rivera",
      },
      {
        token: "PATIENT_EMAIL",
        label: "Patient email address",
        description: "Inserts the patient's email address. Available in Saved responses.",
        preview: "alex@example.com",
      },
      {
        token: "PATIENT_FORM_BUTTON",
        label: "Button with a link to a patient form",
        description: "Insert a button linking to the patient form. Used with Forms.",
        preview: "[Complete forms]",
      },
    ],
  },
  {
    id: "forms",
    label: "Forms",
    // Populated at runtime from enabled form templates.
    commands: [],
  },
  {
    id: "appointment",
    label: "Appointment",
    commands: [
      {
        token: "APPOINTMENT_TYPE",
        label: "Appointment type",
        description: "Inserts the type of the scheduled appointment. Used with Scheduling and Reminders.",
        preview: "Cleaning",
        templates: [
          "reminders",
          "appointment-request",
          "appointment-confirmed",
          "appointment-rescheduled",
          "save-the-date",
          "missed",
          "cancelled",
          "post-appointment-follow-up",
          "recalls",
        ],
      },
      {
        token: "APPOINTMENT_DATE",
        label: "Appointment date",
        description: "Inserts the date of the scheduled appointment.",
        preview: "March 12, 2026",
        templates: [
          "reminders",
          "appointment-request",
          "appointment-confirmed",
          "appointment-rescheduled",
          "save-the-date",
          "missed",
          "cancelled",
          "post-appointment-follow-up",
          "recalls",
        ],
      },
      {
        token: "APPOINTMENT_TIME",
        label: "Appointment time",
        description: "Inserts the time of the scheduled appointment.",
        preview: "10:00 AM",
        templates: [
          "reminders",
          "appointment-request",
          "appointment-confirmed",
          "appointment-rescheduled",
          "save-the-date",
          "missed",
          "cancelled",
          "post-appointment-follow-up",
          "recalls",
        ],
      },
      {
        token: "APPOINTMENT_DETAILS",
        label: "Appointment details",
        description: "Inserts details about the scheduled appointment.",
        preview: "Cleaning with Dr. Riviera on March 12 at 10:00 AM",
        templates: [
          "reminders",
          "appointment-request",
          "appointment-confirmed",
          "appointment-rescheduled",
          "save-the-date",
          "missed",
          "cancelled",
          "post-appointment-follow-up",
          "recalls",
        ],
      },
      {
        token: "INSERTCONFIRMAPPT",
        label: "Insert confirm appointment",
        description:
          "Required for reminder consolidation. Inserts confirm/cancel prompt. Replies apply to all appointments listed in the message.",
        preview: 'Reply "C" to confirm or "N" to cancel',
        templates: ["reminders", "appointment-request", "appointment-confirmed", "save-the-date", "new-patient"],
      },
      {
        token: "CONFIRM_APPOINTMENT",
        label: "Confirm appointment",
        description: "Inserts a button the patient can click to confirm their appointment.",
        preview: "[Confirm appointment]",
        templates: ["reminders", "appointment-request", "appointment-confirmed", "save-the-date"],
      },
      {
        token: "APPOINTMENT_REGISTRATION",
        label: "Appointment registration",
        description:
          "Links the patient to confirm their appointment (also accepted as APPOINTMENTREGISTRATION). With Smart Forms enabled, also prompts required intake forms. Required (with INSERTCONFIRMAPPT) for reminder consolidation.",
        preview: "[Confirm appointment & forms]",
        templates: ["reminders", "appointment-request", "appointment-confirmed", "save-the-date", "new-patient"],
      },
    ],
  },
  {
    id: "appointment_slots",
    label: "Appointment slots",
    // Populated at runtime from appointment types.
    commands: [],
  },
  {
    id: "provider",
    label: "Provider",
    commands: [
      {
        token: "PROVIDER_FIRST_NAME",
        label: "Provider first name",
        description: "Inserts the first name of the provider associated with the appointment or slot. Used with Scheduling and Reminders.",
        preview: "Nick",
        templates: [
          "reminders",
          "appointment-request",
          "appointment-confirmed",
          "appointment-rescheduled",
          "save-the-date",
          "waitlist-appointment",
          "waitlist-continuing-care",
        ],
      },
      {
        token: "PROVIDER_LAST_NAME",
        label: "Provider last name",
        description: "Inserts the last name of the provider associated with the appointment or slot.",
        preview: "Riviera",
        templates: [
          "reminders",
          "appointment-request",
          "appointment-confirmed",
          "appointment-rescheduled",
          "save-the-date",
          "waitlist-appointment",
          "waitlist-continuing-care",
        ],
      },
      {
        token: "PROVIDER_SHORT_NAME",
        label: "Provider short name",
        description: "Inserts the short name of the provider associated with the appointment or slot.",
        preview: "Dr. Riviera",
        templates: [
          "reminders",
          "appointment-request",
          "appointment-confirmed",
          "appointment-rescheduled",
          "save-the-date",
          "waitlist-appointment",
          "waitlist-continuing-care",
        ],
      },
      {
        token: "PROVIDER_FULL_NAME",
        label: "Provider full name",
        description: "Inserts the full name of the provider associated with the appointment or slot.",
        preview: "Dr. Nick Riviera",
        templates: [
          "reminders",
          "appointment-request",
          "appointment-confirmed",
          "appointment-rescheduled",
          "save-the-date",
          "waitlist-appointment",
          "waitlist-continuing-care",
        ],
      },
    ],
  },
  {
    id: "waitlist",
    label: "Waitlist",
    commands: [
      {
        token: "CONFIRM_WAITLIST",
        label: "Confirm waitlist",
        description:
          "Insert buttons to confirm a waitlist slot. Providers are stored at the time slot level — a single waitlist request can have multiple time slots.",
        preview: "[Claim this slot]",
        templates: ["waitlist-appointment", "waitlist-continuing-care"],
      },
    ],
  },
  {
    id: "payment",
    label: "Payment",
    commands: [
      {
        token: "PAYMENT_AMOUNT",
        label: "Payment amount",
        description: "Inserts the payment amount. For use with Payments.",
        preview: "$125.00",
        templates: ["payments"],
      },
      {
        token: "PAYMENT_REASON",
        label: "Payment reason",
        description: "Inserts the payment reason. For use with Payments.",
        preview: "Outstanding balance",
        templates: ["payments"],
      },
      {
        token: "PAYMENT_APPOINTMENT_DATE",
        label: "Payment appointment date",
        description: "Inserts the appointment date related to the payment.",
        preview: "March 12, 2026",
        templates: ["payments"],
      },
      {
        token: "PAYMENT_BUTTON",
        label: "Payment button",
        description: "Insert a button so the patient can pay online.",
        preview: "[Pay now]",
        templates: ["payments"],
      },
    ],
  },
];

export function commandAvailableForTemplate(cmd: SmartCommand, templateSlug?: string): boolean {
  if (!cmd.templates || cmd.templates.length === 0) return true;
  if (!templateSlug) return true;
  return cmd.templates.includes(templateSlug);
}

export function filterSmartCommandGroups(
  groups: SmartCommandGroup[],
  templateSlug?: string
): SmartCommandGroup[] {
  return groups
    .map((g) => ({
      ...g,
      commands: g.commands.filter((c) => commandAvailableForTemplate(c, templateSlug)),
    }))
    .filter((g) => g.commands.length > 0);
}

export function formCommandsFromTemplates(
  forms: { id: string; name: string }[]
): SmartCommand[] {
  return forms.map((f) => ({
    token: `FORM_${f.id.replace(/-/g, "").slice(0, 12).toUpperCase()}`,
    label: f.name,
    description: `Insert a button that links to “${f.name}”. Requires Forms.`,
    preview: `[${f.name}]`,
  }));
}

export function appointmentSlotCommandsFromTypes(
  types: { id: string; name: string }[]
): SmartCommand[] {
  return types.map((t) => ({
    token: `APPOINTMENT_SLOTS_${t.id.replace(/-/g, "").slice(0, 12).toUpperCase()}`,
    label: t.name,
    description: `Inserts available appointment slots for “${t.name}” so patients can select a time. Used with Scheduling.`,
    preview: `[${t.name} slots]`,
  }));
}

/** Flat token → preview map for Preview mode (static + any runtime tokens). */
export function buildPreviewMap(groups: SmartCommandGroup[]): Record<string, string> {
  return Object.fromEntries(
    groups.flatMap((g) => g.commands.map((c) => [c.token, c.preview]))
  );
}

export function applySmartCommandPreview(
  text: string,
  previewMap?: Record<string, string>
): string {
  const map =
    previewMap ??
    buildPreviewMap(SMART_COMMAND_GROUPS);
  return text.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, token: string) => {
    return map[token] ?? match;
  });
}

export function wrapSmartCommand(token: string): string {
  return `{{${token}}}`;
}

/** Tokens that enable reminder consolidation (help center: INSERTCONFIRMAPPT / APPOINTMENTREGISTRATION). */
export const REMINDER_CONSOLIDATION_TOKENS = [
  "INSERTCONFIRMAPPT",
  "APPOINTMENT_REGISTRATION",
  "APPOINTMENTREGISTRATION",
  "CONFIRM_APPOINTMENT",
] as const;

export function reminderContentSupportsConsolidation(content: string): boolean {
  const upper = content.toUpperCase();
  return REMINDER_CONSOLIDATION_TOKENS.some(
    (t) => upper.includes(`{{${t}}}`) || upper.includes(t)
  );
}
