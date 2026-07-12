import { useEffect, useState } from "react";
import { staffApi } from "../../lib/staff-api";

export function WaitlistSection() {
  const [entries, setEntries] = useState<
    {
      id: string;
      patient_name: string;
      provider_name: string;
      appointment_type: string;
      notes: string;
      status: string;
    }[]
  >([]);

  useEffect(() => {
    staffApi.waitlist().then((rows) => setEntries(rows as typeof entries));
  }, []);

  return (
    <div className="px-6 py-5 space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Waitlist</h1>
      <p className="text-sm text-gray-500">Fill last-minute openings from the waitlist.</p>
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className="text-left px-5 py-3 font-semibold">Patient</th>
              <th className="text-left px-5 py-3 font-semibold">Provider</th>
              <th className="text-left px-5 py-3 font-semibold">Type</th>
              <th className="text-left px-5 py-3 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium">{e.patient_name}</td>
                <td className="px-5 py-3">{e.provider_name}</td>
                <td className="px-5 py-3">{e.appointment_type}</td>
                <td className="px-5 py-3 text-gray-600">{e.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
