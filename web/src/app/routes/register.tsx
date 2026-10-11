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
  const [role, setRole] = useState<"patient" | "doctor" | "">("patient");
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
                Bergabung dengan Ekosistem Kesehatan Digital
              </h2>
              <p className="text-body-md text-on-surface-variant leading-relaxed mb-8">
                Daftar sekarang untuk menjadwalkan konsultasi dengan dokter spesialis, menebus resep, dan mengelola dokumen rekam medis Anda secara praktis.
              </p>

              <div className="space-y-4 pt-4 border-t border-outline-variant/20">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">health_and_safety</span>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">Data Pasien Aman</p>
                    <p className="text-xs text-on-surface-variant">Kerahasiaan medis terjamin sesuai regulasi perlindungan data.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">local_pharmacy</span>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">Integrasi Apotek Langsung</p>
                    <p className="text-xs text-on-surface-variant">Obat resep diproses dan dikonfirmasi langsung oleh tim farmasi.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-on-surface-variant/70 pt-8">
            TeleMedHub System • Version 1.0
          </div>
        </div>

        {/* Right Register Column */}
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
                Registrasi Akun Baru
              </h1>
              <p className="text-body-sm text-on-surface-variant">
                Lengkapi formulir berikut untuk membuat akun TeleMedHub Anda.
              </p>
            </div>

            {/* API Error Message */}
            {apiError && (
              <div className="mb-5">
                <Alert variant="error" title="Pendaftaran Gagal">
                  {apiError}
                </Alert>
              </div>
            )}

            {/* Register Card */}
            <Card variant="default" className="p-6 rounded-2xl border border-outline-variant/30 shadow-sm">
              <CardContent className="p-0">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Nama Lengkap"
                    placeholder="Contoh: Budi Santoso"
                    leftIcon="person"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    error={validationErrors.full_name}
                    disabled={registerMutation.isPending}
                    className="rounded-xl py-3"
                  />

                  <Input
                    label="Alamat Email"
                    type="email"
                    placeholder="nama@email.com"
                    leftIcon="mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={validationErrors.email}
                    disabled={registerMutation.isPending}
                    className="rounded-xl py-3"
                  />

                  {/* Role Selection */}
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs font-semibold text-on-surface">
                      Tipe Akun Pendaftaran
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRole("patient")}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                          role === "patient"
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-surface border-outline-variant/50 text-on-surface hover:bg-surface-container"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">personal_injury</span>
                        Pasien
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole("doctor")}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                          role === "doctor"
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-surface border-outline-variant/50 text-on-surface hover:bg-surface-container"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">stethoscope</span>
                        Dokter
                      </button>
                    </div>
                    {validationErrors.role && (
                      <p className="text-xs text-error font-medium mt-1">
                        {validationErrors.role}
                      </p>
                    )}
                  </div>

                  <Input
                    label="Kata Sandi"
                    type="password"
                    placeholder="Minimal 8 karakter"
                    leftIcon="lock"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={validationErrors.password}
                    disabled={registerMutation.isPending}
                    className="rounded-xl py-3"
                  />

                  <Input
                    label="Konfirmasi Kata Sandi"
                    type="password"
                    placeholder="Ulangi kata sandi Anda"
                    leftIcon="lock_reset"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    error={validationErrors.confirm_password}
                    disabled={registerMutation.isPending}
                    className="rounded-xl py-3"
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={registerMutation.isPending}
                    className="w-full py-3.5 rounded-xl font-bold text-sm shadow-sm mt-3"
                  >
                    Daftar Sekarang
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="mt-6 text-center text-xs text-on-surface-variant">
              Sudah memiliki akun?{" "}
              <Link to="/login" className="text-primary font-bold hover:underline">
                Masuk di Sini
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
