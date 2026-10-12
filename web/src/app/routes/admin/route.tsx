import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Sidebar } from "../../../components/shared/Sidebar";
import { Avatar } from "../../../components/ui/Avatar";
import { useAuth } from "../../../context/auth-context";

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: "/login" });
    }
    if (context.auth.user?.role !== "admin") {
      throw redirect({ to: "/login" });
    }
  },
  component: AdminLayout,
});

const adminNavItems = [
  { label: "Dashboard Overview", icon: "dashboard", to: "/admin" },
  { label: "Verifikasi Dokter", icon: "verified_user", to: "/admin" },
  { label: "Manajemen Pengguna", icon: "manage_accounts", to: "/admin" },
  { label: "Audit Log & Security", icon: "shield", to: "/admin" },
];

function AdminLayout() {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const displayName = user?.fullName || user?.email.split("@")[0] || "Administrator";

  return (
    <div className="bg-background text-on-background font-body min-h-screen">
      {/* Side Navigation Bar */}
      <Sidebar 
        items={adminNavItems} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {/* Top App Bar */}
      <header className="h-20 fixed top-0 right-0 left-0 md:left-[280px] z-30 bg-background/80 backdrop-blur-md flex items-center justify-between px-4 md:px-gutter border-b border-outline-variant/30 select-none">
        {/* Title / Hamburger Menu */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-2 -ml-2 rounded-full hover:bg-surface-container text-on-surface-variant flex items-center justify-center transition-colors focus:outline-none"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>

          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-[24px]">admin_panel_settings</span>
            <span className="font-display font-bold text-lg text-on-surface hidden sm:inline">
              Admin Control Center
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Super Admin
            </span>
          </div>
        </div>

        {/* Right Actions & Profile */}
        <div className="flex items-center gap-4 md:gap-6">
          <Link
            to="/login"
            onClick={(e) => {
              e.preventDefault();
              logout();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-error hover:bg-error/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span className="hidden sm:inline">Keluar</span>
          </Link>

          <div className="h-7 w-px bg-outline-variant/30 hidden sm:block" />

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-label-md font-bold text-on-surface leading-tight">
                {displayName}
              </p>
              <p className="text-[11px] font-semibold text-on-surface-variant">
                {user?.email}
              </p>
            </div>
            <Avatar src={user?.profilePictureUrl} name={displayName} size="md" />
          </div>
        </div>
      </header>

      {/* Main Content Pane */}
      <main className="pl-0 md:pl-[280px] pt-20 min-h-screen flex flex-col justify-between transition-all duration-300 w-full">
        <div className="flex-1 p-4 md:p-gutter w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
