import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useAdminStats,
  useAdminUsers,
  useAdminAuditLogs,
  useAdminDoctors,
  useVerifyDoctorMutation,
  useSuspendUserMutation,
  useAssignRoleMutation,
} from "../../../features/admin/hooks/use-admin";
import { Button } from "../../../components/ui/Button";
import { Card, CardContent } from "../../../components/ui/Card";
import { Avatar } from "../../../components/ui/Avatar";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

type AdminTab = "verification" | "users" | "audit";

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>("verification");
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("");
  const [assignRoleModalUser, setAssignRoleModalUser] = useState<any | null>(null);
  const [selectedRoleToAssign, setSelectedRoleToAssign] = useState("pharmacy_staff");

  // Queries
  const { data: stats, isLoading: isStatsLoading } = useAdminStats();
  const { data: doctors = [], isLoading: isDoctorsLoading } = useAdminDoctors();
  const { data: users = [], isLoading: isUsersLoading } = useAdminUsers({
    search: userSearch || undefined,
    role: userRoleFilter || undefined,
    status: userStatusFilter || undefined,
    limit: 50,
  });
  const { data: auditLogs = [], isLoading: isAuditLogsLoading } = useAdminAuditLogs({
    limit: 30,
  });

  // Mutations
  const verifyDoctorMutation = useVerifyDoctorMutation();
  const suspendUserMutation = useSuspendUserMutation();
  const assignRoleMutation = useAssignRoleMutation();

  const handleVerifyDoctor = (doctorId: string) => {
    verifyDoctorMutation.mutate(doctorId);
  };

  const handleToggleSuspend = (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "suspended" ? "active" : "suspended";
    const reason = newStatus === "suspended" ? "Penangguhan administratif oleh Super Admin" : "Pengaktifan kembali akun";
    suspendUserMutation.mutate({ userId, status: newStatus, reason });
  };

  const handleConfirmAssignRole = () => {
    if (!assignRoleModalUser) return;
    assignRoleMutation.mutate(
      { userId: assignRoleModalUser.id, role: selectedRoleToAssign },
      {
        onSuccess: () => setAssignRoleModalUser(null),
      }
    );
  };

  const unverifiedDoctorsCount = doctors.filter((d) => !d.is_credential_verified).length;

  return (
    <div className="space-y-8 w-full max-w-7xl mx-auto pb-12">
      {/* Hero Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-surface border border-outline-variant/30 shadow-sm relative overflow-hidden">
        <div className="space-y-2 z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            Panel Otoritas Utama Platform
          </div>
          <h1 className="font-display text-3xl font-extrabold text-on-surface tracking-tight">
            Pusat Kendali Administrasi & Kredensial
          </h1>
          <p className="text-body-sm text-on-surface-variant leading-relaxed">
            Verifikasi lisensi dokter spesialis, kelola otorisasi akun pengguna, dan pantau jejak audit perlindungan rekam medis secara terpusat.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <div className="px-4 py-3 rounded-2xl bg-surface-container-low border border-outline-variant/40 text-center">
            <p className="text-[11px] font-semibold text-on-surface-variant">Dokter Menunggu SIP</p>
            <p className="font-display text-2xl font-black text-amber-600">
              {unverifiedDoctorsCount}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="rounded-2xl border border-outline-variant/30 bg-surface shadow-xs p-5">
          <CardContent className="p-0 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-on-surface-variant">Total Pengguna</p>
              <h3 className="font-display text-2xl font-black text-on-surface mt-1">
                {isStatsLoading ? "..." : stats?.total_users ?? 0}
              </h3>
              <p className="text-[11px] text-on-surface-variant/80 mt-0.5">
                {stats?.total_patients ?? 0} Pasien • {stats?.total_doctors ?? 0} Dokter
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">groups</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-outline-variant/30 bg-surface shadow-xs p-5">
          <CardContent className="p-0 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-on-surface-variant">Dokter Berlisensi</p>
              <h3 className="font-display text-2xl font-black text-emerald-600 mt-1">
                {isStatsLoading ? "..." : stats?.verified_doctors ?? 0}
              </h3>
              <p className="text-[11px] text-on-surface-variant/80 mt-0.5">
                {stats?.pending_doctors ?? 0} Menunggu Verifikasi
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">medical_services</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-outline-variant/30 bg-surface shadow-xs p-5">
          <CardContent className="p-0 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-on-surface-variant">Konsultasi & Resep</p>
              <h3 className="font-display text-2xl font-black text-on-surface mt-1">
                {isStatsLoading ? "..." : stats?.total_consultations ?? 0}
              </h3>
              <p className="text-[11px] text-on-surface-variant/80 mt-0.5">
                {stats?.total_orders ?? 0} Pesanan Farmasi
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">video_chat</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-outline-variant/30 bg-surface shadow-xs p-5">
          <CardContent className="p-0 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-on-surface-variant">Log Audit Keamanan</p>
              <h3 className="font-display text-2xl font-black text-on-surface mt-1">
                {isStatsLoading ? "..." : stats?.total_audit_logs ?? 0}
              </h3>
              <p className="text-[11px] text-on-surface-variant/80 mt-0.5">Rekam Jejak Terenkripsi</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">shield</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-outline-variant/30 gap-2">
        <button
          onClick={() => setActiveTab("verification")}
          className={`flex items-center gap-2 pb-3.5 px-4 font-bold text-sm border-b-2 transition-all ${
            activeTab === "verification"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[19px]">verified_user</span>
          <span>Verifikasi Dokter</span>
          {unverifiedDoctorsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-amber-500/15 text-amber-700 font-black">
              {unverifiedDoctorsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 pb-3.5 px-4 font-bold text-sm border-b-2 transition-all ${
            activeTab === "users"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[19px]">group</span>
          <span>Manajemen Pengguna</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 pb-3.5 px-4 font-bold text-sm border-b-2 transition-all ${
            activeTab === "audit"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[19px]">history</span>
          <span>Log Audit & Keamanan</span>
        </button>
      </div>

      {/* TAB 1: VERIFIKASI DOKTER */}
      {activeTab === "verification" && (
        <Card className="rounded-3xl border border-outline-variant/30 bg-surface shadow-xs overflow-hidden">
          <div className="p-6 border-b border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-on-surface">
                Daftar Praktisi Medis & Status Kredensial
              </h2>
              <p className="text-body-xs text-on-surface-variant">
                Dokter yang belum diverifikasi tidak akan ditampilkan kepada pasien untuk pemesanan jadwal konsultasi.
              </p>
            </div>
            <div className="text-xs text-on-surface-variant font-medium">
              Menampilkan {doctors.length} dokter terdaftar
            </div>
          </div>

          <div className="overflow-x-auto">
            {isDoctorsLoading ? (
              <div className="p-12 text-center text-on-surface-variant text-sm">
                Memuat data dokter...
              </div>
            ) : doctors.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant text-sm">
                Tidak ada data dokter terdaftar.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/60 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/20">
                    <th className="py-3.5 px-6">Nama & Spesialisasi</th>
                    <th className="py-3.5 px-6">Nomor STR/SIP</th>
                    <th className="py-3.5 px-6">Tarif Konsultasi</th>
                    <th className="py-3.5 px-6">Rating & Ulasan</th>
                    <th className="py-3.5 px-6">Status Kredensial</th>
                    <th className="py-3.5 px-6 text-right">Tindakan Otoritas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/15 text-body-sm">
                  {doctors.map((doc) => {
                    const isVerified = doc.is_credential_verified;
                    return (
                      <tr key={doc.id} className="hover:bg-surface-container-low/40 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <Avatar src={doc.profile_picture_url} name={doc.full_name} size="md" />
                            <div>
                              <p className="font-bold text-on-surface">{doc.full_name}</p>
                              <p className="text-xs text-primary font-semibold">
                                {doc.specialty?.name || "Dokter Umum"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-mono text-xs text-on-surface">
                          {doc.license_number || "SIP-PENDING"}
                        </td>
                        <td className="py-4 px-6 text-on-surface font-semibold">
                          Rp {doc.consultation_fee?.toLocaleString("id-ID") ?? "0"}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
                            <span className="material-symbols-outlined text-[16px] text-amber-500 fill-1">star</span>
                            <span>{doc.rating ? Number(doc.rating).toFixed(1) : "5.0"}</span>
                            <span className="text-[11px] font-normal text-on-surface-variant">
                              ({doc.total_reviews ?? 0})
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {isVerified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700">
                              <span className="material-symbols-outlined text-[15px]">verified</span>
                              Terverifikasi
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-800">
                              <span className="material-symbols-outlined text-[15px]">pending</span>
                              Menunggu Verifikasi
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          {isVerified ? (
                            <span className="text-xs text-on-surface-variant font-medium">
                              Kredensial Sah
                            </span>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              isLoading={verifyDoctorMutation.isPending}
                              onClick={() => handleVerifyDoctor(doc.id)}
                              className="rounded-xl font-bold"
                            >
                              Verifikasi Sekarang
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {/* TAB 2: MANAJEMEN PENGGUNA */}
      {activeTab === "users" && (
        <Card className="rounded-3xl border border-outline-variant/30 bg-surface shadow-xs overflow-hidden">
          {/* Filter Bar */}
          <div className="p-6 border-b border-outline-variant/20 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
            <div className="flex-1 max-w-md relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Cari nama atau email pengguna..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="bg-surface-container-low border border-outline-variant/40 rounded-xl py-2 px-3 text-xs font-medium text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Semua Peran</option>
                <option value="patient">Pasien</option>
                <option value="doctor">Dokter</option>
                <option value="pharmacy_staff">Farmasi</option>
                <option value="admin">Admin</option>
              </select>

              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className="bg-surface-container-low border border-outline-variant/40 rounded-xl py-2 px-3 text-xs font-medium text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="suspended">Ditangguhkan</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            {isUsersLoading ? (
              <div className="p-12 text-center text-on-surface-variant text-sm">
                Memuat data pengguna...
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant text-sm">
                Tidak ada pengguna yang sesuai dengan kriteria filter.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/60 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/20">
                    <th className="py-3.5 px-6">Identitas Pengguna</th>
                    <th className="py-3.5 px-6">Hak Akses / Peran</th>
                    <th className="py-3.5 px-6">Status Akun</th>
                    <th className="py-3.5 px-6">Tanggal Terdaftar</th>
                    <th className="py-3.5 px-6 text-right">Kelola Akun</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/15 text-body-sm">
                  {users.map((u) => {
                    const isSuspended = u.status === "suspended";
                    return (
                      <tr key={u.id} className="hover:bg-surface-container-low/40 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <Avatar name={u.full_name} size="md" />
                            <div>
                              <p className="font-bold text-on-surface">{u.full_name}</p>
                              <p className="text-xs text-on-surface-variant">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-1.5">
                            {u.roles?.map((r) => {
                              const roleBadgeColor =
                                r === "admin"
                                  ? "bg-purple-500/15 text-purple-700"
                                  : r === "doctor"
                                  ? "bg-blue-500/15 text-blue-700"
                                  : r === "pharmacy_staff"
                                  ? "bg-emerald-500/15 text-emerald-700"
                                  : "bg-teal-500/15 text-teal-700";
                              return (
                                <span
                                  key={r}
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${roleBadgeColor}`}
                                >
                                  {r}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {isSuspended ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-error/15 text-error">
                              <span className="material-symbols-outlined text-[14px]">block</span>
                              Ditangguhkan
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700">
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                              Aktif
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-xs text-on-surface-variant">
                          {new Date(u.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-4 px-6 text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAssignRoleModalUser(u)}
                            className="rounded-xl text-xs py-1"
                          >
                            + Peran
                          </Button>
                          <Button
                            variant={isSuspended ? "primary" : "outline"}
                            size="sm"
                            isLoading={suspendUserMutation.isPending}
                            onClick={() => handleToggleSuspend(u.id, u.status)}
                            className={`rounded-xl text-xs py-1 ${
                              isSuspended
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "text-error border-error/40 hover:bg-error/10"
                            }`}
                          >
                            {isSuspended ? "Aktifkan" : "Suspend"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {/* TAB 3: AUDIT LOG KEAMANAN */}
      {activeTab === "audit" && (
        <Card className="rounded-3xl border border-outline-variant/30 bg-surface shadow-xs overflow-hidden">
          <div className="p-6 border-b border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-on-surface">
                Rekaman Log Audit & Integritas Medis
              </h2>
              <p className="text-body-xs text-on-surface-variant">
                Pencatatan real-time immutable setiap akses rekam medis, verifikasi dokter, dan mutasi otorisasi akun.
              </p>
            </div>
            <div className="text-xs text-on-surface-variant font-medium">
              Menampilkan {auditLogs.length} entri audit terbaru
            </div>
          </div>

          <div className="overflow-x-auto">
            {isAuditLogsLoading ? (
              <div className="p-12 text-center text-on-surface-variant text-sm">
                Memuat catatan audit log...
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant text-sm">
                Belum ada rekaman audit log.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/60 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/20">
                    <th className="py-3.5 px-6">Waktu Kejadian</th>
                    <th className="py-3.5 px-6">Aktivitas (Action)</th>
                    <th className="py-3.5 px-6">Target Entitas</th>
                    <th className="py-3.5 px-6">Alamat IP & Klien</th>
                    <th className="py-3.5 px-6">Metadata Aktivitas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/15 text-body-sm font-mono text-xs">
                  {auditLogs.map((log) => {
                    return (
                      <tr key={log.id} className="hover:bg-surface-container-low/40 transition-colors">
                        <td className="py-3.5 px-6 text-on-surface font-sans">
                          {new Date(log.created_at).toLocaleString("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "medium",
                          })}
                        </td>
                        <td className="py-3.5 px-6 font-bold text-primary">
                          {log.action}
                        </td>
                        <td className="py-3.5 px-6 text-on-surface-variant">
                          <span className="font-semibold text-on-surface">{log.target_type}</span>: {log.target_id.slice(0, 8)}...
                        </td>
                        <td className="py-3.5 px-6 text-on-surface-variant font-sans">
                          <p className="font-mono text-xs font-semibold text-on-surface">{log.ip_address}</p>
                          <p className="text-[10px] text-on-surface-variant/70 truncate max-w-xs">{log.user_agent}</p>
                        </td>
                        <td className="py-3.5 px-6 text-on-surface-variant font-mono text-[11px]">
                          {log.metadata ? JSON.stringify(log.metadata) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {/* Modal Penetapan Peran Privileged */}
      {assignRoleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl border border-outline-variant/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-on-surface">
                Tambah Peran Pengguna
              </h3>
              <button
                type="button"
                onClick={() => setAssignRoleModalUser(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-body-sm text-on-surface-variant">
              Berikan hak akses istimewa untuk pengguna:
              <br />
              <strong className="text-on-surface">{assignRoleModalUser.full_name}</strong> ({assignRoleModalUser.email})
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant">
                Pilih Peran Tambahan:
              </label>
              <select
                value={selectedRoleToAssign}
                onChange={(e) => setSelectedRoleToAssign(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl py-2.5 px-3 text-sm font-semibold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="pharmacy_staff">Staf Farmasi (pharmacy_staff)</option>
                <option value="admin">Administrator Sistem (admin)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => setAssignRoleModalUser(null)}
                className="rounded-xl"
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="md"
                isLoading={assignRoleMutation.isPending}
                onClick={handleConfirmAssignRole}
                className="rounded-xl font-bold"
              >
                Tetapkan Peran
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
