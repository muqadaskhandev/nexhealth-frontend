import { useEffect, useState } from "react";
import { staffApi } from "../../lib/staff-api";

export function PaymentsSection() {
  const [payments, setPayments] = useState<
    {
      id: string;
      patient_name: string;
      amount: string;
      description: string;
      status: string;
      created_at: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    staffApi.payments
      .list()
      .then(setPayments)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-6 py-5 space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
      <p className="text-sm text-gray-500">Payment links and collection status.</p>
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="text-left px-5 py-3 font-semibold">Patient</th>
                <th className="text-left px-5 py-3 font-semibold">Amount</th>
                <th className="text-left px-5 py-3 font-semibold">Description</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium">{p.patient_name}</td>
                  <td className="px-5 py-3">${p.amount}</td>
                  <td className="px-5 py-3 text-gray-600">{p.description}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                      {p.status}
                    </span>
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
