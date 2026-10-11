import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "../../components/ui/Button";

export const Route = createFileRoute("/")({
  component: HomePage,
});

export function HomePage() {
  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      {/* Top Navbar */}
      <header className="border-b border-outline-variant/30 bg-surface/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-200">
              <span className="material-symbols-outlined text-[24px]">medical_services</span>
            </div>
            <div>
              <span className="font-display font-bold text-xl text-on-surface tracking-tight block">
                TeleMedHub
              </span>
              <span className="text-[11px] text-on-surface-variant font-medium block -mt-0.5">
                Telemedicine & Smart Pharmacy
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="outline" size="sm" className="rounded-lg px-4 font-semibold">
                Masuk
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="primary" size="sm" className="rounded-lg px-4 font-semibold">
                Daftar Akun
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              Platform Pelayanan Kesehatan Digital
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-on-surface tracking-tight leading-[1.15] mb-6">
              Layanan Telemedis & Farmasi Digital Terpercaya
            </h1>
            <p className="text-body-lg text-on-surface-variant leading-relaxed mb-8 max-w-2xl">
              Konsultasi dengan dokter berlisensi, skrining gejala awal mandiri, dan penebusan resep obat terpadu dalam satu sistem yang aman dan terstruktur.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/login">
                <Button size="lg" className="rounded-xl px-7 font-bold shadow-sm">
                  Masuk ke Portal
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="outline" size="lg" className="rounded-xl px-7 font-semibold">
                  Registrasi Pasien
                </Button>
              </Link>
            </div>
          </div>

          {/* Core Feature Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16 pt-12 border-t border-outline-variant/30">
            <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[26px]">video_call</span>
                </div>
                <h3 className="font-bold text-lg text-on-surface mb-2">Konsultasi Daring</h3>
                <p className="text-body-sm text-on-surface-variant leading-relaxed">
                  Pilih dokter umum atau spesialis berlisensi, tentukan jadwal konsultasi, dan dapatkan penanganan medis langsung.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[26px]">smart_toy</span>
                </div>
                <h3 className="font-bold text-lg text-on-surface mb-2">AI Triage Mandiri</h3>
                <p className="text-body-sm text-on-surface-variant leading-relaxed">
                  Asisten skrining cerdas untuk menganalisis gejala awal sebelum booking, memberikan estimasi urgensi dan spesialisasi dokter.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[26px]">medication</span>
                </div>
                <h3 className="font-bold text-lg text-on-surface mb-2">Apotek & Resep</h3>
                <p className="text-body-sm text-on-surface-variant leading-relaxed">
                  Resep digital dari dokter diverifikasi langsung oleh apoteker, dengan pembayaran saldo digital dan pelacakan pengiriman.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[26px]">shield_lock</span>
                </div>
                <h3 className="font-bold text-lg text-on-surface mb-2">Rekam Medis Aman</h3>
                <p className="text-body-sm text-on-surface-variant leading-relaxed">
                  Pencatatan riwayat diagnosis, alergi, dan hasil laboratorium pasien dengan audit log terstandarisasi.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Demo Credentials Info Card */}
          <div className="mt-16 p-6 rounded-2xl bg-surface-container-low border border-outline-variant/40 max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h4 className="font-bold text-base text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
                  Akun Pengujian Demo (Local Development)
                </h4>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Gunakan kredensial berikut untuk menguji masing-masing portal role di aplikasi:
                </p>
              </div>
              <div className="text-xs font-mono bg-surface-container-highest px-3 py-1.5 rounded-lg border border-outline-variant/30 self-start sm:self-auto">
                Password: <strong className="text-primary font-bold">Rahasia123!</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-surface rounded-xl border border-outline-variant/20">
                <span className="font-semibold text-primary block mb-0.5">Portal Pasien</span>
                <span className="font-mono text-on-surface block">timur@telemedhub.com</span>
                <span className="text-on-surface-variant/80 text-[11px] mt-1 block">Booking, Resep & Saldo</span>
              </div>
              <div className="p-3 bg-surface rounded-xl border border-outline-variant/20">
                <span className="font-semibold text-primary block mb-0.5">Portal Dokter</span>
                <span className="font-mono text-on-surface block">andi@telemedhub.com</span>
                <span className="text-on-surface-variant/80 text-[11px] mt-1 block">Antrean & Konsultasi</span>
              </div>
              <div className="p-3 bg-surface rounded-xl border border-outline-variant/20">
                <span className="font-semibold text-primary block mb-0.5">Portal Farmasi</span>
                <span className="font-mono text-on-surface block">sinta@telemedhub.com</span>
                <span className="text-on-surface-variant/80 text-[11px] mt-1 block">Pesanan & Inventaris Obat</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-outline-variant/30 py-6 bg-surface-container-lowest">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-on-surface-variant">
          <p>© {new Date().getFullYear()} TeleMedHub. Modular Monolith Architecture.</p>
          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-primary transition-colors">
              Masuk
            </Link>
            <Link to="/register" className="hover:text-primary transition-colors">
              Pendaftaran
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
