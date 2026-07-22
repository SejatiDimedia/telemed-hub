import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Sidebar } from "../../../components/shared/Sidebar";
import { Avatar } from "../../../components/ui/Avatar";
import { useDoctorProfileMe } from "../../../features/doctor/hooks/use-doctors";
import { useAuth } from "../../../context/auth-context";

export const Route = createFileRoute("/doctor")({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: "/login" });
    }
    if (context.auth.user?.role !== "doctor") {
      throw redirect({ to: "/login" });
    }
  },
  component: DoctorLayout,
});

const doctorNavItems = [
  { label: "Dashboard", icon: "dashboard", to: "/doctor" },
  { label: "Manage Schedule", icon: "calendar_today", to: "/doctor/schedule" },
  { label: "Settings", icon: "settings", to: "/doctor/settings" },
];

function DoctorLayout() {
  const { user } = useAuth();
  const { data: profile } = useDoctorProfileMe();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const displayName = profile?.full_name ?? user?.email.split("@")[0] ?? "Doctor";
  const specialty = profile?.specialty?.name ?? "Medical Specialist";

  return (
    <div className="bg-background text-on-background font-body min-h-screen">
      {/* Side Navigation Bar */}
      <Sidebar 
        items={doctorNavItems} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {/* Top App Bar */}
      <header className="h-20 fixed top-0 right-0 left-0 md:left-[280px] z-30 bg-background/80 backdrop-blur-md flex items-center justify-between px-4 md:px-gutter border-b border-outline-variant/30 select-none">
        {/* Title / Search */}
        <div className="flex items-center gap-4 w-full md:w-1/2">
          {/* Hamburger Menu (Mobile Only) */}
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-2 -ml-2 rounded-full hover:bg-surface-container text-on-surface-variant flex items-center justify-center transition-colors focus:outline-none"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>

          <div className="relative w-full max-w-md flex items-center hidden sm:flex">
            <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-[20px] pointer-events-none">
              search
            </span>
            <input
              className="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary outline-none transition-all duration-200"
              placeholder="Search patients, consultations, or records..."
              type="text"
            />
          </div>
        </div>

        {/* Right Action Profile */}
        <div className="flex items-center gap-4 md:gap-6 ml-auto sm:ml-0">
          <div className="flex gap-1 md:gap-2">
            <button className="p-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant hidden sm:block">
              <span className="material-symbols-outlined text-[22px]">help</span>
            </button>
            <button className="p-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant hidden sm:block">
              <span className="material-symbols-outlined text-[22px]">dark_mode</span>
            </button>
          </div>
          <div className="h-8 w-px bg-outline-variant/30 hidden sm:block"></div>
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="text-right hidden sm:block">
              <p className="text-label-md font-bold text-on-surface leading-tight">
                {displayName}
              </p>
              <p className="text-[11px] font-semibold text-primary">{specialty}</p>
            </div>
            <Avatar src={user?.profilePictureUrl} name={displayName} size="md" />
          </div>
        </div>
      </header>

      {/* Main Content Pane */}
      <main className="pl-0 md:pl-[280px] pt-20 min-h-screen flex flex-col justify-between transition-all duration-300">
        <div className="flex-1 p-4 md:p-gutter">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
