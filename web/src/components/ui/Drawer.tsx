import { useEffect, type ReactNode } from "react";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
}

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: DrawerProps) {
  // Prevent background scrolling when drawer is open
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
    "2xl": "max-w-6xl w-[80vw]",
    "3xl": "max-w-7xl w-[90vw]",
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Container (slides from right) */}
      <div
        className={`relative w-full h-full bg-surface-container-lowest shadow-level-3 border-l border-outline-variant/35 flex flex-col transition-transform duration-300 ease-out animate-in slide-in-from-right ${sizeClasses[size]}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-card-padding border-b border-outline-variant/10 select-none">
          <h3 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">clinical_notes</span>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="material-symbols-outlined p-1.5 rounded-full text-outline hover:bg-surface-container-low hover:text-on-surface transition-colors focus:outline-none"
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
          <div className="p-card-padding bg-surface-container-low/30 border-t border-outline-variant/10 flex items-center justify-end gap-3 select-none">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
