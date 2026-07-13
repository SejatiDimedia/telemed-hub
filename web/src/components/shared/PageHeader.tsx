import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-outline-variant/30 ${className}`}
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-headline-lg font-bold text-on-surface tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-body-sm text-on-surface-variant/80">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
