import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../../context/auth-context";
import { Avatar } from "../ui/Avatar";

export interface SidebarNavItem {
  label: string;
  icon: string;
  to: string;
}

export interface SidebarProps {
  items: SidebarNavItem[];
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ items, className = "", isOpen = false, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    void navigate({ to: "/login" });
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-scrim/50 backdrop-blur-sm transition-opacity md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`w-[280px] h-screen fixed left-0 top-0 bg-surface border-r border-outline-variant/30 flex flex-col py-8 px-4 gap-6 z-50 select-none transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 ${className}`}
      >
      {/* Brand Header */}
      <div className="px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[32px] text-primary">
            local_hospital
          </span>
          <h1 className="text-headline-md font-bold text-primary tracking-tight">
            TeleMedHub
          </h1>
        </Link>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 flex flex-col gap-2 overflow-y-auto no-scrollbar mt-4">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: true }}
            activeProps={{
              className:
                "bg-primary/10 text-primary font-bold border border-primary/20 shadow-[0_2px_10px_-2px_rgba(0,103,106,0.15)]",
            }}
            inactiveProps={{
              className: "text-on-surface-variant/80 hover:bg-surface-container-low hover:text-on-surface border border-transparent",
            }}
            className="flex items-center gap-4 px-4 py-3 rounded-2xl text-body-md transition-all duration-300 ease-out focus:outline-none relative group overflow-hidden"
            onClick={() => {
              if (onClose) onClose();
            }}
          >
            <span className="material-symbols-outlined text-[22px] transition-transform duration-300 group-hover:scale-110">{item.icon}</span>
            <span className="relative z-10">{item.label}</span>
            {/* Subtle glow effect on hover for inactive items */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          </Link>
        ))}
      </nav>

      {/* User Footer Profile */}
      {user && (
        <div className="pt-4 border-t border-outline-variant/20 flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2">
            <Avatar src={user.profilePictureUrl} name={user.fullName ?? user.email} size="md" status="online" />
            <div className="flex flex-col min-w-0">
              <span className="text-label-md font-bold text-on-surface truncate">
                {user.fullName ?? user.email.split("@")[0]}
              </span>
              <span className="text-label-sm text-on-surface-variant/70 truncate uppercase">
                {user.role}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-2.5 rounded-lg text-body-sm text-error font-semibold hover:bg-error-container/20 transition-all duration-150 focus:outline-none"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span>Logout</span>
          </button>
        </div>
      )}
    </aside>
    </>
  );
}
