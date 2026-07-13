import type { ReactNode } from "react";

export interface AlertProps {
  title?: string;
  variant?: "success" | "error" | "warning" | "info" | "neutral";
  leftIcon?: string;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
}

export function Alert({
  title,
  variant = "info",
  leftIcon,
  onClose,
  children,
  className = "",
}: AlertProps) {
  const icons = {
    neutral: "info",
    info: "info",
    success: "check_circle",
    warning: "warning",
    error: "error",
  };

  const bgClasses = {
    neutral: "bg-surface-container border-outline-variant/30 text-on-surface",
    info: "bg-tertiary-container/30 border-tertiary-container/45 text-on-tertiary-fixed-variant",
    success: "bg-secondary-container/45 border-secondary-container/60 text-on-secondary-container",
    warning: "bg-amber-500/20 border-amber-500/35 text-amber-900",
    error: "bg-error-container/35 border-error-container/50 text-on-error-container",
  };

  const iconColorClasses = {
    neutral: "text-outline",
    info: "text-tertiary",
    success: "text-secondary",
    warning: "text-amber-600",
    error: "text-error",
  };

  return (
    <div
      className={`flex items-start gap-3.5 p-4 rounded-xl border transition-all duration-200 ${bgClasses[variant]} ${className}`}
      role="alert"
    >
      <span className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${iconColorClasses[variant]}`}>
        {leftIcon ?? icons[variant]}
      </span>

      <div className="flex-1 flex flex-col gap-0.5 text-body-sm">
        {title && (
          <h5 className="font-bold tracking-tight text-on-surface">
            {title}
          </h5>
        )}
        <div className="opacity-90 leading-relaxed">{children}</div>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="material-symbols-outlined text-[18px] opacity-60 hover:opacity-100 transition-opacity focus:outline-none shrink-0"
        >
          close
        </button>
      )}
    </div>
  );
}
