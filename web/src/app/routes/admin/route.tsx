import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

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

function AdminLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b p-4">
        <h2 className="text-lg font-semibold">Admin Panel — Layout Placeholder</h2>
      </header>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}
