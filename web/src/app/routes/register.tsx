import { useState, type FormEvent } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card, CardContent } from "../../components/ui/Card";
import { Alert } from "../../components/ui/Alert";
import { useRegisterMutation } from "../../features/auth/hooks/use-auth-mutations";
import { registerSchema } from "../../features/auth/types";
import { ApiError } from "../../lib/api-client";

export const Route = createFileRoute("/register")({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      const role = context.auth.user?.role;
      if (role === "admin") {
        throw redirect({ to: "/admin" });
      } else if (role === "doctor") {
        throw redirect({ to: "/doctor" });
      } else {
        throw redirect({ to: "/patient" });
      }
    }
  },
  component: RegisterPage,
});

function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"patient" | "doctor" | "">("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const registerMutation = useRegisterMutation();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setApiError(null);

    // Validate using Zod schema
    const result = registerSchema.safeParse({
      full_name: fullName,
      email,
      role,
      password,
      confirm_password: confirmPassword,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      const formatted = result.error.format();
      if (formatted.full_name) {
        fieldErrors.full_name = formatted.full_name._errors[0] ?? "";
      }
      if (formatted.email) {
        fieldErrors.email = formatted.email._errors[0] ?? "";
      }
      if (formatted.role) {
        fieldErrors.role = formatted.role._errors[0] ?? "";
      }
      if (formatted.password) {
        fieldErrors.password = formatted.password._errors[0] ?? "";
      }
      if (formatted.confirm_password) {
        fieldErrors.confirm_password = formatted.confirm_password._errors[0] ?? "";
      }
      setValidationErrors(fieldErrors);
      return;
    }

    // Trigger Register Mutation
    registerMutation.mutate(
      {
        full_name: result.data.full_name,
        email: result.data.email,
        role: result.data.role,
        password: result.data.password,
      },
      {
        onError: (err) => {
          if (err instanceof ApiError) {
            if (err.code === "VALIDATION_ERROR" && err.details.length > 0) {
              const apiFieldErrors: Record<string, string> = {};
              err.details.forEach((d) => {
                apiFieldErrors[d.field] = d.issue;
              });
              setValidationErrors(apiFieldErrors);
            } else {
              setApiError(err.message);
            }
          } else {
            setApiError("Terjadi kesalahan jaringan saat mendaftar.");
          }
        },
      }
    );
  };

  return (
    <div className="bg-background text-on-surface font-body min-h-screen flex flex-col justify-between overflow-x-hidden">
      <main className="flex-1 flex flex-col md:flex-row relative">
        {/* Visual Column (Hidden on mobile) */}
        <div className="hidden md:flex md:w-1/2 lg:w-3/5 bg-surface-container overflow-hidden relative items-center justify-center">
          <div
            className="absolute inset-0 z-0 opacity-80"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD3pnn0VR_TDVjTR4ETh3W_VP41qmc-3SCeCU1fVBeofkNXPHTuzAs8Yl3q3NESUCAuUJopezJGJql6S32WHa3oqT7FQDLAft4JEDFfxxcm_gxzUSIIWqrUMsi51MD2_FfC6yPZCIYRd8cHcvbxo5I2Bei0Vta6WHJUQXVvNKXXY2z7cxrwTBcf56URSgJrtXn0lCoOPSGcCIRLRG3BV8d2D_zJlq-PNbLrtV_h4mlNkk3bI9H4hEg7XvpY22MEbG6F2xLvKlqocVU')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0 bg-primary/10 mix-blend-multiply z-10"></div>
          <div className="relative z-20 p-container-margin max-w-2xl text-center md:text-left text-on-primary-fixed">
            <h1 className="font-display text-display-lg text-on-primary-fixed mb-4 leading-tight">
              Compassionate Care, Advanced Technology
            </h1>
            <p className="font-body text-body-lg text-on-primary-fixed-variant opacity-90 max-w-lg">
              Create an account to consult with licensed physicians, order prescriptions, and manage digital health files.
            </p>
            <div className="mt-base flex gap-gutter items-center justify-center md:justify-start">
              <div className="flex flex-col">
                <span className="font-body text-label-md text-primary font-bold">128-bit</span>
                <span className="font-body text-label-sm text-on-surface-variant">Encryption</span>
              </div>
              <div className="w-px h-8 bg-outline-variant"></div>
              <div className="flex flex-col">
                <span className="font-body text-label-md text-primary font-bold">HIPAA</span>
                <span className="font-body text-label-sm text-on-surface-variant">Compliant</span>
              </div>
            </div>
          </div>
        </div>

        {/* Register Column */}
        <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col items-center justify-center p-container-margin bg-surface z-30 py-12 md:py-8">
          <div className="w-full max-w-md">
            {/* Logo & Brand */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-primary text-4xl mr-2">
                  medical_services
                </span>
                <span className="font-display text-headline-lg text-primary tracking-tight font-bold">
                  TeleMedHub
                </span>
              </div>
              <p className="font-body text-label-md text-on-surface-variant uppercase tracking-widest font-semibold">
                Clinical Command Center
              </p>
            </div>

            {/* API Error Message */}
            {apiError && (
              <div className="mb-4">
                <Alert variant="error" title="Pendaftaran Gagal">
                  {apiError}
                </Alert>
              </div>
            )}

            {/* Register Card */}
            <Card
              variant="default"
              className="p-0 rounded-[20px] shadow-level-1 border border-outline-variant/30 animate-in fade-in slide-in-from-bottom-5 duration-700"
            >
              <CardContent className="p-card-padding">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Full Name"
                    placeholder="Enter your full name"
                    leftIcon="person"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    error={validationErrors.full_name}
                    disabled={registerMutation.isPending}
                    className="rounded-[16px] py-3.5 bg-surface-bright pl-12 border-outline-variant focus:border-primary"
                  />

                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="name@example.com"
                    leftIcon="mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={validationErrors.email}
                    disabled={registerMutation.isPending}
                    className="rounded-[16px] py-3.5 bg-surface-bright pl-12 border-outline-variant focus:border-primary"
                  />

                  {/* Role selection dropdown */}
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-label-md font-semibold text-on-surface-variant">
                      Select System Access Role
                    </label>
                    <div className="relative w-full flex items-center">
                      <span className="material-symbols-outlined absolute left-4 text-outline text-[20px] pointer-events-none">
                        badge
                      </span>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as "patient" | "doctor" | "")}
                        disabled={registerMutation.isPending}
                        className={`w-full pl-11 pr-10 py-3 rounded-[16px] border bg-surface-bright text-on-surface transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-primary appearance-none ${
                          validationErrors.role
                            ? "border-error focus:border-error"
                            : "border-outline-variant focus:border-primary"
                        }`}
                      >
                        <option value="" disabled>-- Choose Role --</option>
                        <option value="patient">Patient Portal Access</option>
                        <option value="doctor">Medical Specialist (Doctor)</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-4 text-outline text-[20px] pointer-events-none">
                        arrow_drop_down
                      </span>
                    </div>
                    {validationErrors.role && (
                      <span className="text-body-sm text-error font-medium">
                        {validationErrors.role}
                      </span>
                    )}
                  </div>

                  <Input
                    label="Password"
                    type="password"
                    placeholder="Min. 8 characters with 1 digit & symbol"
                    leftIcon="lock"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={validationErrors.password}
                    disabled={registerMutation.isPending}
                    className="rounded-[16px] py-3.5 bg-surface-bright pl-12 border-outline-variant focus:border-primary"
                  />

                  <Input
                    label="Confirm Password"
                    type="password"
                    placeholder="Re-enter password"
                    leftIcon="lock"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    error={validationErrors.confirm_password}
                    disabled={registerMutation.isPending}
                    className="rounded-[16px] py-3.5 bg-surface-bright pl-12 border-outline-variant focus:border-primary"
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={registerMutation.isPending}
                    className="w-full py-4 rounded-[16px] font-bold uppercase tracking-wider shadow-md shadow-primary/10 hover:bg-primary-container active:scale-95 transition-all duration-200 mt-2"
                  >
                    Sign Up
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Secondary Actions */}
            <div className="mt-6 flex flex-col items-center gap-4">
              <div className="flex gap-gutter font-body text-label-sm">
                <Link
                  to="/login"
                  className="text-on-surface-variant hover:text-primary flex items-center gap-1 transition-colors font-semibold"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    login
                  </span>
                  Sign In Instead
                </Link>
                <div className="w-px h-4 bg-outline-variant"></div>
                <a
                  className="text-on-surface-variant hover:text-primary flex items-center gap-1 transition-colors font-semibold"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Seluruh sub-sistem TeleMedHub terpantau Normal.");
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    analytics
                  </span>
                  System Status
                </a>
              </div>

              {/* Compliance Badge */}
              <div className="flex items-center gap-2 px-4 py-2 bg-secondary-container/20 border border-secondary/10 rounded-full select-none">
                <span className="material-symbols-outlined text-secondary text-[16px]">
                  verified_user
                </span>
                <span className="font-body text-label-sm text-secondary uppercase font-bold tracking-wider">
                  HIPAA Compliant &amp; AES-256 Encrypted
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Integration */}
      <footer className="w-full py-4 px-container-margin flex flex-col md:flex-row justify-between items-center border-t border-outline-variant/30 bg-surface-container-lowest select-none">
        <div className="flex flex-col md:flex-row items-center gap-gutter mb-4 md:mb-0">
          <span className="font-headline text-headline-sm font-bold text-primary">
            TeleMedHub
          </span>
          <span className="font-body text-body-sm text-on-surface-variant/80">
            © 2024 TeleMedHub. HIPAA Compliant &amp; AES-256 Encrypted.
          </span>
        </div>
        <nav className="flex gap-gutter">
          <a
            className="font-body text-label-sm text-on-surface-variant hover:underline hover:text-primary transition-all duration-300"
            href="#"
          >
            Privacy Policy
          </a>
          <a
            className="font-body text-label-sm text-on-surface-variant hover:underline hover:text-primary transition-all duration-300"
            href="#"
          >
            Terms of Service
          </a>
          <a
            className="font-body text-label-sm text-on-surface-variant hover:underline hover:text-primary transition-all duration-300"
            href="#"
          >
            Security Architecture
          </a>
        </nav>
      </footer>
    </div>
  );
}
