import { useEffect, useState } from "react";
import { useAuth } from "./auth/AuthContext";
import { LoginPage } from "./auth/LoginPage";
import { AcceptInvitePage } from "./auth/AcceptInvitePage";
import { ResetPasswordPage } from "./auth/ResetPasswordPage";
import { Totp2faPage } from "./auth/Totp2faPage";
import { Sso2faPage } from "./auth/Sso2faPage";
import { PlatformAdminPage } from "./platform/PlatformAdminPage";
import { SettingsSection, type SettingsTab } from "./settings/SettingsSection";
import { TopBar } from "./components/layout/TopBar";
import { Sidebar } from "./components/layout/Sidebar";
import { HomeDashboard } from "./features/dashboard/HomeDashboard";
import { ActivityView } from "./features/dashboard/ActivityView";
import { PatientsSection } from "./features/patients/PatientsSection";
import { PatientSlidePanel } from "./features/patients/PatientSlidePanel";
import { FormsSection } from "./features/forms/FormsSection";
import { CommunicationsSection } from "./features/communications/CommunicationsSection";
import { TemplatesSection } from "./features/communications/TemplatesSection";
import { PaymentsSection } from "./features/payments/PaymentsSection";
import { VerificationSection } from "./features/verification/VerificationSection";
import { WaitlistSection } from "./features/scheduling/WaitlistSection";
import { OnlineBookingSection } from "./features/scheduling/OnlineBookingSection";
import { PublicBookingPage } from "./public/PublicBookingPage";
import { PublicBookingThankYouPage } from "./public/PublicBookingThankYouPage";
import { PublicWaitlistPage } from "./public/PublicWaitlistPage";
import { PublicFormsPage } from "./public/PublicFormsPage";
import { PublicPacketPage } from "./public/PublicPacketPage";
import { PublicReminderRespondPage } from "./public/PublicReminderRespondPage";
import { PublicReviewPage } from "./public/PublicReviewPage";
import { useStaffData } from "./hooks/useStaffData";
import { LoadingScreen } from "./components/shared/LoadingBounce";
import { SmsRegistrationBanner } from "./features/communications/SmsRegistrationPanel";
import type { AppointmentStatus, Patient } from "./types";

export default function App() {
  const { status, user, activeLocation } = useAuth();
  const [activeNav, setActiveNav] = useState("home");
  const [settingsTab, setSettingsTab] = useState<SettingsTab | undefined>();
  const [panelPatient, setPanelPatient] = useState<Patient | null>(null);

  const isPracticeUser = status === "authenticated" && user?.account_type === "practice";
  const staff = useStaffData(isPracticeUser);

  // Patient panels are location-scoped — close them when the user switches.
  useEffect(() => {
    setPanelPatient(null);
  }, [activeLocation?.id]);

  function goHome() {
    setSettingsTab(undefined);
    setActiveNav("home");
  }

  function openSettings(tab?: typeof settingsTab) {
    setSettingsTab(tab);
    setActiveNav("settings");
  }

  useEffect(() => {
    function onOpenSettings(e: Event) {
      const detail = (e as CustomEvent<{ tab?: SettingsTab }>).detail;
      openSettings(detail?.tab);
    }
    window.addEventListener("nexhealth:open-settings", onOpenSettings);
    return () => window.removeEventListener("nexhealth:open-settings", onOpenSettings);
  }, []);

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

  const publicFormsMatch = window.location.pathname.match(/\/forms\/([^/]+)\/?$/);
  const publicPacketMatch = window.location.pathname.match(/\/p\/([^/]+)\/?$/);
  const publicReminderMatch = window.location.pathname.match(/\/reminder\/([^/]+)\/?$/);
  const publicReviewMatch = window.location.pathname.match(/\/review\/([^/]+)\/?$/);

  const publicApptMatch = window.location.pathname.match(/\/appt\/([^/]+)\/?$/);
  const publicWaitlistMatch = window.location.pathname.match(/\/waitlist\/([^/]+)\/?$/);
  const isBookingThankYou =
    window.location.pathname === "/booking/thank-you" ||
    window.location.pathname.endsWith("/booking/thank-you");

  if (publicFormsMatch) return <PublicFormsPage token={publicFormsMatch[1]} />;
  if (publicReminderMatch) return <PublicReminderRespondPage appointmentId={publicReminderMatch[1]} />;
  if (publicReviewMatch) return <PublicReviewPage appointmentId={publicReviewMatch[1]} />;
  if (publicWaitlistMatch) return <PublicWaitlistPage token={publicWaitlistMatch[1]} />;
  if (isBookingThankYou) return <PublicBookingThankYouPage />;
  if (publicApptMatch) return <PublicBookingPage slug={publicApptMatch[1]} />;
  if (publicPacketMatch) return <PublicPacketPage code={publicPacketMatch[1]} />;
  if (isTotp2fa) return <Totp2faPage />;
  if (isSso2fa) return <Sso2faPage />;
  if (isAcceptInvite) return <AcceptInvitePage />;
  if (isResetPassword) return <ResetPasswordPage />;

  async function handleStatusChange(id: string, status: AppointmentStatus) {
    await staff.updateAppointmentStatus(id, status);
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
    return <LoadingScreen fullScreen />;
  }

  if (status !== "authenticated") return <LoginPage />;
  if (user?.account_type === "super_admin") return <PlatformAdminPage />;

  function renderMain() {
    if (activeNav === "settings") {
      return (
        <SettingsSection
          initialTab={settingsTab}
          onBack={() => {
            setSettingsTab(undefined);
            setActiveNav("home");
          }}
        />
      );
    }
    if (activeNav === "activity") {
      return (
        <ActivityView patients={staff.patients} onOpenPanel={setPanelPatient} />
      );
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
    if (activeNav === "templates") return <TemplatesSection />;
    if (
      activeNav === "messages" ||
      activeNav === "communications" ||
      activeNav === "campaigns" ||
      activeNav === "reminders" ||
      activeNav === "recalls" ||
      activeNav === "reviews"
    ) {
      return <CommunicationsSection activeNav={activeNav} />;
    }
    if (activeNav === "waitlist" || activeNav === "scheduling") {
      return <WaitlistSection />;
    }
    if (activeNav === "online-booking") {
      return <OnlineBookingSection />;
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
      <TopBar
        onGoHome={goHome}
        onOpenSettings={() => openSettings()}
        onOpenUsers={() => openSettings("users")}
        onSelectPatient={setPanelPatient}
      />
      {activeNav === "home" && (
        <SmsRegistrationBanner onStart={() => openSettings("sms-registration")} />
      )}
      <div className="flex flex-1 overflow-hidden min-h-0 w-full">
        {activeNav !== "settings" && (
          <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} />
        )}
        <main className="flex-1 min-w-0 overflow-y-auto bg-gray-50/40">{renderMain()}</main>
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
