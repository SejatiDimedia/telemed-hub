import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevation" | "interactive";
  children: ReactNode;
}

export function Card({
  variant = "default",
  children,
  className = "",
  ...props
}: CardProps) {
  // We use rounded-card (20px) as standard card radius based on Stitch analysis
  const baseClasses =
    "bg-surface-container-lowest border border-outline-variant/30 rounded-card overflow-hidden transition-all duration-300";

  const variantClasses = {
    default: "",
    elevation: "shadow-level-1 border-none",
    interactive: "shadow-level-1 border-none hover:shadow-level-2 hover:-translate-y-0.5 cursor-pointer",
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`p-card-padding flex flex-col gap-1 border-b border-outline-variant/10 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-headline-sm font-bold text-on-surface ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`text-body-sm text-on-surface-variant/80 ${className}`}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-card-padding ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`px-card-padding py-4 bg-surface-container-low/30 border-t border-outline-variant/10 flex items-center justify-end gap-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
