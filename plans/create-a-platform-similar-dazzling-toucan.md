# Plan: Forms Nav Item + Manage Forms + Form Builder

## Context
The user wants Forms, Payments, and Verification as their own top-level sidebar nav items (not children of Scheduling). Clicking Forms shows a full Forms section with a patient submission table, a "Manage forms" page, a Form Builder, and a Digitize upload flow — all faithfully matching the 7 reference screenshots.

## What the screenshots show

| Image | What it is |
|---|---|
| **Form1/4** | Main Forms view — tabs: Active/Synced/Expired/All; patient submission table with avatar, expiration date, PDF filenames, sync status badges; top-right: Manage forms, Settings, Templates, Request forms buttons |
| **Form2/5** | Manage Forms page — "← Forms" back link; Forms/Packets tab bar; Archived forms + Copy to locations links; Search forms input; "New form ∨" dropdown → Digitize / Build |
| **Form3** | Form Builder full-page — Select a Template dropdown; Document Type / Display Type / Title fields; left Questions sidebar (Text Field, Text Area, Email, Number, Phone Number, Checkbox, Select Boxes, Dropdown); Page 1 canvas with drag-and-drop placeholder; "+ Page" button; Save and exit |
| **Form6** | Digitize upload modal — drag-and-drop zone; Select Files button; Cancel + Continue (disabled until file uploaded) |
| **Form7** | Manage Forms with `...` ellipsis menu — Edit details, Preview, Duplicate, Download, Copy to locations, Archive |

## Changes to `src/app/App.tsx`

### 1. Sidebar NAV_ITEMS
- Remove `{ id: "forms", label: "Forms" }` from Scheduling children (keep Waitlist, Online booking)
- Add three standalone top-level items after Scheduling:
```ts
{ id: "forms",        label: "Forms",        icon: <ClipboardList size={16} /> },
{ id: "payments",     label: "Payments",     icon: <CreditCard size={16} />    },
{ id: "verification", label: "Verification", icon: <ShieldCheck size={16} />   },
```
- Import `ClipboardList`, `ShieldCheck` from lucide-react

### 2. Routing in App return
Extend the ternary chain:
```tsx
activeNav === "patients"     → <PatientsSection .../>
activeNav === "forms"        → <FormsSection />
activeNav === "payments"     → <PlaceholderView title="Payments" />
activeNav === "verification" → <PlaceholderView title="Verification" />
default                      → <HomeDashboard .../>
```

### 3. `FormsSection` component
Internal state: `view: "list" | "manage" | "builder" | "digitize"`

**List view** (`view === "list"`):
- Header: "Forms" h1 + right-side buttons: "Manage forms" (outlined, `onClick → setView("manage")`), "Settings" (outlined), "Templates" (outlined), "Request forms" (teal filled)
- Tab bar: Active | Synced | Expired | All — with `useState` for active tab
- Right: "Find a patient" search input + "Filter by ∨" button
- Table columns: Patients (checkbox + gray avatar + name + "Submitted via iPad" + date) | Expiration date | Forms (document icon + filename) | Status (badge)
- Status badges:
  - **Syncing** — gray pill with sync icon
  - **Sync now** — teal filled pill
  - **Assign & sync** — teal filled pill
  - **Sync failed** — red outlined pill with warning icon
  - **Date string** (e.g. "Aug 20") — green text
  - **Complete** — gray "Complete" label before the sync badge
- `...` per row (overflow menu stub)
- Sample patients: Tony Stark, Steve Rogers, Bruce Banner, Natasha Romanoff, T'Challa Panther, Peter Parker

**Manage Forms view** (`view === "manage"`):
- "← Forms" teal back link (`onClick → setView("list")`)
- "Manage Forms" h1
- Forms | Packets tab bar (Forms active by default)
- Right links: "Archived forms" (archive icon + teal), "Copy to locations" (copy icon + teal)
- "Search forms" full-width input
- "New form ∨" teal button — dropdown with:
  - **Digitize** (refresh icon + external-link icon) — "Attach files and NexHealth will convert your forms." → `setView("digitize")`
  - **Build** (wrench/scissors icon) — "Create a new form by using the form builder." → `setView("builder")`
