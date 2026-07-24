/** Staff roles and what each can view / edit / create / manage. */

export type StaffRole =
  | "admin"
  | "provider"
  | "front_desk"
  | "billing"
  | "member";

export type Capability = "view" | "create" | "edit" | "manage";

export type RoleOption = {
  value: StaffRole;
  label: string;
  summary: string;
};

export const STAFF_ROLES: RoleOption[] = [
  {
    value: "admin",
    label: "Practice Admin",
    summary: "Full access to settings, staff, and all clinical tools.",
  },
  {
    value: "provider",
    label: "Provider",
    summary: "Clinical care — patients, scheduling, and forms; no practice settings.",
  },
  {
    value: "front_desk",
    label: "Front Desk",
    summary: "Front office — scheduling, patients, forms, and verification.",
  },
  {
    value: "billing",
    label: "Billing",
    summary: "Payments and insurance; limited clinical editing.",
  },
  {
    value: "member",
    label: "Staff",
    summary: "General staff access to day-to-day clinical tools.",
  },
];

type PermissionRow = {
  area: string;
  description: string;
  access: Record<StaffRole, Capability | null>;
};

/** Keep aligned with nexhealth-backend/app/core/permissions.py */
export const PERMISSION_MATRIX: PermissionRow[] = [
  {
    area: "Patients",
    description: "Search, open charts, create and update demographics",
    access: {
      admin: "manage",
      provider: "edit",
      front_desk: "edit",
      billing: "view",
      member: "edit",
    },
  },
  {
    area: "Scheduling",
    description: "Appointments, online booking, waitlist, recalls",
    access: {
      admin: "manage",
      provider: "edit",
      front_desk: "manage",
      billing: "view",
      member: "edit",
    },
  },
  {
    area: "Forms",
    description: "Send intake/consent forms and review submissions",
    access: {
      admin: "manage",
      provider: "edit",
      front_desk: "edit",
      billing: null,
      member: "edit",
    },
  },
  {
    area: "Communications",
    description: "Messaging, reminders, and patient outreach",
    access: {
      admin: "manage",
      provider: "view",
      front_desk: "edit",
      billing: "view",
      member: "edit",
    },
  },
  {
    area: "Payments",
    description: "Payment links, collections, and payment status",
    access: {
      admin: "manage",
      provider: null,
      front_desk: "view",
      billing: "manage",
      member: "view",
    },
  },
  {
    area: "Insurance verification",
    description: "Eligibility checks before appointments",
    access: {
      admin: "manage",
      provider: "view",
      front_desk: "edit",
      billing: "edit",
      member: "edit",
    },
  },
  {
    area: "Locations",
    description: "Switch offices; admins add and edit location details",
    access: {
      admin: "manage",
      provider: "view",
      front_desk: "view",
      billing: "view",
      member: "view",
    },
  },
  {
    area: "Staff & users",
    description: "Invite staff, change roles, reset passwords",
    access: {
      admin: "manage",
      provider: null,
      front_desk: null,
      billing: null,
      member: null,
    },
  },
  {
    area: "Practice settings",
    description: "Logo, Synchronizer / EHR, practice profile",
    access: {
      admin: "manage",
      provider: null,
      front_desk: null,
      billing: null,
      member: null,
    },
  },
];

const CAPABILITY_LABEL: Record<Capability, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  manage: "Manage",
};

export function roleLabel(role: string): string {
  return STAFF_ROLES.find((r) => r.value === role)?.label ?? role;
}

export function capabilityLabel(cap: Capability | null): string {
  if (!cap) return "—";
  return CAPABILITY_LABEL[cap];
}
