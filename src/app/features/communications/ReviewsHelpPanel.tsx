import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

const FAQ: { q: string; a: string }[] = [
  {
    q: "Does NexHealth post reviews to Google for me?",
    a: "No. NexHealth does NOT post directly to Google. Patients who rate 4 or 5 are prompted with a link; they must post the review themselves while logged into Google.",
  },
  {
    q: "When are automated Reviews sent?",
    a: "By default, every evening at 7:30 PM to patients seen that day with completed appointments, once every six months. Edit the Next action tile for timing and the Send to patients tile for frequency.",
  },
  {
    q: "What happens if a patient rates 1, 2, or 3?",
    a: "They are prompted to leave feedback directed into NexHealth only. You can view it in the Activity feed, the patient's history, or the Reviews Performance tab. They are not prompted to leave a Google review.",
  },
  {
    q: "Can I change which ratings get the Google prompt?",
    a: "Contact NexHealth Support. We can adjust the rating(s) prompted to leave a Google review (for example, only 5-star ratings).",
  },
  {
    q: "Why doesn't Preview show the Google review prompt?",
    a: "The Reviews template must be associated with an actual appointment on the schedule. To test, schedule a test appointment, then manually send the review from the NexHealth Home page.",
  },
];

export function ReviewsHelpPanel() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          How do I get more Google reviews with automated text and emails?
        </h2>
        <p className="text-sm text-gray-600 mb-3">
          Use automated reviews to get more Google reviews. Patients rate 1–5; ratings of 4 or 5
          receive a Google review prompt.
        </p>
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950">
          <strong>NexHealth does NOT post directly to Google.</strong> The patient must post their
          review to Google.
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Overview</h2>
        <div className="space-y-5 text-sm text-gray-700">
          <div>
            <h3 className="font-semibold text-teal-700 mb-1.5">Set up Reviews</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-600 text-xs">
              <li>Navigate to Reviews (Communications sidebar).</li>
              <li>Select an Appointment Type sequence, or + Add Reviews Sequence.</li>
              <li>Edit the Reviews sequence (timing, messages, steps, frequency).</li>
              <li>Toggle on the sequence and confirm Yes. You can toggle off anytime.</li>
            </ol>
            <p className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-950">
              Default: <strong>7:30 PM</strong> for completed appointments that day,{" "}
              <strong>once every six months</strong>. Do not remove{" "}
              <code className="bg-white/70 px-1 rounded">INSERTSURVEYRATING</code>.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-teal-700 mb-1.5">
              Opt a patient out of receiving the review message
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-600 text-xs">
              <li>Click the ellipsis to the right of the patient&apos;s name on NexHealth Home.</li>
              <li>Turn off the toggle next to Review (this appointment only).</li>
            </ol>
            <p className="mt-2 text-xs text-gray-500">
              To stop all Reviews forever, change Notification preferences. Patients can also reply
              STOP or stop all.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-teal-700 mb-1.5">
              Contact support to change the rating required for a Google review
            </h3>
            <p className="text-xs text-gray-600">
              Contact NexHealth Support to adjust which ratings (e.g. only 5-star) receive the Google
              prompt.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-teal-700 mb-1.5">Send reviews to narrower audiences</h3>
            <p className="text-xs text-gray-600">
              Customize Reviews by appointment type (Templates → Custom), or contact Support for
              procedure codes / providers. Enable Customize templates by appointment type in Settings.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-teal-700 mb-1.5">Patient review experience</h3>
            <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
              <li>
                <strong>4 or 5:</strong> prompted with a link to leave a review on Google (must be
                logged into Google).
              </li>
              <li>
                <strong>1, 2, or 3:</strong> leave feedback in NexHealth only (Activity, patient
                history, Reviews Performance).
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-teal-700 mb-1.5">Manually sending reviews</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-600 text-xs">
              <li>On Home, open the ellipsis next to a past appointment.</li>
              <li>Choose Send a manual template → Review.</li>
              <li>Click Send — the review template sends immediately.</li>
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
