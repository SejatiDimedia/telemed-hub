import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
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

  return (
    <div className="bg-background text-on-background font-body min-h-screen">
      {/* Side Navigation Bar */}
      <Sidebar items={pharmacyNavItems} />

      {/* Top App Bar */}
      <header className="h-20 fixed top-0 right-0 left-[280px] z-30 bg-background/80 backdrop-blur-md flex items-center justify-between px-gutter border-b border-outline-variant/30 select-none">
        <div className="flex items-center gap-4 w-1/2">
          <h2 className="font-bold text-on-surface text-lg">Pusat Layanan Farmasi</h2>
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
              <p className="text-label-md font-bold text-on-surface leading-tight capitalize">
                {displayName}
              </p>
              <p className="text-[11px] font-semibold text-primary">Pharmacy Staff</p>
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
