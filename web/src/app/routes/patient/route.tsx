import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Sidebar } from "../../../components/shared/Sidebar";
import { Avatar } from "../../../components/ui/Avatar";
import { usePatientProfile } from "../../../features/patient/hooks/use-patient-profile";
import { useAuth } from "../../../context/auth-context";

export const Route = createFileRoute("/patient")({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: "/login" });
    }
    if (context.auth.user?.role !== "patient") {
      throw redirect({ to: "/login" });
    }
  },
  component: PatientLayout,
});

const patientNavItems = [
  { label: "Dashboard", icon: "dashboard", to: "/patient" },
  { label: "Appointments", icon: "event", to: "/patient/appointments" },
  { label: "Medical Records", icon: "folder_shared", to: "/patient/records" },
  { label: "Digital Wallet", icon: "account_balance_wallet", to: "/patient/wallet" },
];

function PatientLayout() {
  const { user } = useAuth();
  const { data: profile } = usePatientProfile();

  const displayName = profile?.full_name ?? user?.email.split("@")[0] ?? "Patient";

  return (
    <div className="bg-background text-on-background font-body min-h-screen">
      {/* Side Navigation Bar */}
      <Sidebar items={patientNavItems} />

      {/* Top App Bar */}
      <header className="h-20 fixed top-0 right-0 left-[280px] z-30 bg-background/80 backdrop-blur-md flex items-center justify-between px-gutter border-b border-outline-variant/30 select-none">
        {/* Search Bar */}
        <div className="flex items-center gap-4 w-1/2">
          <div className="relative w-full max-w-md flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-[20px] pointer-events-none">
              search
            </span>
            <input
              className="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary outline-none transition-all duration-200"
              placeholder="Search medical records, doctors, or results..."
              type="text"
            />
          </div>
        </div>

        {/* Right Action Profile */}
        <div className="flex items-center gap-6">
          <div className="flex gap-2">
            <button className="p-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant">
              <span className="material-symbols-outlined">help</span>
            </button>
            <button className="p-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant">
              <span className="material-symbols-outlined">dark_mode</span>
            </button>
          </div>
          <div className="h-8 w-px bg-outline-variant/30"></div>
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="text-right">
              <p className="text-label-md font-bold text-on-surface leading-tight">
                {displayName}
              </p>
              <p className="text-[11px] font-semibold text-primary">Patient Portal</p>
            </div>
            <Avatar name={displayName} size="md" />
          </div>
        </div>
      </header>

      {/* Main Content Pane */}
      <main className="pl-[280px] pt-20 min-h-screen flex flex-col justify-between">
        <div className="flex-1 p-gutter">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
