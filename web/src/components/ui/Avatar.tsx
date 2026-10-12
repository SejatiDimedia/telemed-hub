import { useState, useEffect } from "react";

export interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  status?: "online" | "offline" | "away";
  className?: string;
}

export function Avatar({
  src,
  name,
  size = "md",
  status,
  className = "",
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const cleanSrc = src && typeof src === "string" && src.trim() !== "" ? src.trim() : null;

  useEffect(() => {
    setImageError(false);
  }, [cleanSrc]);

  // Generate initials safely
  const initials = (name || "U")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "U";

  const sizeClasses = {
    sm: "w-8 h-8 text-label-sm",
    md: "w-10 h-10 text-label-md",
    lg: "w-14 h-14 text-body-lg",
    xl: "w-20 h-20 text-headline-sm",
    "2xl": "w-24 h-24 text-headline-md",
  };

  const statusClasses = {
    online: "bg-emerald-500",
    offline: "bg-neutral-400",
    away: "bg-amber-500",
  };

  const statusDotSizes = {
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
    lg: "w-4 h-4",
    xl: "w-4.5 h-4.5",
    "2xl": "w-5 h-5",
  };

  const hasCustomDimensions = /\bw-\S+/.test(className) && /\bh-\S+/.test(className);

  return (
    <div className={`relative inline-flex items-center justify-center rounded-full shrink-0 overflow-hidden ${className}`}>
      <div
        className={`flex items-center justify-center rounded-full overflow-hidden select-none font-bold font-body ${
          hasCustomDimensions ? "w-full h-full" : sizeClasses[size]
        } ${
          cleanSrc && !imageError
            ? "bg-surface-container"
            : "bg-primary-container text-on-primary-container border border-primary/20"
        }`}
      >
        {cleanSrc && !imageError ? (
          <img
            src={cleanSrc}
            alt={name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {status && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-surface-container-lowest ${
            statusClasses[status]
          } ${statusDotSizes[size]}`}
          title={status}
        />
      )}
    </div>
  );
}
