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

interface DemoAccount {
  role: string;
  label: string;
  badge: string;
  email: string;
  icon: string;
  description: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: "patient",
    label: "Pasien",
    badge: "Konsultasi & Resep",
    email: "timur@telemedhub.com",
    icon: "person",
    description: "Akses booking dokter, video call, resep obat, & riwayat medis",
  },
  {
    role: "doctor",
    label: "Dokter",
    badge: "Praktik & Diagnosis",
    email: "andi@telemedhub.com",
    icon: "stethoscope",
    description: "Kelola antrean sesi, rekam medis pasien, & terbitkan resep",
  },
  {
    role: "pharmacy_staff",
    label: "Farmasi",
    badge: "Penebusan Obat",
    email: "sinta@telemedhub.com",
    icon: "prescriptions",
    description: "Proses pesanan obat resep, pengemasan, & status pengiriman",
  },
  {
    role: "admin",
    label: "Admin",
    badge: "Sistem & Lisensi",
    email: "admin@telemedhub.com",
    icon: "admin_panel_settings",
    description: "Verifikasi STR/SIP dokter, audit log keamanan, & kelola akun",
  },
];

function LoginPage() {
  const [email, setEmail] = useState("timur@telemedhub.com");
  const [password, setPassword] = useState("Rahasia123!");
  const [selectedRole, setSelectedRole] = useState<string>("patient");
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const loginMutation = useLoginMutation();

  const handleRoleSelect = (account: DemoAccount) => {
    setSelectedRole(account.role);
    setEmail(account.email);
    setPassword("Rahasia123!");
    setValidationErrors({});
    setApiError(null);
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    const matched = DEMO_ACCOUNTS.find((acc) => acc.email.toLowerCase() === val.toLowerCase());
    if (matched) {
      setSelectedRole(matched.role);
    } else {
      setSelectedRole("");
    }
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
          setApiError("Terjadi gangguan koneksi jaringan. Silakan periksa koneksi dan coba lagi.");
        }
      },
    });
  };

  const currentRoleInfo = DEMO_ACCOUNTS.find((a) => a.role === selectedRole);

  return (
    <div className="bg-background text-on-surface font-body min-h-screen flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      <main className="flex-1 flex flex-col lg:flex-row w-full">
        {/* Left Informational Showcase Column */}
        <div className="hidden lg:flex lg:w-5/12 xl:w-5/12 bg-surface-container-low border-r border-outline-variant/30 flex-col justify-between p-12 relative overflow-hidden">
          {/* Subtle Ambient Glow Elements */}
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />

          {/* Top Brand & Narrative */}
          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-3 group mb-12">
              <div className="w-11 h-11 rounded-2xl bg-surface border border-outline-variant/40 shadow-sm flex items-center justify-center p-2 group-hover:border-primary/50 transition-colors">
                <img
                  src="/logo_transparent.png"
                  alt="TeleMedHub Logo"
                  className="w-full h-full object-contain transition-transform group-hover:scale-105"
                />
              </div>
              <div>
                <span className="font-display font-bold text-2xl text-on-surface tracking-tight block">
                  TeleMedHub
                </span>
                <span className="text-xs text-primary font-semibold tracking-wide uppercase block -mt-0.5">
                  Telemedicine & Smart Pharmacy
                </span>
              </div>
            </Link>

            <div className="max-w-lg space-y-6">
              <h1 className="font-display text-4xl font-extrabold text-on-surface leading-[1.2] tracking-tight">
                Layanan Kesehatan Digital Terpadu & Terpercaya
              </h1>
              <p className="text-body-md text-on-surface-variant leading-relaxed">
                Platform terintegrasi yang mempertemukan pasien, dokter spesialis berlisensi, dan apotek terverifikasi dalam satu alur medis yang aman, nyaman, dan instan.
              </p>

              {/* Verified Trust Pillars */}
              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[20px]">videocam</span>
                  </div>
                  <div>
                    <h3 className="text-body-sm font-bold text-on-surface">Konsultasi Tatap Muka Real-Time</h3>
                    <p className="text-body-xs text-on-surface-variant leading-normal">
                      Video HD WebRTC tanpa jeda dan ruang obrolan aman langsung dari browser Anda.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[20px]">prescriptions</span>
                  </div>
                  <div>
                    <h3 className="text-body-sm font-bold text-on-surface">E-Resep Terkoneksi Apotek Pintar</h3>
                    <p className="text-body-xs text-on-surface-variant leading-normal">
                      Resep diterbitkan dokter dan dikonfirmasi langsung oleh apoteker dengan transparansi stok.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[20px]">verified_user</span>
                  </div>
                  <div>
                    <h3 className="text-body-sm font-bold text-on-surface">Kerahasiaan Rekam Medis (PHI)</h3>
                    <p className="text-body-xs text-on-surface-variant leading-normal">
                      Enkripsi end-to-end dengan rekaman jejak audit otomatis pada setiap akses data pasien.
                    </p>
                  </div>
                </div>
              </div>

              {/* Verified Doctor Testimonial Quote */}
              <div className="pt-6">
                <div className="p-4 rounded-2xl bg-surface/80 border border-outline-variant/30 backdrop-blur-sm space-y-2">
                  <p className="text-xs italic text-on-surface-variant leading-relaxed">
                    &ldquo;TeleMedHub menyederhanakan praktik konsultasi jarak jauh. Riwayat medis pasien tersaji rapi dan resep obat langsung terhubung ke mitra farmasi.&rdquo;
                  </p>
                  <div className="flex items-center gap-2.5 pt-1">
                    <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                      AP
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface leading-none">dr. Andi Pratama</p>
                      <p className="text-[11px] text-on-surface-variant leading-tight">Dokter Umum • SIP Kemenkes Terverifikasi</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Status Indicator */}
          <div className="relative z-10 pt-8 flex items-center justify-between text-xs text-on-surface-variant/80 border-t border-outline-variant/20">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="font-medium text-emerald-700 dark:text-emerald-400">Sistem Operasional Normal</span>
            </div>
            <span>v1.0 • Enterprise Monolith</span>
          </div>
        </div>

        {/* Right Sign-In Form Column */}
        <div className="w-full lg:w-7/12 xl:w-7/12 flex flex-col items-center justify-center p-6 sm:p-10 md:p-14">
          <div className="w-full max-w-lg">
            {/* Mobile Brand Header */}
            <div className="lg:hidden flex items-center justify-between mb-8 pb-4 border-b border-outline-variant/30">
              <Link to="/" className="flex items-center gap-2.5">
                <img
                  src="/logo_transparent.png"
                  alt="TeleMedHub Logo"
                  className="w-9 h-9 object-contain"
                />
                <div>
                  <span className="font-display font-bold text-xl text-on-surface leading-tight block">
                    TeleMedHub
                  </span>
                  <span className="text-[10px] text-primary font-semibold block uppercase">
                    Telemedicine Portal
                  </span>
                </div>
              </Link>
            </div>

            {/* Page Heading */}
            <div className="mb-7">
              <h2 className="font-display text-3xl font-extrabold text-on-surface tracking-tight mb-2">
                Masuk ke Akun Anda
              </h2>
              <p className="text-body-sm text-on-surface-variant">
                Gunakan kredensial terdaftar atau pilih peran demo di bawah untuk masuk ke dashboard.
              </p>
            </div>

            {/* Role Quick-Switcher Selector */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-label-sm font-bold text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">switch_account</span>
                  Pilih Akses Cepat Demo:
                </label>
                {currentRoleInfo && (
                  <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    {currentRoleInfo.badge}
                  </span>
                )}
              </div>

              {/* Segmented Chips Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DEMO_ACCOUNTS.map((acc) => {
                  const isSelected = selectedRole === acc.role;
                  return (
                    <button
                      key={acc.role}
                      type="button"
                      onClick={() => handleRoleSelect(acc)}
                      className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-center border transition-all duration-200 ${
                        isSelected
                          ? "bg-primary text-white border-primary shadow-sm ring-2 ring-primary/20 scale-[1.02]"
                          : "bg-surface-container-low border-outline-variant/40 text-on-surface hover:border-primary/50 hover:bg-surface"
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[20px] mb-1 ${isSelected ? "text-white" : "text-primary"}`}>
                        {acc.icon}
                      </span>
                      <span className="text-xs font-bold leading-none">{acc.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Role Helper Note */}
              {currentRoleInfo && (
                <div className="mt-2.5 px-3 py-2 rounded-lg bg-surface-container-low/70 border border-outline-variant/30 flex items-center gap-2 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px] text-primary shrink-0">info</span>
                  <span className="truncate">{currentRoleInfo.description}</span>
                </div>
              )}
            </div>

            {/* API Error Alert */}
            {apiError && (
              <div className="mb-5">
                <Alert variant="error" title="Autentikasi Gagal">
                  {apiError}
                </Alert>
              </div>
            )}

            {/* Login Card */}
            <Card variant="default" className="p-7 rounded-3xl border border-outline-variant/40 shadow-sm bg-surface">
              <CardContent className="p-0">
                <form onSubmit={handleSubmit} className="space-y-4.5">
                  <Input
                    label="Alamat Email Terdaftar"
                    id="email"
                    name="email"
                    placeholder="nama@telemedhub.com"
                    type="email"
                    leftIcon="mail"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    error={validationErrors.email}
                    disabled={loginMutation.isPending}
                    className="rounded-xl py-3"
                  />

                  <div>
                    <Input
                      label="Kata Sandi"
                      id="password"
                      name="password"
                      placeholder="Masukkan kata sandi akun"
                      type="password"
                      leftIcon="lock"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      error={validationErrors.password}
                      disabled={loginMutation.isPending}
                      className="rounded-xl py-3"
                    />
                  </div>

                  {/* Remember Me & Forgot Password Row */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary/30 border-outline-variant accent-primary"
                      />
                      <span className="text-xs font-medium text-on-surface-variant">
                        Ingat saya di perangkat ini
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-xs font-semibold text-primary hover:underline hover:text-primary/90 transition-colors"
                    >
                      Lupa kata sandi?
                    </button>
                  </div>

                  {/* Primary Submit Button */}
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={loginMutation.isPending}
                    rightIcon={loginMutation.isPending ? undefined : "arrow_forward"}
                    className="w-full py-3.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all mt-3"
                  >
                    Masuk ke Portal
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Security Guarantee Footnote */}
            <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-on-surface-variant/80">
              <span className="material-symbols-outlined text-[15px] text-emerald-600">lock</span>
              <span>Koneksi terenkripsi TLS 1.3 & mematuhi standar privasi data medis</span>
            </div>

            {/* Register Link */}
            <div className="mt-6 text-center text-xs text-on-surface-variant">
              Belum memiliki akun TeleMedHub?{" "}
              <Link to="/register" className="text-primary font-bold hover:underline ml-1">
                Daftar Sebagai Pasien Baru
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl border border-outline-variant/40 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold">
                <span className="material-symbols-outlined text-[24px]">key</span>
                <h3 className="font-display text-lg text-on-surface">Bantuan Kata Sandi</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-body-sm text-on-surface-variant leading-relaxed">
              Untuk lingkungan demo TeleMedHub, semua akun demo menggunakan kata sandi bawaan:
            </p>

            <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-on-surface-variant">Password Demo Universal:</p>
                <code className="text-sm font-bold text-primary font-mono">Rahasia123!</code>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPassword("Rahasia123!");
                  setShowForgotModal(false);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                Gunakan Ini
              </button>
            </div>

            <p className="text-body-xs text-on-surface-variant/80">
              Jika ini akun pribadi di lingkungan produksi, silakan hubungi tim administrator di <span className="font-semibold text-on-surface">admin@telemedhub.com</span> untuk pemulihan akses.
            </p>

            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setShowForgotModal(false)}
              className="w-full rounded-xl"
            >
              Tutup
            </Button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-4 px-6 border-t border-outline-variant/20 bg-surface-container-lowest text-center text-xs text-on-surface-variant/70">
        <div className="flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto gap-2">
          <span>© {new Date().getFullYear()} TeleMedHub. Hak Cipta Dilindungi.</span>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="hover:text-primary transition-colors cursor-pointer">Kebijakan Privasi</span>
            <span>•</span>
            <span className="hover:text-primary transition-colors cursor-pointer">Syarat & Ketentuan Layanan</span>
            <span>•</span>
            <span className="hover:text-primary transition-colors cursor-pointer">Pusat Bantuan</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
