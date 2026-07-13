import { useState, type FormEvent } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useLoginMutation } from "../../features/auth/hooks/use-auth-mutations";
import { loginSchema } from "../../features/auth/types";
import { ApiError } from "../../lib/api-client";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card, CardContent } from "../../components/ui/Card";
import { Alert } from "../../components/ui/Alert";

export const Route = createFileRoute("/login")({
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
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const loginMutation = useLoginMutation();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setApiError(null);

    // Validate using Zod schema
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      const formatted = result.error.format();
      if (formatted.email) {
        fieldErrors.email = formatted.email._errors[0] ?? "";
      }
      if (formatted.password) {
        fieldErrors.password = formatted.password._errors[0] ?? "";
      }
      setValidationErrors(fieldErrors);
      return;
    }

    // Trigger Login Mutation
    loginMutation.mutate(result.data, {
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
          setApiError("Terjadi kesalahan jaringan. Silakan coba lagi.");
        }
      },
    });
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
          <div className="relative z-20 p-container-margin max-w-2xl text-center md:text-left">
            <h1 className="font-display text-display-lg text-on-primary-fixed mb-4 leading-tight">
              The Standard of Professional Telemedicine
            </h1>
            <p className="font-body text-body-lg text-on-primary-fixed-variant opacity-90 max-w-lg">
              TeleMedHub facilitates secure, efficient, and compassionate care through our integrated Clinical Command Center.
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

        {/* Login Column */}
        <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col items-center justify-center p-container-margin bg-surface z-30 py-12 md:py-0">
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

            {/* API Error Alert */}
            {apiError && (
              <div className="mb-4">
                <Alert variant="error" title="Gagal Masuk">
                  {apiError}
                </Alert>
              </div>
            )}

            {/* Login Card (Using Reusable Card Component) */}
            <Card
              variant="default"
              className="p-0 rounded-[20px] shadow-level-1 border border-outline-variant/30 animate-in fade-in slide-in-from-bottom-5 duration-700"
            >
              <CardContent className="p-card-padding">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <Input
                    label="Professional ID / Email"
                    id="professional-id"
                    name="email"
                    placeholder="e.g. dr.smith@telemedhub.com"
                    type="text"
                    leftIcon="person"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={validationErrors.email}
                    disabled={loginMutation.isPending}
                    className="rounded-[16px] py-3.5 bg-surface-bright pl-12 border-outline-variant focus:border-primary"
                  />

                  <div>
                    <Input
                      label="Password"
                      id="password"
                      name="password"
                      placeholder="••••••••••••"
                      type="password"
                      leftIcon="lock"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      error={validationErrors.password}
                      disabled={loginMutation.isPending}
                      className="rounded-[16px] py-3.5 bg-surface-bright pl-12 border-outline-variant focus:border-primary"
                    />
                    <div className="mt-2 text-right">
                      <a
                        className="font-body text-label-sm text-primary hover:underline transition-all font-semibold"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          alert("Fitur reset password belum diimplementasi di backend.");
                        }}
                      >
                        Forgot Password?
                      </a>
                    </div>
                  </div>

                  {/* MFA Awareness */}
                  <div className="p-3 rounded-lg bg-surface-container flex items-center gap-3 border border-outline-variant/10">
                    <span className="material-symbols-outlined text-secondary">
                      security
                    </span>
                    <p className="font-body text-label-sm text-on-surface-variant leading-relaxed">
                      Multi-Factor Authentication will be requested upon identification.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={loginMutation.isPending}
                    className="w-full py-4 rounded-[16px] font-bold uppercase tracking-wider shadow-md shadow-primary/10 hover:bg-primary-container active:scale-95 transition-all duration-200"
                  >
                    Secure Login
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Secondary Actions */}
            <div className="mt-gutter flex flex-col items-center gap-4">
              <div className="flex gap-gutter font-body text-label-sm">
                <Link
                  to="/register"
                  className="text-on-surface-variant hover:text-primary flex items-center gap-1 transition-colors font-semibold"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    person_add
                  </span>
                  Request Access
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
