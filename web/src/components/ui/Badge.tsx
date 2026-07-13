import type { HTMLAttributes, ReactNode } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "neutral"
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "error"
    | "info";
  children: ReactNode;
}

export function Badge({
  variant = "neutral",
  children,
  className = "",
  ...props
}: BadgeProps) {
  const baseClasses =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-label-sm font-semibold border transition-colors";

  const variantClasses = {
    neutral:
      "bg-surface-container-low border-outline-variant/50 text-on-surface-variant",
    primary:
      "bg-primary-container border-primary-container/20 text-on-primary-container",
    secondary:
      "bg-secondary-container border-secondary-container/20 text-on-secondary-container",
    success:
      "bg-secondary-container/75 border-secondary-container/90 text-on-secondary-container",
    warning:
      "bg-amber-500/25 border-amber-500/40 text-amber-950",
    error:
      "bg-error-container border-error-container/20 text-on-error-container",
    info:
      "bg-tertiary-container border-tertiary-container/20 text-on-tertiary-container",
  };

  return (
    <span
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
