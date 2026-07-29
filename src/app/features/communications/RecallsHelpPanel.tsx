import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

const FAQ: { q: string; a: string }[] = [
  {
    q: "What is the difference between Recall, Recare, and Continuing care?",
    a: 'NexHealth predominantly uses "Recall." Your practice or health record system may use "Recare" or "Continuing care." All three refer to reminders to get patients to schedule appointments for continuing care.',
  },
  {
    q: "Who receives the standard Recalls template?",
    a: "By default it goes out to ANY patient six months to the day after their last appointment if they do not have an upcoming appointment — regardless of original appointment type. Customize by appointment type if you need type-specific sequences.",
  },
  {
    q: "How do Custom continuing care templates differ?",
    a: "Custom templates on the Templates → Custom tab go out based on the due date for the next appointment recorded in your health record (usually Prophy or Perio). They begin the day before the due date, then at 1, 2, 4, 6, 8, 12, 18, and 24 months after if the patient has not booked.",
  },
  {
    q: "Which health records support Custom Recall templates?",
    a: "Custom Recall templates are available for most health record systems NexHealth integrates with, but not all. For Eaglesoft we read the next recall date. For other systems we read due dates associated with common recall appointment types such as Prophy, Perio, Exams, etc. If you do not see the Custom tab content, contact NexHealth Support.",
  },
];

export function RecallsHelpPanel() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          How do I get patients back in office with automated recalls?
        </h2>
        <p className="text-sm text-gray-600 mb-3">
          The recall template is sent automatically when patients are due for care, inviting them to
          book their next appointment.
        </p>
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-sm text-indigo-950 space-y-2">
          <p>
            While NexHealth predominantly uses the term <strong>&quot;Recall,&quot;</strong> your
            practice or health record system may use <strong>&quot;Recare,&quot;</strong> and you may
            also see <strong>&quot;Continuing care.&quot;</strong>
          </p>
          <p>
            All three refer to the same thing: reminders to get patients to schedule appointments for
            continuing care.
          </p>
        </div>
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          If you have purchased Scheduling, the <strong>online booking link</strong> is included in
          these messages so patients can schedule quickly.
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Overview — three ways to recall</h2>
        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <h3 className="font-semibold text-teal-700 mb-1.5">
              Option 1: Activate the standard Recalls template
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-600 text-xs">
              <li>Navigate to Recalls (Communications sidebar).</li>
              <li>Select an Appointment Type sequence, or + Add Recalls Sequence.</li>
              <li>Edit the Recalls sequence as desired (timing, messages, steps).</li>
              <li>Toggle on the sequence and confirm Yes.</li>
            </ol>
            <p className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-950">
              By default it goes out <strong>six months to the day after the patient&apos;s last
              appointment</strong> if they do not have an appointment upcoming.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-teal-700 mb-1.5">
              Option 2: Use the Custom template for continuing care
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-600 text-xs">
              <li>Go to Templates → Custom tab.</li>
              <li>Edit the Recalls / Eveni Recal sequence as desired.</li>
              <li>Toggle on the sequence.</li>
            </ol>
            <p className="mt-2 text-xs text-gray-500">
              Custom templates follow the EHR due date (day before, then 1–24 months overdue).
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-teal-700 mb-1.5">
              Option 3: Use a Campaign template for recall
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-600 text-xs">
              <li>Go to Campaigns → Favorites.</li>
              <li>Search for the recall templated campaign.</li>
              <li>Click the template, then Make a copy.</li>
              <li>Title the campaign and select Locations, then Continue.</li>
              <li>
                Use Continuing care / Appointment filters — select{" "}
                <strong>Do not send to patients with an upcoming appointment</strong>.
              </li>
              <li>Verify patients, then Build &amp; send.</li>
            </ol>
          </div>
        </div>
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
    </div>
  );
}
