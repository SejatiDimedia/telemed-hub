import { useState, useEffect } from "react";

export interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
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
  };

  return (
    <div className={`relative inline-block shrink-0 ${className}`}>
      <div
        className={`flex items-center justify-center rounded-full overflow-hidden select-none font-bold font-body ${
          sizeClasses[size]
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
