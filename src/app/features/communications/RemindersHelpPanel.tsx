import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

const FAQ: { q: string; a: string }[] = [
  {
    q: "How do I exclude a specific operatory or provider from Reminders?",
    a: "Contact NexHealth Support. If your appointment types are provider- or operatory-specific, you can also do this yourself by toggling off the reminder template for the relevant appointment types.",
  },
  {
    q: "How do I change the message in a confirmation text?",
    a: "You cannot change the message in a confirmation text from NexHealth.",
  },
  {
    q: "How do I add a reminder for a new provider?",
    a: "You typically don't need to. Reminders are configured per appointment type, and the new provider's appointments will automatically use whichever reminder applies to the appointment type they're booked under. The exception: if your appointment types are provider-specific, new appointment types will need to be added for the new provider, which will then appear on the Reminders page where you can configure them.",
  },
  {
    q: "Do I need to update reminders when I add a new operatory?",
    a: "No. Reminders are configured per appointment type, not per operatory.",
  },
  {
    q: "Can I send different reminders to patients of different providers?",
    a: "Only if your appointment types are configured per-provider. If they're not, all providers' patients receive the same reminder for a given appointment type.",
  },
  {
    q: "How do I include the provider's name in a reminder message?",
    a: "Use provider smart commands to insert first, last, full, or short name. This personalizes content but doesn't change which reminder sequence is sent.",
  },
  {
    q: "Why didn't a patient receive their reminder?",
    a: "Common causes: reminder template toggled off, patient opted out, missing/invalid contact info, appointment booked after the send window, or the Reminder was scheduled outside template sending hours (blocked reminders do not queue).",
  },
  {
    q: "Can I send all reminders at the same time of day?",
    a: "No. Reminders will always send relative to the appointment time, so you can't have all reminders for the day send at the beginning of the day. But you can have all reminders send one day before the appointment time exactly (e.g. a 3pm appointment will receive a reminder the day before at 3pm).",
  },
  {
    q: "Is it possible to send all my reminders first thing in the morning?",
    a: "No. Reminders will send in relation to the appointment time; it is not possible for all reminders for the day to go out at the same time.",
  },
];

const BEST_PRACTICES = [
  "Be sensitive to patients' preferences. Many patients do not appreciate receiving too many reminders. Avoid over-messaging your patients.",
  "Consider whether your population prefers SMS messages or emails, and choose one or the other for one or more of the sequences.",
  "Include your cancellation policy in email reminders. Call attention to it by using bold, bright text.",
  "Keep your message concise. Patients will not read long messages, especially in a text.",
  "Allow patients to cancel and reschedule right from the reminder to streamline the experience for you and them.",
];

export function RemindersHelpPanel() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">How reminders work in NexHealth</h2>
        <div className="text-sm text-gray-600 space-y-3 leading-relaxed">
          <p>
            Reminders are configured at the <strong className="font-semibold text-gray-800">appointment type</strong>{" "}
            level — not at the provider, operatory, or location level directly.
          </p>
          <p>
            However, because <strong className="font-semibold text-gray-800">appointment types can be defined by
            provider or by operatory</strong>, your reminder configuration may be indirectly provider-specific or
            operatory-specific depending on how your appointment types are set up.
          </p>
          <p>
            If your appointment types are defined by provider, each provider&apos;s appointment types can have their
            own reminder sequence. If they&apos;re defined by operatory, same applies for operatories. If they&apos;re
            generic, all appointments of that type receive the same reminder regardless of provider or operatory.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Overview</h2>
        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <h3 className="font-semibold text-teal-700 mb-1.5">Edit reminders</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-600">
              <li>Go to Reminders → select an Appointment type to edit.</li>
              <li>Edit the Reminder sequence.</li>
              <li>Click Preview to review the message from the patient&apos;s perspective.</li>
              <li>Click Save and exit.</li>
              <li>Toggle on the reminders template to activate.</li>
            </ol>
          </div>
          <div>
            <h3 className="font-semibold text-teal-700 mb-1.5">
              Send reminders by patient confirmation status
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-600">
              <li>Select +Add additional sequence.</li>
              <li>Select your desired send condition.</li>
              <li>Edit branched message streams based on confirmation status.</li>
            </ol>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          How do I send early-morning reminders?
        </h2>
        <p className="text-sm text-gray-600 mb-3">
          Adjust sending hours or Reminder templates so early appointments still get a message.
        </p>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 mb-4 space-y-2">
          <p>
            <strong>Reminders do not send outside of the set hours</strong> — reminders that would have
            been sent during those hours do not queue until a suitable time; they{" "}
            <em>just do not go out</em>.
          </p>
          <p className="text-xs">
            Example: 7am appointment + sending hours that start at 6am + Reminder set 2 hours in
            advance (5am) → Reminder is <strong>blocked from sending</strong>.
          </p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 mb-4">
          To change default sending times, go to <strong>Settings → Template configurations</strong>.
          Use the preview and early-morning math tools there.
        </div>
        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <h3 className="font-semibold text-teal-700 mb-1">
              Option 1: Configure a closer send time for Reminders
            </h3>
            <p className="text-xs text-gray-600">
              Change the Reminder send time (Next action tile) to be 1 hour before the appointment.
            </p>
            <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
              Downside: <strong>all appointments</strong> receive Reminders only 1 hour before.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-teal-700 mb-1">
              Option 2: Adjust template send time hours to start 2 hours before your first appointment
            </h3>
            <p className="text-xs text-gray-600">
              Widen sending hours so SMS can go out earlier.
            </p>
            <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
              Downside: <strong>all templates</strong> will send as early as 2 hours before your first
              appointment slot.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-teal-700 mb-1">
              Option 3: Plan 2 send times for Reminders
            </h3>
            <p className="text-xs text-gray-600 mb-2">
              Add a second Reminder timing on the Actions tab:
            </p>
            <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
              <li>
                Set the normal Reminder for ~14 hours prior (if the send window is 12 hours long) so
                early-morning patients get a Reminder the evening before.
              </li>
              <li>Set the extra Reminder to send 2 hours prior for most other patients.</li>
            </ul>
            <p className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-xs text-indigo-950">
              Doing the math: (Difference between prior evening end of send times and earliest
              appointment time slot) + 2 hr. Example: send times 7am–9pm, earliest appt 8am → (11 hr) +
              2 hr = set for 13 hours prior.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Best practices for sending reminders</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
          {BEST_PRACTICES.map((item) => (
            <li key={item.slice(0, 24)}>{item}</li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">FAQ</h2>
        <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-white">
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-start gap-2 px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
                >
                  {isOpen ? (
                    <ChevronDown size={16} className="mt-0.5 shrink-0 text-gray-400" />
                  ) : (
                    <ChevronRight size={16} className="mt-0.5 shrink-0 text-gray-400" />
                  )}
                  {item.q}
                </button>
                {isOpen && (
                  <p className="px-4 pb-3 pl-10 text-sm text-gray-600 leading-relaxed">{item.a}</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
        SMS messages are limited to 425 characters. Emojis and some special characters count as two characters,
        so the character limit is less when those are used.
      </div>
    </div>
  );
}
