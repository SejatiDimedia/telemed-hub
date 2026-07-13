import { useToastStore, type ToastItem } from "../../stores/toast-store";

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastCard({ toast }: { toast: ToastItem }) {
  const dismissToast = useToastStore((state) => state.dismissToast);

  const icons = {
    success: "check_circle",
    error: "error",
    warning: "warning",
    info: "info",
  };

  const bgClasses = {
    success: "bg-secondary-container/45 border-secondary-container/60 text-on-secondary-container",
    error: "bg-error-container/35 border-error-container/50 text-on-error-container",
    warning: "bg-amber-500/20 border-amber-500/35 text-amber-900",
    info: "bg-tertiary-container/30 border-tertiary-container/45 text-on-tertiary-fixed-variant",
  };

  const iconColorClasses = {
    success: "text-secondary",
    error: "text-error",
    warning: "text-amber-600",
    info: "text-tertiary",
  };

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-level-2 animate-in fade-in slide-in-from-top-4 duration-300 ${bgClasses[toast.type]}`}
      role="alert"
    >
      <span className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${iconColorClasses[toast.type]}`}>
        {icons[toast.type]}
      </span>

      <div className="flex-1 flex flex-col gap-0.5">
        {toast.title && (
          <h4 className="text-label-md font-bold text-on-surface">
            {toast.title}
          </h4>
        )}
        <p className="text-body-sm opacity-90">{toast.message}</p>
      </div>

      <button
        onClick={() => dismissToast(toast.id)}
        className="material-symbols-outlined text-[18px] opacity-60 hover:opacity-100 transition-opacity focus:outline-none shrink-0"
      >
        close
      </button>
    </div>
  );
}
export { useToastStore };
