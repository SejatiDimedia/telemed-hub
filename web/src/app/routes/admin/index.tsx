import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useAdminStats,
  useAdminAuditLogs,
  useAdminDoctors,
  useVerifyDoctorMutation,
} from "../../../features/admin/hooks/use-admin";
import { formatAuditAction, formatTargetType } from "../../../features/admin/types";
import { Button } from "../../../components/ui/Button";
import { Card, CardContent } from "../../../components/ui/Card";
import { Avatar } from "../../../components/ui/Avatar";

export const Route = createFileRoute("/admin/")({
  component: AdminOverviewDashboard,
});

function AdminOverviewDashboard() {
  const { data: stats, isLoading: isStatsLoading } = useAdminStats();
  const { data: doctors = [], isLoading: isDoctorsLoading } = useAdminDoctors();
  const { data: auditLogs = [], isLoading: isAuditLogsLoading } = useAdminAuditLogs({
    limit: 6,
  });

  const verifyDoctorMutation = useVerifyDoctorMutation();

  const pendingDoctors = doctors.filter((d) => !d.is_credential_verified);

  return (
    <div className="space-y-8 w-full pb-12">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 sm:p-8 rounded-3xl bg-surface border border-outline-variant/30 shadow-xs relative overflow-hidden">
        <div className="space-y-2 z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
            <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
            Panel Manajemen Layanan
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Selamat Datang di Panel Pengelola
          </h1>
          <p className="text-body-sm text-on-surface-variant leading-relaxed">
            Kelola verifikasi dokter, akun pengguna, serta pantau catatan keamanan layanan dalam satu tempat terpadu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <Link
            to="/admin/doctors"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
            Verifikasi Dokter ({pendingDoctors.length})
          </Link>
          <Link
            to="/admin/users"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-surface-container-low border border-outline-variant/40 text-on-surface text-xs font-bold hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
            Kelola Pengguna
          </Link>
        </div>
      </div>

      {/* 4 KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="rounded-2xl border border-outline-variant/30 bg-surface shadow-xs p-5 hover:border-primary/40 transition-colors group">
          <CardContent className="p-0 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-on-surface-variant">Total Pengguna</p>
              <h3 className="font-display text-2xl font-black text-on-surface mt-1">
                {isStatsLoading ? "..." : stats?.total_users ?? 0}
              </h3>
              <p className="text-[11px] text-on-surface-variant/80 mt-0.5">
                {stats?.total_patients ?? 0} Pasien • {stats?.total_doctors ?? 0} Dokter
              </p>
              <Link
                to="/admin/users"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary mt-3 group-hover:underline"
              >
                Lihat Manajemen Pengguna &rarr;
              </Link>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">groups</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-outline-variant/30 bg-surface shadow-xs p-5 hover:border-emerald-500/40 transition-colors group">
          <CardContent className="p-0 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-on-surface-variant">Dokter Terverifikasi</p>
              <h3 className="font-display text-2xl font-black text-emerald-600 mt-1">
                {isStatsLoading ? "..." : stats?.verified_doctors ?? 0}
              </h3>
              <p className="text-[11px] text-amber-600 font-semibold mt-0.5">
                {pendingDoctors.length} Menunggu Verifikasi
              </p>
              <Link
                to="/admin/doctors"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 mt-3 group-hover:underline"
              >
                Buka Verifikasi Dokter &rarr;
              </Link>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">medical_services</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-outline-variant/30 bg-surface shadow-xs p-5 hover:border-secondary/40 transition-colors group">
          <CardContent className="p-0 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-on-surface-variant">Konsultasi Selesai</p>
              <h3 className="font-display text-2xl font-black text-on-surface mt-1">
                {isStatsLoading ? "..." : stats?.total_consultations ?? 0}
              </h3>
              <p className="text-[11px] text-on-surface-variant/80 mt-0.5">
                {stats?.total_orders ?? 0} Pesanan Obat Farmasi
              </p>
              <span className="inline-block text-[11px] font-medium text-on-surface-variant/70 mt-3">
                Layanan Aktif 24/7
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">video_chat</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-outline-variant/30 bg-surface shadow-xs p-5 hover:border-purple-500/40 transition-colors group">
          <CardContent className="p-0 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-on-surface-variant">Catatan Keamanan Layanan</p>
              <h3 className="font-display text-2xl font-black text-on-surface mt-1">
                {isStatsLoading ? "..." : stats?.total_audit_logs ?? 0}
              </h3>
              <p className="text-[11px] text-on-surface-variant/80 mt-0.5">
                Aman & Terlindungi
              </p>
              <Link
                to="/admin/audit"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary mt-3 group-hover:underline"
              >
                Lihat Riwayat Keamanan &rarr;
              </Link>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">shield</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout: Pending Doctor Approvals & Recent Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Doctor Approvals */}
        <Card className="rounded-3xl border border-outline-variant/30 bg-surface shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-6 border-b border-outline-variant/20 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-[20px]">pending_actions</span>
                  Verifikasi Dokter Menunggu ({pendingDoctors.length})
                </h2>
                <p className="text-body-xs text-on-surface-variant mt-0.5">
                  Praktisi medis yang menunggu persetujuan izin praktik
                </p>
              </div>
              <Link
                to="/admin/doctors"
                className="text-xs font-bold text-primary hover:underline"
              >
                Lihat Semua
              </Link>
            </div>

            <div className="p-4 sm:p-6 divide-y divide-outline-variant/15">
              {isDoctorsLoading ? (
                <div className="py-8 text-center text-xs text-on-surface-variant">Memuat data dokter...</div>
              ) : pendingDoctors.length === 0 ? (
                <div className="py-8 text-center text-xs text-emerald-600 flex flex-col items-center gap-1.5">
                  <span className="material-symbols-outlined text-[28px]">task_alt</span>
                  <span className="font-semibold">Semua dokter terdaftar telah diverifikasi!</span>
                </div>
              ) : (
                pendingDoctors.slice(0, 4).map((doc) => (
                  <div key={doc.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar src={doc.profile_picture_url} name={doc.full_name} size="sm" />
                      <div>
                        <p className="text-xs font-bold text-on-surface">{doc.full_name}</p>
                        <p className="text-[11px] text-on-surface-variant">
                          {doc.specialty?.name || "Dokter Umum"} • {doc.license_number || "Belum dilampirkan"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={verifyDoctorMutation.isPending}
                      onClick={() => verifyDoctorMutation.mutate(doc.id)}
                      className="rounded-xl text-xs py-1"
                    >
                      Verifikasi
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-4 bg-surface-container-low/40 border-t border-outline-variant/20 text-center">
            <Link
              to="/admin/doctors"
              className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
            >
              Kelola Verifikasi Semua Dokter &rarr;
            </Link>
          </div>
        </Card>

        {/* Recent Audit Activities */}
        <Card className="rounded-3xl border border-outline-variant/30 bg-surface shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-6 border-b border-outline-variant/20 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">history</span>
                  Aktivitas Keamanan Terbaru
                </h2>
                <p className="text-body-xs text-on-surface-variant mt-0.5">
                  Riwayat akses dan pembaruan sistem
                </p>
              </div>
              <Link
                to="/admin/audit"
                className="text-xs font-bold text-primary hover:underline"
              >
                Lihat Semua
              </Link>
            </div>

            <div className="p-4 sm:p-6 divide-y divide-outline-variant/15">
              {isAuditLogsLoading ? (
                <div className="py-8 text-center text-xs text-on-surface-variant">Memuat catatan...</div>
              ) : auditLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-on-surface-variant">Belum ada catatan aktivitas.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                          {formatAuditAction(log.action)}
                        </span>
                        <span className="text-[11px] text-on-surface-variant">
                          {formatTargetType(log.target_type)}
                        </span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant/70">
                        {log.ip_address && log.ip_address !== "127.0.0.1"
                          ? `Jaringan: ${log.ip_address}`
                          : "Koneksi Aman Terverifikasi"}
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-on-surface-variant whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-4 bg-surface-container-low/40 border-t border-outline-variant/20 text-center">
            <Link
              to="/admin/audit"
              className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
            >
              Lihat Seluruh Riwayat Keamanan &rarr;
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
