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
};

export type SmartCommandGroup = {
  id: string;
  label: string;
  commands: SmartCommand[];
};

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
        description: "Button to widget to book appointments (includes all locations)",
        preview: "[Book appointment]",
      },
      {
        token: "SURVEY_SMS_RATING",
        label: "Survey SMS rating",
        description: "Insert a prompt to rate your service. Used with Reviews templates.",
        preview: "How was your visit? Reply 1–5",
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
    commands: [
      {
        token: "FORM_MEDICAL_HISTORY",
        label: "Medical History",
        description: "Insert a button that links to this form. Requires Forms.",
        preview: "[Medical History]",
      },
      {
        token: "FORM_PATIENT_INFORMATION",
        label: "Patient Information Form",
        description: "Insert a button that links to this form. Requires Forms.",
        preview: "[Patient Information Form]",
      },
      {
        token: "FORM_DENTAL_INSURANCE",
        label: "Dental Insurance Form",
        description: "Insert a button that links to this form. Requires Forms.",
        preview: "[Dental Insurance Form]",
      },
      {
        token: "FORM_DRIVER_LICENSE",
        label: "Driver License Form",
        description: "Insert a button that links to this form. Requires Forms.",
        preview: "[Driver License Form]",
      },
      {
        token: "FORM_HIPAA",
        label: "HIPAA and Release Authorization",
        description: "Insert a button that links to this form. Requires Forms.",
        preview: "[HIPAA and Release Authorization]",
      },
      {
        token: "APPOINTMENT_REGISTRATION",
        label: "Appointment registration",
        description:
          "Links the patient to confirm their appointment. With Smart Forms enabled, also prompts required intake forms.",
        preview: "[Confirm appointment & forms]",
      },
    ],
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
      },
      {
        token: "APPOINTMENT_DATE",
        label: "Appointment date",
        description: "Inserts the date of the scheduled appointment.",
        preview: "March 12, 2026",
      },
      {
        token: "APPOINTMENT_TIME",
        label: "Appointment time",
        description: "Inserts the time of the scheduled appointment.",
        preview: "10:00 AM",
      },
      {
        token: "APPOINTMENT_DETAILS",
        label: "Appointment details",
        description: "Inserts details about the scheduled appointment.",
        preview: "Cleaning with Dr. Riviera on March 12 at 10:00 AM",
      },
      {
        token: "CONFIRM_APPOINTMENT",
        label: "Confirm appointment",
        description: "Inserts a button the patient can click to confirm their appointment.",
        preview: "[Confirm appointment]",
      },
    ],
  },
  {
    id: "appointment_slots",
    label: "Appointment slots",
    commands: [
      {
        token: "APPOINTMENT_SLOTS",
        label: "Available appointment slots",
        description:
          "Inserts available appointment slots for a specific appointment type so patients can select a time. Used with Scheduling.",
        preview: "[Available slots]",
      },
    ],
  },
  {
    id: "provider",
    label: "Provider",
    commands: [
      {
        token: "PROVIDER_FIRST_NAME",
        label: "Provider first name",
        description: "Inserts the first name of the provider associated with the appointment or slot.",
        preview: "Nick",
      },
      {
        token: "PROVIDER_LAST_NAME",
        label: "Provider last name",
        description: "Inserts the last name of the provider associated with the appointment or slot.",
        preview: "Riviera",
      },
      {
        token: "PROVIDER_SHORT_NAME",
        label: "Provider short name",
        description: "Inserts the short name of the provider associated with the appointment or slot.",
        preview: "Dr. Riviera",
      },
      {
        token: "PROVIDER_FULL_NAME",
        label: "Provider full name",
        description: "Inserts the full name of the provider associated with the appointment or slot.",
        preview: "Dr. Nick Riviera",
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
          "Insert buttons to confirm a waitlist slot. Providers are stored at the time slot level.",
        preview: "[Claim this slot]",
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
      },
      {
        token: "PAYMENT_REASON",
        label: "Payment reason",
        description: "Inserts the payment reason. For use with Payments.",
        preview: "Outstanding balance",
      },
      {
        token: "PAYMENT_APPOINTMENT_DATE",
        label: "Payment appointment date",
        description: "Inserts the appointment date related to the payment.",
        preview: "March 12, 2026",
      },
      {
        token: "PAYMENT_BUTTON",
        label: "Payment button",
        description: "Insert a button so the patient can pay online.",
        preview: "[Pay now]",
      },
    ],
  },
];

/** Flat token → preview map for Preview mode. */
export const SMART_COMMAND_PREVIEW: Record<string, string> = Object.fromEntries(
  SMART_COMMAND_GROUPS.flatMap((g) => g.commands.map((c) => [c.token, c.preview]))
);

export function applySmartCommandPreview(text: string): string {
  return text.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, token: string) => {
    return SMART_COMMAND_PREVIEW[token] ?? match;
  });
}

export function wrapSmartCommand(token: string): string {
  return `{{${token}}}`;
}
