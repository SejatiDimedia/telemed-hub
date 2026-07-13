import type { ReactNode } from "react";
import { Button } from "../ui/Button";

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onActionClick?: () => void;
  actionIcon?: string;
  customAction?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon = "inbox",
  title,
  description,
  actionLabel,
  onActionClick,
  actionIcon,
  customAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 md:p-12 border border-dashed border-outline-variant/50 rounded-card bg-surface-container-lowest/40 ${className}`}
    >
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary-container/10 text-primary mb-4">
        <span className="material-symbols-outlined text-[32px]">{icon}</span>
      </div>

      <h3 className="text-headline-sm font-bold text-on-surface mb-2">{title}</h3>
      
      <p className="text-body-sm text-on-surface-variant max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {customAction ? (
        customAction
      ) : (
        actionLabel && (
          <Button
            onClick={onActionClick}
            leftIcon={actionIcon}
            size="md"
          >
            {actionLabel}
          </Button>
        )
      )}
    </div>
  );
}
