import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_dev")({
  component: DevLayout,
});

function DevLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-surface-container-lowest p-4 sticky top-0 z-30 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[28px]">
            construction
          </span>
          <h2 className="text-headline-sm font-bold text-on-surface">
            TeleMedHub | Design System Workshop
          </h2>
        </div>
        <div className="text-body-sm text-on-surface-variant font-medium">
          Tailwind v4 Active
        </div>
      </header>

      <main className="p-gutter max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
