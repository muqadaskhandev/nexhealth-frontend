import { useEffect, useState } from "react";
import { staffApi } from "../../lib/staff-api";

export function CommunicationsSection() {
  const [messages, setMessages] = useState<
    { id: string; patient_name: string; body: string; channel: string; sent_at: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    staffApi.messages
      .list()
      .then(setMessages)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-6 py-5 space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Communications</h1>
      <p className="text-sm text-gray-500">Messages, reminders, and patient engagement.</p>
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="text-left px-5 py-3 font-semibold">Patient</th>
                <th className="text-left px-5 py-3 font-semibold">Message</th>
                <th className="text-left px-5 py-3 font-semibold">Channel</th>
                <th className="text-left px-5 py-3 font-semibold">Sent</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium">{m.patient_name}</td>
                  <td className="px-5 py-3 text-gray-600">{m.body}</td>
                  <td className="px-5 py-3 uppercase text-xs text-gray-500">{m.channel}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {new Date(m.sent_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
