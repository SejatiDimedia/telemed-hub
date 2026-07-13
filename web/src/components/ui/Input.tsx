import {
  forwardRef,
  useState,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  leftIcon?: string;
  rightIcon?: string;
  textarea?: boolean;
  rows?: number;
}

export const Input = forwardRef<HTMLInputElement & HTMLTextAreaElement, InputProps>(
  (
    {
      label,
      error,
      leftIcon,
      rightIcon,
      textarea = false,
      type = "text",
      className = "",
      rows = 4,
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id ?? `input-${Math.random().toString(36).substr(2, 9)}`;

    const isPassword = type === "password";
    const currentType = isPassword ? (showPassword ? "text" : "password") : type;

    // Tailwind v4 standard form styling classes matching Stitch templates
    const containerClasses = "flex flex-col gap-1.5 w-full";
    const labelClasses = "text-label-md font-semibold text-on-surface-variant";
    const errorTextClasses = "text-body-sm text-error font-medium";

    const baseInputClasses =
      "w-full px-4 py-2.5 rounded-lg border bg-surface-container-lowest text-on-surface placeholder:text-outline/70 transition-all duration-200 focus:outline-none focus:ring-2 focus:border-primary/50 focus:ring-primary/20 disabled:opacity-50 disabled:bg-surface-container-low";
    
    const borderClasses = error
      ? "border-error focus:border-error focus:ring-error/20"
      : "border-outline-variant focus:border-primary";

    const paddingLeftClasses = leftIcon ? "pl-11" : "";
    const paddingRightClasses = rightIcon || isPassword ? "pr-11" : "";

    const combinedInputClasses = `${baseInputClasses} ${borderClasses} ${paddingLeftClasses} ${paddingRightClasses} ${className}`;

    return (
      <div className={containerClasses}>
        {label && (
          <label htmlFor={inputId} className={labelClasses}>
            {label}
          </label>
        )}

        <div className="relative w-full flex items-center">
          {leftIcon && (
            <span className="material-symbols-outlined absolute left-4 text-outline text-[20px] pointer-events-none">
              {leftIcon}
            </span>
          )}

          {textarea ? (
            <textarea
              id={inputId}
              ref={ref as any}
              rows={rows}
              className={combinedInputClasses}
              {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            />
          ) : (
            <input
              id={inputId}
              type={currentType}
              ref={ref as any}
              className={combinedInputClasses}
              {...props}
            />
          )}

          {isPassword ? (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="material-symbols-outlined absolute right-4 text-outline text-[20px] hover:text-on-surface transition-colors"
            >
              {showPassword ? "visibility_off" : "visibility"}
            </button>
          ) : (
            rightIcon && (
              <span className="material-symbols-outlined absolute right-4 text-outline text-[20px] pointer-events-none">
                {rightIcon}
              </span>
            )
          )}
        </div>

        {error && <span className={errorTextClasses}>{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
