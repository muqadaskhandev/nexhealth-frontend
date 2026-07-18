import { useState } from "react";
import { useAuth } from "./auth/AuthContext";
import { LoginPage } from "./auth/LoginPage";
import { AcceptInvitePage } from "./auth/AcceptInvitePage";
import { ResetPasswordPage } from "./auth/ResetPasswordPage";
import { Totp2faPage } from "./auth/Totp2faPage";
import { Sso2faPage } from "./auth/Sso2faPage";
import { PlatformAdminPage } from "./platform/PlatformAdminPage";
import { SettingsSection } from "./settings/SettingsSection";
import { TopBar } from "./components/layout/TopBar";
import { Sidebar } from "./components/layout/Sidebar";
import { HomeDashboard } from "./features/dashboard/HomeDashboard";
import { PatientsSection } from "./features/patients/PatientsSection";
import { PatientSlidePanel } from "./features/patients/PatientSlidePanel";
import { FormsSection } from "./features/forms/FormsSection";
import { CommunicationsSection } from "./features/communications/CommunicationsSection";
import { PaymentsSection } from "./features/payments/PaymentsSection";
import { VerificationSection } from "./features/verification/VerificationSection";
import { WaitlistSection } from "./features/scheduling/WaitlistSection";
import { useStaffData } from "./hooks/useStaffData";
import type { AppointmentStatus, Patient } from "./types";

export default function App() {
  const { status, user } = useAuth();
  const [activeNav, setActiveNav] = useState("home");
  const [panelPatient, setPanelPatient] = useState<Patient | null>(null);

  const isPracticeUser = status === "authenticated" && user?.account_type === "practice";
  const staff = useStaffData(isPracticeUser);

  const isResetPassword =
    window.location.pathname === "/reset-password" ||
    window.location.pathname.endsWith("/reset-password");

  const isAcceptInvite =
    window.location.pathname === "/accept-invite" ||
    window.location.pathname.endsWith("/accept-invite");

  const isTotp2fa =
    window.location.pathname === "/totp-2fa" ||
    window.location.pathname.endsWith("/totp-2fa");

  const isSso2fa =
    window.location.pathname === "/sso-2fa" ||
    window.location.pathname.endsWith("/sso-2fa");

  if (isTotp2fa) return <Totp2faPage />;
  if (isSso2fa) return <Sso2faPage />;
  if (isAcceptInvite) return <AcceptInvitePage />;
  if (isResetPassword) return <ResetPasswordPage />;

  function handleStatusChange(id: string, status: AppointmentStatus) {
    staff.updateAppointmentStatus(id, status);
  }

  function handleSavePatient(updated: Patient) {
    staff.savePatient(updated).then((saved) => {
      setPanelPatient(saved);
    });
  }

  const currentPanelPatient = panelPatient
    ? staff.patients.find((p) => p.id === panelPatient.id) ?? panelPatient
    : null;

  if (status === "loading" || (isPracticeUser && staff.loading)) {
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
  if (user?.account_type === "super_admin") return <PlatformAdminPage />;

  function renderMain() {
    if (activeNav === "settings") {
      return <SettingsSection onBack={() => setActiveNav("home")} />;
    }
    if (activeNav === "patients") {
      return (
        <PatientsSection
          patients={staff.patients}
          setPatients={staff.setPatients}
          onOpenPanel={setPanelPatient}
          onCreatePatient={staff.createPatient}
          onSavePatient={staff.savePatient}
        />
      );
    }
    if (activeNav === "forms") return <FormsSection />;
    if (activeNav === "payments") return <PaymentsSection />;
    if (activeNav === "verification") return <VerificationSection />;
    if (activeNav === "messages" || activeNav === "communications") {
      return <CommunicationsSection />;
    }
    if (activeNav === "waitlist" || activeNav === "scheduling") {
      return <WaitlistSection />;
    }
    return (
      <HomeDashboard
        appointments={staff.appointments}
        patients={staff.patients}
        onStatusChange={handleStatusChange}
        onOpenPanel={setPanelPatient}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      {staff.error && (
        <div className="flex-shrink-0 w-full px-4 py-2 bg-red-100 border-b-2 border-red-300">
          <p className="text-sm font-medium text-red-800">{staff.error}</p>
        </div>
      )}
      <TopBar onOpenSettings={() => setActiveNav("settings")} onSelectPatient={setPanelPatient} />
      <div className="flex flex-1 overflow-hidden min-h-0 w-full">
        {activeNav !== "settings" && (
          <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} />
        )}
        <main className="flex-1 min-w-0 overflow-y-auto bg-background">{renderMain()}</main>
      </div>

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
