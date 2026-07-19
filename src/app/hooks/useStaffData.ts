import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import type { Appointment, AppointmentStatus, Patient } from "../types";
import { mapAppointment, mapPatient, parseDob, staffApi } from "../lib/staff-api";
import { toastError, toastSuccess } from "../lib/toast";

export function useStaffData(enabled: boolean) {
  const { activeLocation } = useAuth();
  const locationId = activeLocation?.id ?? null;
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    // Full-screen spinner only on the first load; location switches refresh in place.
    if (!initialLoadDone.current) setLoading(true);
    setError(null);
    try {
      const [pRows, aRows] = await Promise.all([
        staffApi.patients.list(),
        staffApi.appointments.list(),
      ]);
      setPatients(pRows.map(mapPatient));
      setAppointments(aRows.map(mapAppointment));
      initialLoadDone.current = true;
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      setError(apiErr?.detail || "Could not load staff data.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // Re-fetch when the active location changes so dashboard/patients stay scoped.
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    refresh();
  }, [enabled, locationId, refresh]);

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
        notification_prefs: updated.notificationPrefs ?? {},
      };
      try {
        const saved = mapPatient(await staffApi.patients.update(updated.id, body));
        setPatients((prev) => {
          const before = prev.find((p) => p.id === saved.id);
          if (before && before.archived !== saved.archived) {
            toastSuccess(saved.archived ? "Patient archived" : "Patient unarchived");
          } else {
            toastSuccess("Patient updated");
          }
          return prev.map((p) => (p.id === saved.id ? saved : p));
        });
        return saved;
      } catch (err: unknown) {
        const apiErr = err as { detail?: string };
        toastError(apiErr?.detail || "Could not update patient");
        throw err;
      }
    },
    []
  );

  const createPatient = useCallback(async (data: Partial<Patient>) => {
    try {
      const saved = mapPatient(
        await staffApi.patients.create({
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          phone: data.phone,
          gender: data.gender,
          provider_name: data.provider,
          dob: parseDob(data.dob),
          language: data.language,
        })
      );
      setPatients((prev) => (prev.some((p) => p.id === saved.id) ? prev : [saved, ...prev]));
      toastSuccess("Patient created");
      return saved;
    } catch (err: unknown) {
      const apiErr = err as { detail?: string };
      toastError(apiErr?.detail || "Could not create patient");
      throw err;
    }
  }, []);

  const updateAppointmentStatus = useCallback(
    async (id: string, status: AppointmentStatus) => {
      try {
        const updated = mapAppointment(await staffApi.appointments.update(id, { status }));
        setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
        toastSuccess("Appointment updated");
      } catch (err: unknown) {
        const apiErr = err as { detail?: string };
        toastError(apiErr?.detail || "Could not update appointment");
        throw err;
      }
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
