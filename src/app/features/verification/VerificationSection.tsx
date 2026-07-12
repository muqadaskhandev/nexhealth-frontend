import { useEffect, useState } from "react";
import { staffApi } from "../../lib/staff-api";

export function VerificationSection() {
  const [patients, setPatients] = useState<
    { id: string; full_name: string; insurance_data: Record<string, unknown> }[]
  >([]);

  useEffect(() => {
    staffApi.patients.list().then((rows) =>
      setPatients(
        rows.map((p) => ({
          id: p.id,
          full_name: p.full_name,
          insurance_data: p.insurance_data,
        }))
      )
    );
  }, []);

  async function verify(patientId: string) {
    const updated = await staffApi.patients.verifyInsurance(patientId);
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patientId
          ? { ...p, insurance_data: updated.insurance_data }
          : p
      )
    );
  }

  return (
    <div className="px-6 py-5 space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Insurance Verification</h1>
      <p className="text-sm text-gray-500">Verify patient insurance eligibility.</p>
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className="text-left px-5 py-3 font-semibold">Patient</th>
              <th className="text-left px-5 py-3 font-semibold">Status</th>
              <th className="text-right px-5 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium">{p.full_name}</td>
                <td className="px-5 py-3 capitalize text-gray-600">
                  {String(p.insurance_data?.status ?? "unknown")}
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => verify(p.id)}
                    className="text-sm font-semibold text-teal-600 hover:text-teal-700"
                  >
                    Verify now
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
