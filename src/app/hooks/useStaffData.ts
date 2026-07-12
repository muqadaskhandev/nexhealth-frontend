import { useCallback, useEffect, useState } from "react";
import type { Appointment, AppointmentStatus, Patient } from "../types";
import { mapAppointment, mapPatient, staffApi } from "../lib/staff-api";

export function useStaffData(enabled: boolean) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const [pRows, aRows] = await Promise.all([
        staffApi.patients.list(),
        staffApi.appointments.list(),
      ]);
      setPatients(pRows.map(mapPatient));
      setAppointments(aRows.map(mapAppointment));
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr?.detail || "Could not load staff data.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const savePatient = useCallback(
    async (updated: Patient) => {
      const body = {
        first_name: updated.firstName,
        last_name: updated.lastName,
        preferred_name: updated.preferredName,
        email: updated.email,
        phone: updated.phone,
        gender: updated.gender,
        address: updated.address,
        language: updated.language,
        provider_name: updated.provider,
        archived: updated.archived,
        insurance_data: updated.insuranceData,
        notification_prefs: {},
      };
      const saved = mapPatient(await staffApi.patients.update(updated.id, body));
      setPatients((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
      return saved;
    },
    []
  );

  const createPatient = useCallback(async (data: Partial<Patient>) => {
    const saved = mapPatient(
      await staffApi.patients.create({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        gender: data.gender,
        provider_name: data.provider,
      })
    );
    setPatients((prev) => [...prev, saved]);
    return saved;
  }, []);

  const updateAppointmentStatus = useCallback(
    async (id: string, status: AppointmentStatus) => {
      const updated = mapAppointment(await staffApi.appointments.update(id, { status }));
      setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
    },
    []
  );

  return {
    patients,
    appointments,
    loading,
    error,
    refresh,
    savePatient,
    createPatient,
    updateAppointmentStatus,
    setPatients,
  };
}
