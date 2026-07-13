import { useEffect, type ReactNode } from "react";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Dialog({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: DialogProps) {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Dialog container */}
      <div
        className={`relative w-full bg-surface-container-lowest rounded-card shadow-level-2 border border-outline-variant/30 flex flex-col max-h-[90vh] overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95 ${sizeClasses[size]}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-card-padding border-b border-outline-variant/10">
          <h3 className="text-headline-sm font-bold text-on-surface">{title}</h3>
          <button
            onClick={onClose}
            className="material-symbols-outlined p-1 rounded-full text-outline hover:bg-surface-container-low hover:text-on-surface transition-colors focus:outline-none"
          >
            close
          </button>
        </div>

        {/* Content Body */}
        <div className="p-card-padding overflow-y-auto flex-1 text-body-md text-on-surface-variant">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-card-padding py-4 bg-surface-container-low/30 border-t border-outline-variant/10 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
