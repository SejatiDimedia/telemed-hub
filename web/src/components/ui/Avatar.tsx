import { useState, useEffect } from "react";

export interface AvatarProps {
  src?: string;
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
  
  console.log("Avatar render:", { name, src, imageError });

  useEffect(() => {
    setImageError(false);
  }, [src]);

  const finalSrc = src ? (src.includes("?") ? `${src}&_cb=${Date.now()}` : `${src}?_cb=${Date.now()}`) : undefined;

  // Generate initials
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const sizeClasses = {
    sm: "w-8 h-8 text-label-sm",
    md: "w-10 h-10 text-label-md",
    lg: "w-14 h-14 text-body-lg",
  };

  const statusClasses = {
    online: "bg-green-500",
    offline: "bg-gray-400",
    away: "bg-amber-500",
  };

  const statusDotSizes = {
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className={`flex items-center justify-center rounded-full overflow-hidden select-none font-bold font-body ${
          sizeClasses[size]
        } ${
          finalSrc && !imageError
            ? "bg-transparent"
            : "bg-primary-container text-on-primary-container border border-primary/20"
        }`}
      >
        {finalSrc && !imageError ? (
          <img
            src={finalSrc}
            alt={name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
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
