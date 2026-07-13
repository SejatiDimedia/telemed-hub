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
}

export function Sidebar({ items, className = "" }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    void navigate({ to: "/login" });
  };

  return (
    <aside
      className={`w-[280px] h-screen fixed left-0 top-0 bg-surface border-r border-outline-variant/30 flex flex-col py-8 px-4 gap-6 z-40 select-none ${className}`}
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
      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeProps={{
              className:
                "bg-secondary-container/20 text-primary font-bold shadow-[inset_4px_0_0_0_#00676a]",
            }}
            inactiveProps={{
              className: "text-on-surface-variant/80 hover:bg-surface-container-low hover:text-on-surface",
            }}
            className="flex items-center gap-4 px-4 py-3 rounded-lg text-body-md transition-all duration-150 focus:outline-none"
          >
            <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* User Footer Profile */}
      {user && (
        <div className="pt-4 border-t border-outline-variant/20 flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2">
            <Avatar name={user.email} size="md" status="online" />
            <div className="flex flex-col min-w-0">
              <span className="text-label-md font-bold text-on-surface truncate">
                {user.email.split("@")[0]}
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
  );
}
