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
    a: "They are prompted to leave feedback directed into NexHealth only. You can view it in the Activity feed, the patient's history, or the Reviews Performance tab. Negative feedback is managed privately and does not reach Google.",
  },
  {
    q: "How do I analyze reviews and follow up with patients?",
    a: "Go to Reviews → Performance. Click a patient's name to see their rating and any feedback so you can address it directly in conversation.",
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
    <div className="max-w-2xl mx-auto space-y-10">
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
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          How do I boost my Google ranking and improve my reputation?
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Learn how to boost your reputation and improve your Google ranking. Customers may leave
          feedback either publicly for a positive review, or privately for a negative review.
        </p>

        <h3 className="font-semibold text-teal-700 mb-2 text-sm">Use feedback from reviews</h3>

        <div className="space-y-4 text-sm text-gray-700 mb-6">
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Positive reviews</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              If a patient had a great experience and rates it as a <strong>4 or 5</strong>, they
              will be prompted with a link to leave a review directly on your Google Business page.
              This way, positive experiences are shared publicly, helping to boost your reputation.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Negative reviews</h4>
            <p className="text-xs text-gray-600 leading-relaxed mb-2">
              If a patient did not have a great experience and rates it as a{" "}
              <strong>1, 2, or 3</strong>, they will be asked to leave feedback,{" "}
              <strong>which is shared only within NexHealth</strong>.
            </p>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-950">
              This allows you to handle negative feedback in a more controlled manner.
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">
              Analyze reviews — Reviews → Performance
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              You and your staff can view these reviews in your NexHealth dashboard by navigating to{" "}
              <strong>Reviews</strong>, then selecting <strong>Performance</strong>. Clicking on the
              patient&apos;s name allows you to see their rating and view any feedback, so you can
              address it directly in a conversation with the patient. This way, negative feedback is
              managed privately and does not reach Google.
            </p>
          </div>
        </div>

        <h3 className="font-semibold text-teal-700 mb-2 text-sm">Best practices for reviews</h3>
        <p className="text-xs text-gray-600 leading-relaxed mb-3">
          The goal of NexHealth Reviews is to make handling feedback easier and to boost your
          reputation by publicly promoting positive experiences and privately managing negative ones.
        </p>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-950 mb-4 leading-relaxed">
          In general, while <strong>70%</strong> of patients look to online reviews to help them
          decide how to choose a provider, <strong>only 10%–15%</strong> of patients industry-wide
          leave reviews, and are most likely to do so only after a very positive or very negative
          experience.
        </div>
        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Ask happy patients to leave reviews.</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              The <strong>MOST</strong> effective way to increase your reviews is to let happy
              patients know how much you appreciate them leaving a review about their experience and{" "}
              <strong>ASK</strong> them to leave a review.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">
              Let patients know you&apos;d appreciate a rating and post to Google.
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Explain to patients that they will receive a message asking them to rate their
              experience from 1–5, and then a prompt to post to Google. Let them know you&apos;d
              appreciate it if they do both.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Setup overview</h2>
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
