import { useState } from "react";
import { useAuth } from "./auth/AuthContext";
import { LoginPage } from "./auth/LoginPage";
import { ResetPasswordPage } from "./auth/ResetPasswordPage";
import { SettingsSection } from "./settings/SettingsSection";
import { TopBar } from "./components/layout/TopBar";
import { Sidebar } from "./components/layout/Sidebar";
import { PlaceholderView } from "./components/shared/PlaceholderView";
import { HomeDashboard } from "./features/dashboard/HomeDashboard";
import { PatientsSection } from "./features/patients/PatientsSection";
import { PatientSlidePanel } from "./features/patients/PatientSlidePanel";
import { FormsSection } from "./features/forms/FormsSection";
import { INITIAL_APPOINTMENTS, INITIAL_PATIENTS } from "./data/mock-data";
import type { Appointment, AppointmentStatus, Patient } from "./types";

export default function App() {
  const { status } = useAuth();
  const [activeNav, setActiveNav] = useState("home");
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [panelPatient, setPanelPatient] = useState<Patient | null>(null);

  const isResetPassword =
    window.location.pathname === "/reset-password" ||
    window.location.pathname.endsWith("/reset-password");

  function handleStatusChange(id: string, status: AppointmentStatus) {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }

  function handleSavePatient(updated: Patient) {
    setPatients(prev => prev.map(p => p.id === updated.id ? updated : p));
    setPanelPatient(updated);
  }

  // Keep panel in sync when patient data changes
  const currentPanelPatient = panelPatient
    ? patients.find(p => p.id === panelPatient.id) ?? panelPatient
    : null;

  if (isResetPassword) {
    return <ResetPasswordPage />;
  }

  if (status === "loading") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-gray-200 border-t-teal-500 animate-spin" />
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      </div>
    );
  }

  if (status !== "authenticated") return <LoginPage />;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <TopBar onOpenSettings={() => setActiveNav("settings")} />
      <div className="flex flex-1 overflow-hidden">
        {activeNav !== "settings" && (
          <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} />
        )}
        <main className="flex-1 min-w-0 overflow-y-auto bg-background">
          {activeNav === "settings"    ? <SettingsSection onBack={() => setActiveNav("home")} />
          : activeNav === "patients"     ? <PatientsSection patients={patients} setPatients={setPatients} onOpenPanel={setPanelPatient} />
          : activeNav === "forms"       ? <FormsSection />
          : activeNav === "payments"    ? <PlaceholderView title="Payments" />
          : activeNav === "verification"? <PlaceholderView title="Verification" />
          : <HomeDashboard appointments={appointments} patients={patients} onStatusChange={handleStatusChange} onOpenPanel={setPanelPatient} />}
        </main>
      </div>

      {/* Slide panel */}
      {currentPanelPatient && (
        <PatientSlidePanel
          patient={currentPanelPatient}
          onClose={() => setPanelPatient(null)}
          onSavePatient={handleSavePatient}
        />
      )}
    </div>
  );
}
