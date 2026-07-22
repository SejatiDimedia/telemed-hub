import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Sidebar } from "../../../components/shared/Sidebar";
import { Avatar } from "../../../components/ui/Avatar";
import { useAuth } from "../../../context/auth-context";

export const Route = createFileRoute("/pharmacy")({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: "/login" });
    }
    const role = context.auth.user?.role;
    if (role !== "pharmacy_staff" && role !== "admin") {
      throw redirect({ to: "/login" });
    }
  },
  component: PharmacyLayout,
});

const pharmacyNavItems = [
  { label: "Dashboard", icon: "dashboard", to: "/pharmacy" },
];

function PharmacyLayout() {
  const { user } = useAuth();
  const displayName = user?.email.split("@")[0] ?? "Apoteker";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="bg-background text-on-background font-body min-h-screen">
      {/* Side Navigation Bar */}
      <Sidebar 
        items={pharmacyNavItems} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Top App Bar */}
      <header className="h-20 fixed top-0 right-0 left-0 md:left-[280px] z-30 bg-background/80 backdrop-blur-md flex items-center justify-between px-4 md:px-gutter border-b border-outline-variant/30 select-none">
        <div className="flex items-center gap-4 w-full md:w-1/2">
          {/* Hamburger Menu (Mobile Only) */}
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-2 -ml-2 rounded-full hover:bg-surface-container text-on-surface-variant flex items-center justify-center transition-colors focus:outline-none"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
          <h2 className="font-bold text-on-surface text-lg hidden sm:block">Pusat Layanan Farmasi</h2>
          <h2 className="font-bold text-on-surface text-base sm:hidden">Farmasi</h2>
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
              <p className="text-label-md font-bold text-on-surface leading-tight capitalize">
                {displayName}
              </p>
              <p className="text-[11px] font-semibold text-primary">Pharmacy Staff</p>
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