- Form list table: Name (sort chevron) | Send automatically (info icon) | `...` column
- Form rows: file icon + name
  - Attach Other Documents, Cancellation Policy, Consent for Internet Communications, Credit Card Authorization Form, Dental History Form, Dental Insurance Verification Form, Driver License Form, HIPAA Notice, Medical History Form, Patient Information Form
- `...` ellipsis per row → dropdown: Edit details, Preview, Duplicate, Download, Copy to locations, Archive
- Click outside to close dropdown

**Form Builder** (`view === "builder"` — full-page overlay):
- Fixed inset-0, z-50, white background
- Top bar: "Form Builder" title | right: "Save and exit" teal button + X (both → `setView("manage")`)
- Below top bar — config row: "Select a Template" dropdown | "Document Type" dropdown | "Display Type: Wizard" dropdown | "Title" text input (default "New Form Title")
- Two-column layout:
  - **Left panel** (fixed ~200px): "Questions" header; items with icons: `>_` Text Field, `A` Text Area, `@` Email, `#` Number, Phone Number, Checkbox, Select Boxes, Dropdown, Signature, Date
  - **Right canvas**: Page tabs ("Page 1" dark pill + "+ Page" teal link); Page 1 section with dashed "Drag and Drop a form component" placeholder
- Save and exit saves form name, returns to manage view

**Digitize upload modal** (`view === "digitize"` — centered modal overlay):
- White modal, max-w-md, rounded-2xl
- "Upload your forms" title + X close
- Description: "Upload your documents to digitize them. We support PDF, JPG, PNG, DOC, and DOCX files up to 10MB each."
- Upload zone: dashed border, upload arrow icon, "Drag and drop files here", "or click to browse from your computer", "Select Files" outlined button
- Footer: "Cancel" teal text link + "Continue" outlined button (disabled until file selected)

### 4. `PlaceholderView` helper
```tsx
function PlaceholderView({ title }: { title: string }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-500">Coming soon.</p>
    </div>
  );
}
```

## Sample form data
```ts
const MANAGE_FORMS = [
  "Attach Other Documents", "Cancellation Policy",
  "Consent for Internet Communications", "Credit Card Authorization Form",
  "Dental History Form", "Dental Insurance Verification Form",
  "Driver License Form", "HIPAA Notice",
  "Medical History Form", "Patient Information Form",
];
```

## Files to modify
| File | Change |
|---|---|
| `src/app/App.tsx` | NAV_ITEMS update, new imports, `FormsSection` + sub-views, `PlaceholderView`, routing extension |

## Verification
1. Forms, Payments, Verification appear as standalone nav items; Scheduling only has Waitlist + Online booking
2. Clicking Forms → patient submission table with tabs and status badges
3. "Manage forms" → Manage Forms page with form list and `...` dropdown
4. "New form ∨" → Digitize / Build dropdown; Build opens full-page builder; Digitize opens upload modal
5. Form Builder shows Questions sidebar + drag-and-drop canvas + Save and exit returns to Manage Forms
6. Digitize modal: file upload zone + disabled Continue until file interaction
7. Payments and Verification show placeholder pages

---

# Plan: Move Unarchive Button to Archived List

## Context
The "Unarchive patient" button currently lives inside the slide-out panel header. The user wants it removed from the panel and placed directly in the archived patients list page, next to each row — so the action is taken from the list without needing to open the panel.

## Changes (all in `src/app/App.tsx`)

### 1. `ArchivedPatientsView` — add `onUnarchive` prop + button per row
- Add prop: `onUnarchive: (id: string) => void`
- Add a third column (no header text) to the table, right-aligned
- Each row gets an **"Unarchive patient"** outlined button: `border border-pink-400 text-pink-600 rounded-lg px-3 py-1.5 text-sm hover:bg-pink-50`
- Clicking the button calls `onUnarchive(patient.id)` and **stops row click propagation** so the slide panel doesn't open at the same time
- Wire `onUnarchive` in `PatientsSection`: `setPatients(prev => prev.map(p => p.id === id ? { ...p, archived: false } : p))`

