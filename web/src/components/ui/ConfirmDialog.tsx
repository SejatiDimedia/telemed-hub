import type { ReactNode } from "react";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary" | "warning";
  isLoading?: boolean;
  icon?: string;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  variant = "primary",
  isLoading = false,
  icon,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const iconName =
    icon ||
    (variant === "danger"
      ? "warning"
      : variant === "warning"
      ? "help"
      : "verified_user");

  const iconColor =
    variant === "danger"
      ? "text-error bg-error/10"
      : variant === "warning"
      ? "text-amber-600 bg-amber-500/10"
      : "text-primary bg-primary/10";

  const confirmBtnClass =
    variant === "danger"
      ? "bg-error hover:bg-error/90 text-white"
      : variant === "warning"
      ? "bg-amber-600 hover:bg-amber-700 text-white"
      : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl border border-outline-variant/40 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
            <span className="material-symbols-outlined text-[24px]">{iconName}</span>
          </div>
          <div className="flex-1">
            <h3 className="font-display text-base sm:text-lg font-bold text-on-surface leading-snug">
              {title}
            </h3>
            <div className="text-body-sm text-on-surface-variant mt-1.5 leading-relaxed">
              {description}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-outline-variant/20">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl text-xs py-2 px-3.5"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            isLoading={isLoading}
            onClick={onConfirm}
            className={`rounded-xl text-xs py-2 px-4 font-bold shadow-xs ${confirmBtnClass}`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
