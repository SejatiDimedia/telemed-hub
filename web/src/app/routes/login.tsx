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
      } else if (role === "pharmacy_staff") {
        throw redirect({ to: "/pharmacy" });
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

  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Rahasia123!");
    setValidationErrors({});
    setApiError(null);
  };

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
    <div className="bg-background text-on-surface font-body min-h-screen flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      <main className="flex-1 flex flex-col md:flex-row">
        {/* Left Informational Column */}
        <div className="hidden md:flex md:w-1/2 lg:w-5/12 bg-surface-container-low border-r border-outline-variant/30 flex-col justify-between p-12">
          <div>
            <Link to="/" className="inline-flex items-center gap-3 group mb-12">
              <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">medical_services</span>
              </div>
              <div>
                <span className="font-display font-bold text-xl text-on-surface tracking-tight block">
                  TeleMedHub
                </span>
                <span className="text-[11px] text-on-surface-variant font-medium block">
                  Telemedicine & Smart Pharmacy
                </span>
              </div>
            </Link>

            <div className="max-w-md">
              <h2 className="font-display text-3xl font-bold text-on-surface leading-snug mb-4">
                Pelayanan Medis Terintegrasi & Terpercaya
              </h2>
              <p className="text-body-md text-on-surface-variant leading-relaxed mb-8">
                Masuk untuk mengakses antrean konsultasi dokter, pelacakan resep obat, catatan rekam medis, dan transaksi dompet digital.
              </p>

              <div className="space-y-4 pt-4 border-t border-outline-variant/20">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">verified</span>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">Dokter Berlisensi Aktif</p>
                    <p className="text-xs text-on-surface-variant">SIP dan verifikasi kredensial tersertifikasi.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">lock</span>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">Audit Log Rekam Medis</p>
                    <p className="text-xs text-on-surface-variant">Setiap pembacaan dan pembaruan data rekam medis diaudit ketat.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-on-surface-variant/70 pt-8">
            TeleMedHub System • Version 1.0
          </div>
        </div>

        {/* Right Login Column */}
        <div className="w-full md:w-1/2 lg:w-7/12 flex flex-col items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-md">
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between mb-8 pb-4 border-b border-outline-variant/30">
              <Link to="/" className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-3xl">medical_services</span>
                <span className="font-display font-bold text-xl text-on-surface">TeleMedHub</span>
              </Link>
            </div>

            <div className="mb-8">
              <h1 className="font-display text-2xl font-bold text-on-surface tracking-tight mb-2">
                Masuk ke Akun Anda
              </h1>
              <p className="text-body-sm text-on-surface-variant">
                Masukkan email atau ID terdaftar untuk melanjutkan ke dashboard.
              </p>
            </div>

            {/* Quick Fill Demo Helper */}
            <div className="mb-6 p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40">
              <p className="text-[11px] font-semibold text-on-surface-variant mb-2">
                💡 Coba Akun Demo (Klik untuk mengisi cepat):
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill("timur@telemedhub.com")}
                  className="px-2.5 py-1 text-xs rounded-lg bg-surface border border-outline-variant/50 text-on-surface hover:border-primary hover:text-primary transition-colors font-medium"
                >
                  Pasien (Timur)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill("andi@telemedhub.com")}
                  className="px-2.5 py-1 text-xs rounded-lg bg-surface border border-outline-variant/50 text-on-surface hover:border-primary hover:text-primary transition-colors font-medium"
                >
                  Dokter (Dr. Andi)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill("sinta@telemedhub.com")}
                  className="px-2.5 py-1 text-xs rounded-lg bg-surface border border-outline-variant/50 text-on-surface hover:border-primary hover:text-primary transition-colors font-medium"
                >
                  Farmasi (Sinta)
                </button>
              </div>
            </div>

            {/* API Error Alert */}
            {apiError && (
              <div className="mb-5">
                <Alert variant="error" title="Gagal Masuk">
                  {apiError}
                </Alert>
              </div>
            )}

            {/* Login Card */}
            <Card variant="default" className="p-6 rounded-2xl border border-outline-variant/30 shadow-sm">
              <CardContent className="p-0">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Alamat Email / ID"
                    id="email"
                    name="email"
                    placeholder="nama@telemedhub.com"
                    type="email"
                    leftIcon="mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={validationErrors.email}
                    disabled={loginMutation.isPending}
                    className="rounded-xl py-3"
                  />

                  <div>
                    <Input
                      label="Password"
                      id="password"
                      name="password"
                      placeholder="Masukkan kata sandi"
                      type="password"
                      leftIcon="lock"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      error={validationErrors.password}
                      disabled={loginMutation.isPending}
                      className="rounded-xl py-3"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={loginMutation.isPending}
                    className="w-full py-3.5 rounded-xl font-bold text-sm shadow-sm mt-2"
                  >
                    Masuk Sekarang
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="mt-6 text-center text-xs text-on-surface-variant">
              Belum memiliki akun?{" "}
              <Link to="/register" className="text-primary font-bold hover:underline">
                Daftar Akun Baru
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-6 border-t border-outline-variant/20 bg-surface-container-lowest text-center text-xs text-on-surface-variant/70">
        © {new Date().getFullYear()} TeleMedHub. Hak Cipta Dilindungi.
      </footer>
    </div>
  );
}