### 2. `PatientSlidePanel` header — remove the standalone "Unarchive patient" button
- Delete the `{patient.archived && <button>Unarchive patient</button>}` block from the header
- Keep the pink **"Archived"** badge next to the name — it's still useful visual context in the panel
- Keep "Unarchive patient" / "Archive patient" in the Actions dropdown (it's already there and still useful when panel is open)

### 3. `PatientsSection` — pass `onUnarchive` down
```tsx
<ArchivedPatientsView
  patients={patients}
  onOpenPanel={onOpenPanel}
  onBack={() => setView("list")}
  onUnarchive={(id) => setPatients(prev => prev.map(p => p.id === id ? { ...p, archived: false } : p))}
/>
```

## Files to modify
| File | Change |
|---|---|
| `src/app/App.tsx` | `ArchivedPatientsView` gets `onUnarchive` prop + button column; `PatientSlidePanel` header loses standalone unarchive button; `PatientsSection` passes `onUnarchive` |

## Verification
1. Navigate to Patients → "View archived patients"
2. Each archived row has an "Unarchive patient" pink outlined button on the right
3. Clicking it removes the patient from the archived list immediately (they reappear in the active list)
4. Row click still opens the slide panel (button click does not)
5. Slide panel no longer shows a standalone "Unarchive patient" button — only the Actions dropdown item remains

---

# Plan: Patient Slide Panel

## Context
Clicking any patient anywhere in the app (home appointment table rows, patient list rows) should open a right-side slide-out drawer showing rich patient info — replacing the current full-page `PatientDetailView` navigation for quick access. The panel shows a patient header, collapsible info sections, history/messages/appointments tabs, and an "Actions" dropdown that opens two nested modals: "Edit patient info" and "Edit notification preferences."

## What the references show

| Screenshot | Key details |
|---|---|
| **Patient_Card.png** | Right-side drawer — avatar + name + DOB·gender + email + phone + Language; "Actions ∨" button + X close top-right; 4 collapsible accordion sections (Insurance Eligibility → Pending, Forms → No outstanding, Upcoming appointment → None, Payments → $130.40 not requested with orange "Not requested" badge); History/Messages/Appointments tab bar + "Filter by ∨"; history items with dollar icon, description, date, "See details" button |
| **Edit_info_button.png** | "Actions ∨" dropdown menu: Request forms, Collect payment, **Edit patient info** (highlighted), Manage payment methods, Notification preferences, Archive patient (grayed) |
| **Edit_patient_info_modal.png** | "Edit patient info" modal — locked fields (gray bg + lock icon): First name, Last name, Date of birth, Address; editable fields: Preferred name, Gender (select), Primary phone, Email, Preferred language (select); teal Save + Cancel |
| **Edit_patient_notification_preferences.png** | "Edit notification preferences" modal — Email/SMS master toggles (both on); Appointments section expanded with Email+SMS checkboxes for 13 sub-types (all checked); Patient section collapsed; teal Save + Cancel |

## Architecture

### State additions in `App`
```ts
const [panelPatient, setPanelPatient] = useState<Patient | null>(null);
```
- `panelPatient !== null` → panel renders as fixed right drawer
- Pass `onOpenPanel: (p: Patient) => void` down to `HomeDashboard` and `PatientsSection`

### Cross-referencing appointments → patients
Add a `patientId` field to `Appointment` type and `INITIAL_APPOINTMENTS` data so panel can look up the full `Patient` from the `patients` array.
```ts
// In AppointmentsTable, on row click:
const fullPatient = patients.find(p => p.id === appt.patientId);
if (fullPatient) onOpenPanel(fullPatient);
```

Pass `patients` array into `AppointmentsTable` props (already available in `HomeDashboard`).

### Patient list rows
In `PatientsListView`, change `onSelect` row click to call `onOpenPanel(patient)` instead of navigating to full detail view.

## Components to build

### 1. `PatientSlidePanel` (fixed right drawer)
- Position: `fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-40 flex flex-col`
- Semi-transparent backdrop: `fixed inset-0 bg-black/20 z-30` — clicking closes panel
- Slide animation: CSS transition on `translateX` via `translate-x-0` / `translate-x-full`
- **Header section:**
  - Gray rounded-lg avatar (initials), bold name, DOB · Gender, email, phone, "Language: English"
  - "Actions ∨" button (outlined, teal border on hover) + X close button
- **Actions dropdown** (rendered relative to button):
  - Request forms
  - Collect payment
  - Edit patient info → opens `EditPatientInfoModal`
  - Manage payment methods
  - Notification preferences → opens `EditNotificationPreferencesModal`
  - Archive patient (grayed — `text-gray-400 cursor-not-allowed`)
  - Click outside to dismiss
- **Accordion sections** (4 collapsible items, each with chevron toggle):
  1. Insurance Eligibility → "Pending" with gray "Pending" badge
  2. Forms → "No outstanding form requests"
  3. Upcoming appointment → "No upcoming appointments"
  4. Payments → "$130.40 not requested (family)" + orange "Not requested" badge
- **Tab bar**: History | Messages | Appointments + "Filter by ∨" right-aligned
- **History tab content**: list items with teal dollar-circle icon, description text ("Submitted a payment of $100.00"), timestamp ("Dec 3, 2024 · 12:06 PM"), "See details" outlined button

### 2. `EditPatientInfoModal` (centered modal, z-50)
- White panel, max-w-sm, rounded-2xl, shadow-2xl
- Header: "Edit patient info" + X close
- **Locked fields** (gray bg `#f3f4f6`, lock icon on right, `pointer-events-none`): First name, Last name, Date of birth, Address
- **Editable fields**: Preferred name (text input), Gender (select), Primary phone (tel input), Email (email input), Preferred language (select)
- Teal Save button + "Cancel" teal text link
- Save updates `patients` state via `setPatients`

### 3. `EditNotificationPreferencesModal` (centered modal, z-50)
- Header: "Edit notification preferences" + X close
- **Notification methods** section:
  - Descriptive text (2 paragraphs)
  - Email toggle (teal, on) + label; SMS toggle (teal, on) + label
- **Notification type** section — Appointments accordion (expanded by default, teal left border):
  - Column headers: Email | SMS
  - 13 rows, each with checkbox pair: Cancelled, Continuing Care Recalls, Form reminders, Form requests, Missed, NexHealth Appointment Confirmed, NexHealth Appointment Request, NexHealth Appointment Rescheduled, Recalls, Reminders, Reviews, Save the Date, Waitlist
  - All checked by default
- Patient accordion (collapsed by default) with Email+SMS checkboxes
- Teal Save + "Cancel"

## Props changes

| Component | Change |
|---|---|
| `App` | Add `panelPatient` state; pass `onOpenPanel` + `patients` into `HomeDashboard` and `PatientsSection` |
| `HomeDashboard` | Accept `patients`, `onOpenPanel`; pass both into `AppointmentsTable` |
| `AppointmentsTable` | Accept `patients`, `onOpenPanel`; make `<tr>` clickable |
| `PatientsSection` | Accept `onOpenPanel`; pass into `PatientsListView` |
| `PatientsListView` | Accept `onOpenPanel`; call it on row click instead of `onSelect` |

## Files to modify
| File | Change |
|---|---|
| `src/app/App.tsx` | All of the above — new state, new components, updated props wiring |

## Verification
1. Clicking an appointment row on the home screen slides the panel in from the right
2. Clicking a patient row in the Patients list slides the same panel
3. Panel X and backdrop click both close it
4. Actions dropdown shows all 6 items; Archive is grayed
5. "Edit patient info" opens the edit modal; Save updates the patient; Cancel dismisses
6. "Notification preferences" opens the prefs modal with toggles + checkboxes
7. Accordion sections expand/collapse independently
8. History/Messages/Appointments tabs switch content
9. No TypeScript errors

---

# Plan: Patients Navigation Tab

## Context
Clicking "Patients" in the sidebar should navigate to a full Patients section. Four reference screenshots were provided: the patient list, the "Create patient" modal, an archived patient profile, and a sync-status tooltip. All views live within the existing single-page layout (no router needed) — the active nav state in `App` already drives which content area renders.

## What the references show

| Screenshot | Key details |
|---|---|
| **Patients.png** | List page — bold "Patients" heading, teal "View archived patients" link, outlined "Create patient" button; table with Name (count) + Contact columns; gray rounded avatar with initials, name bold, DOB below; cloud icon on some rows (not synced); redacted phone `(***) ***-****` |
| **Create_patient_info_modal.png** | Modal — "Create new patient" title + X close; yellow warning banner "⚠️ This does not create a patient in your health record system"; fields: First name, Last name, Gender (select), Email (with lock icon), Phone, Provider (select), Date of birth (MM/DD/YYYY), Preferred language (select); teal "Save" button + teal "Cancel" text link |
| **archived_image.png** | Patient detail (archived) — "← Back" teal link; avatar + name + pink-bordered "Archived" badge + cloud icon; DOB · Gender below; "Unarchive patient" outlined button top-right; info card: blurred name/email, Phone numbers (Primary label), Preferred language |
| **sync_patient.png** | Tooltip on cloud icon — "This patient was created in NexHealth and is not synced to your health record system" |

## New types to add (in App.tsx)

```ts
type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;           // "Jan 7th, 1977"
  gender: string;
  email: string;
  phone: string;
  provider: string;
  language: string;
  initials: string;
  synced: boolean;       // false → show cloud icon with tooltip
  archived: boolean;
};
```

## State to add in `App`

```ts
const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
const [patientView, setPatientView] = useState<"list" | "archived" | "detail">("list");
const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
const [showCreateModal, setShowCreateModal] = useState(false);
```

`activeNav === "patients"` renders `<PatientsSection>` instead of the home dashboard. Pass all patient state + setters as props.

## Components to build (all in App.tsx)

### 1. `PatientsSection` (router shell)
Switches between `PatientsListView`, `ArchivedPatientsView`, and `PatientDetailView` based on `patientView`.

### 2. `PatientsListView`
- Header row: bold "Patients" h1 + right side: teal "View archived patients" text button + outlined "Create patient" button
- White card with table:
  - Columns: **Name (N)** | **Contact**
  - Each row: gray rounded-lg avatar (initials), bold patient name, DOB below; cloud icon (unsynced indicator with tooltip on hover); contact column shows redacted phone + email
  - Hover state on row → slight bg highlight + row is clickable → opens `PatientDetailView`
- On "Create patient" → opens `CreatePatientModal`
- On "View archived patients" → switches to `ArchivedPatientsView`

### 3. `ArchivedPatientsView`
- Same layout as `PatientsListView` but filtered to `patient.archived === true`
- Header: "Archived patients" with "← Back to patients" teal link
- Rows show "Archived" pink badge next to name instead of cloud icon

### 4. `PatientDetailView`
- "← Back" teal link (returns to list or archived view)
- Top section (white card):
  - Left: large avatar (gray rounded-lg), name (bold large), optional pink-outlined "Archived" badge, optional cloud icon with hover tooltip
  - DOB · Gender subline
  - Right: "Unarchive patient" outlined button (only if `patient.archived`)
- Info card below:
  - Blurred email/name area on left (privacy)
  - "Phone numbers" section with number + "Primary" badge
  - "Preferred language" section

### 5. `CreatePatientModal`
- Fullscreen overlay with centered white modal panel
- Header: "Create new patient" + X close button
- Yellow warning banner with ⚠️ icon
- Form fields (all controlled):
  - `<input>` — First name, Last name, Phone
  - `<select>` — Gender, Provider, Preferred language
  - Email `<input>` with lock icon (🔒) inside field
  - Date of birth `<input type="text" placeholder="MM/DD/YYYY">`
- "Save" → creates new patient in `patients` state, closes modal
- "Cancel" → closes modal without saving

### 6. `SyncTooltip` (small reusable)
Cloud icon button that shows a tooltip bubble on hover: "This patient was created in NexHealth and is not synced to your health record system"

## Sample patient data (INITIAL_PATIENTS)
Include ~8 patients mixing synced/unsynced and one archived:
- Benjamin Sisko — synced, active
- Beverly Crusher — unsynced (cloud icon), active
- Jane Doe — archived
- + 5 more Simpsons/familiar names

## Files to modify
| File | Change |
|---|---|
| `src/app/App.tsx` | Add `Patient` type, patient state, `PatientsSection` + all sub-components, wire activeNav |

## Verification
1. Clicking "Patients" in sidebar renders the patient list page
2. Patient rows are clickable → detail view opens
3. "← Back" returns to list
4. Cloud icon hover shows tooltip
5. "View archived patients" → archived list; rows show Archived badge
6. "Create patient" opens modal; Save adds patient to list
7. "Unarchive patient" button removes archived flag and returns to list

---

# Plan: Appointment Status Change (addendum)

## Context
Users need to change appointment status directly from the home screen table (and eventually patient profile). The status badge in each table row becomes a clickable dropdown that shows only the allowed next states based on a strict transition ruleset.

### Transition rules
| Current status | Allowed transitions |
|---|---|
| Unconfirmed | Confirmed, Checked-In, Cancelled |
| Confirmed | Checked-In, Cancelled |
| Checked-In | Cancelled |
| Cancelled | *(none — badge is read-only)* |

## What changes in `src/app/App.tsx`

### 1. Extend the `Appointment` type
Add `"cancelled"` to the status union:
```ts
status: "checked-in" | "confirmed" | "unconfirmed" | "cancelled"
```

### 2. Lift appointment state into `AppointmentsTable` → move to `App`
Currently `APPOINTMENTS` is a module-level const. Move it into `useState` inside `App` so status updates propagate everywhere. Pass `appointments` + `onStatusChange` down as props.

### 3. Add `ALLOWED_TRANSITIONS` map
```ts
const ALLOWED_TRANSITIONS: Record<Appointment["status"], Appointment["status"][]> = {
  unconfirmed: ["confirmed", "checked-in", "cancelled"],
  confirmed:   ["checked-in", "cancelled"],
  "checked-in": ["cancelled"],
  cancelled:   [],
};
```

### 4. `StatusBadge` becomes `StatusDropdown`
- Renders the colored pill as before.
- If `ALLOWED_TRANSITIONS[status].length === 0` (cancelled), render a plain non-interactive badge.
- Otherwise render a `<button>` pill that toggles a small popover below it.
- Popover lists each allowed transition as a row with its own color-coded pill preview + label.
- Clicking a row calls `onStatusChange(appointmentId, newStatus)` and closes the popover.
- Clicking outside closes the popover (same `useEffect` + `ref` pattern already used by `GlobalSearch` and `LocationPicker`).

### 5. `StatusBadge` styling additions
Add a "cancelled" visual style:
```tsx
// cancelled
<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">
  Cancelled <XCircle size={11} />
</span>
```

The interactive pill gets a subtle `ChevronDown` icon on the right side and a hover ring so it's obviously clickable.

### 6. Wire `onStatusChange` in `App`
```ts
const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);

function handleStatusChange(id: string, status: Appointment["status"]) {
  setAppointments((prev) =>
    prev.map((a) => (a.id === id ? { ...a, status } : a))
  );
}
```

Pass `appointments` and `handleStatusChange` into `AppointmentsTable`, which passes `onStatusChange` + `appointmentId` into each `StatusDropdown`.

## Files to modify
| File | Change |
|---|---|
| `src/app/App.tsx` | All changes above — type extension, state lift, transition map, StatusDropdown, App wiring |

## Verification
1. Each status badge in the table is clickable (except Cancelled).
2. Dropdown shows only the correct allowed next states per the ruleset.
3. Selecting a status updates the badge in the row immediately.
4. Cancelled rows show a non-interactive red badge.
5. Tab counts (All / Confirmed / Unconfirmed) recompute after any status change.

---

# Plan: NexHealth-style Healthcare Practice Management Dashboard

## Context
The user wants a home page UI similar to NexHealth.com — a healthcare practice management SaaS. Two reference images were provided showing the full dashboard layout and a zoomed-in table view. The goal is to faithfully reproduce the UI as a working React component.

## Aesthetic Stance
**Swiss** — clean grid, mostly neutrals with strategic accent colors (pink/magenta for stats, teal/blue for interactive banners), functional hierarchy. No gratuitous decoration.

**Fonts**: Inter (body + UI) — clean humanist sans, standard for SaaS dashboards. Load from Google Fonts via `src/styles/fonts.css`.

**Palette**:
- Background: `#f9f9fb` (light gray page ground)
- Sidebar: `#ffffff` with left border
- Primary: `#1a1a2e` (near-black nav)
- Active nav: dark pill/block
- Accent teal: `#0ea5e9` (interactive elements, banner)
- Accent pink/magenta: stat card top borders (Cards use `#e879f9`, `#38bdf8`, `#fb7185`)
- Card background: `#ffffff`
- Border: `rgba(0,0,0,0.08)`

## Layout Structure

```
┌──────────────────────────────────────────────────┐
│  Top bar (search, practice name, icons)          │
├──────────┬───────────────────────────────────────┤
│  Sidebar │  Main content                         │
│  (200px) │  - Stat cards (3 cols)                │
│          │  - Date nav + "Today"                 │
│  Home    │  - Open slots banner                  │
│  Activity│  - Tabs + filter                      │
│  Patients│  - Appointments table                 │
│  ...     │                                       │
└──────────┴───────────────────────────────────────┘
```

## Components to Build (all in App.tsx)

### 1. TopBar
- Hamburger icon (Menu from lucide)
- Avatar circle (initials "N")
- Search field: "Search patients" with `⌘K` badge
- Practice name: "NexHealth Payments Academy" with dropdown chevron and location pin icon
- Settings gear icon
- User icon

### 2. Sidebar
- Logo/brand area at top
- Nav items with icons:
  - Home (active — dark background pill)
  - Activity
  - Patients
  - Templates
  - **Communications** (expandable, default open, sub-items: Messages, Campaigns, Reminders, Recalls, Reviews)
  - **Scheduling** (expandable, default open, sub-items: Waitlist, Online booking, Forms)
  - Payments
- Use `useState` for expand/collapse of Communications and Scheduling sections
- Active state via `useState` tracking current nav item

### 3. Stat Cards (3 across)
- Each card has:
  - Colored top border (3px, different color per card)
  - Bold number + label on left
  - Icon (calendar/circle check) on right with matching tint
  - Subtitle "Last 90 days"
  - Description line
- Cards: "2 Appointments confirmed", "31 New patients", "87 Appointments booked online"

### 4. Date Navigation + Banner
- `<` `>` arrows + "Today" heading
- Teal banner: "You have **6 open slots** in the next 5 days. Fill open slots in minutes by sending a waitlist request." + "Fill open slots →" right-aligned CTA
- Teal left border accent on banner, light blue background

### 5. Appointment Table
- **Tabs**: All (11), Confirmed (0), Unconfirmed (3) — with `useState` for active tab
- Right side: "Filter patients" search input + "Filter by ∨" dropdown button
- Table columns: Time | Status | Patient | Contact | Details | Insurance | Forms | (overflow menu)
- Status badge: "Checked in ✓" in green pill
- Patient rows with avatar circle (initials, colored), name, DOB
- Contact: phone + email (blurred/redacted for Marge)
- Insurance column: clock icon (pending)
- Forms column: check circle icon (completed)
- Overflow: `⋮` three-dot menu, `ⓘ` info icon
- Sample data: Homer Simpson, Marge Simpson, Bart Simpson (from reference)

## Files to Modify

| File | Change |
|------|--------|
| `src/styles/fonts.css` | Add Inter Google Fonts import |
| `src/styles/theme.css` | Update tokens (background, primary, accent colors, radius) |
| `src/app/App.tsx` | Full component implementation |

## Token Updates (theme.css)
```css
--background: #f4f5f7;
--foreground: #111827;
--card: #ffffff;
--primary: #111827;
--primary-foreground: #ffffff;
--muted: #f3f4f6;
--muted-foreground: #6b7280;
--border: rgba(0,0,0,0.09);
--accent: #eff6ff;
--accent-foreground: #1d4ed8;
--radius: 0.5rem;
```

## Interactive State
- Sidebar: active nav item highlighted, expand/collapse for Communications and Scheduling
- Appointment tabs: All / Confirmed / Unconfirmed switching
- Stat card icons: decorative
- Banner CTA: hover state
- Table rows: hover highlight

## Verification
1. Visual match to reference images — sidebar layout, stat cards, table structure
2. Sidebar expand/collapse works for Communications and Scheduling
3. Appointment tab switching (All/Confirmed/Unconfirmed) filters or changes active tab
4. Responsive: at <1024px sidebar collapses, cards stack
5. No TypeScript errors, no broken imports
