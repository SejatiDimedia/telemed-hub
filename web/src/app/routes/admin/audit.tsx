import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAdminAuditLogs } from "../../../features/admin/hooks/use-admin";
import { formatAuditAction, formatTargetType } from "../../../features/admin/types";
import { Card } from "../../../components/ui/Card";

export const Route = createFileRoute("/admin/audit")({
  component: AdminAuditPage,
});

function AdminAuditPage() {
  const [actionFilter, setActionFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: logs = [], isLoading } = useAdminAuditLogs({
    action: actionFilter || undefined,
    target_type: targetFilter || undefined,
    limit: 100,
  });

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const actionLabel = formatAuditAction(log.action).toLowerCase();
    const targetLabel = formatTargetType(log.target_type).toLowerCase();
    const matchAction = log.action.toLowerCase().includes(q) || actionLabel.includes(q);
    const matchTarget = log.target_type?.toLowerCase().includes(q) || targetLabel.includes(q);
    const matchIp = log.ip_address?.toLowerCase().includes(q);
    const matchActor = log.actor_id?.toLowerCase().includes(q);
    return matchAction || matchTarget || matchIp || matchActor;
  });

  const formatMetadataNote = (meta?: Record<string, any>) => {
    if (!meta) return "-";
    if (meta.reason) return String(meta.reason);
    if (meta.notes) return String(meta.notes);
    if (meta.role) return `Peran: ${meta.role}`;
    const keys = Object.keys(meta);
    if (keys.length === 0) return "-";
    return "Aktivitas terverifikasi";
  };

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-surface border border-outline-variant/30 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-2">
            <span className="material-symbols-outlined text-[16px]">security</span>
            Catatan Keamanan Layanan
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Riwayat Keamanan & Akses Data
          </h1>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Pencatatan resmi dan permanen untuk setiap pembaruan akun pengguna, verifikasi dokter, dan perlindungan privasi pasien.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-center">
            <p className="text-[11px] font-bold text-primary">Total Aktivitas</p>
            <p className="font-display text-2xl font-black text-primary">{logs.length}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="rounded-3xl border border-outline-variant/30 bg-surface shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-outline-variant/20 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          <div className="flex-1 max-w-md relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Cari jenis aktivitas atau objek layanan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-surface-container-low border border-outline-variant/40 rounded-xl py-2 px-3 text-xs font-medium text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Semua Aktivitas</option>
              <option value="doctor.verified">Verifikasi Dokter</option>
              <option value="user.suspended">Penangguhan Akun</option>
              <option value="user.role_assigned">Pembaruan Peran</option>
              <option value="medical_record.read">Akses Rekam Medis</option>
              <option value="medical_record.created">Penerbitan Rekam Medis</option>
            </select>

            <select
              value={targetFilter}
              onChange={(e) => setTargetFilter(e.target.value)}
              className="bg-surface-container-low border border-outline-variant/40 rounded-xl py-2 px-3 text-xs font-medium text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Semua Objek Terkait</option>
              <option value="doctor">Profil Dokter</option>
              <option value="user">Akun Pengguna</option>
              <option value="medical_record">Rekam Medis</option>
              <option value="appointment">Konsultasi</option>
            </select>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-on-surface-variant text-sm">
              Memuat catatan riwayat aktivitas...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant text-sm">
              Tidak ada catatan yang sesuai dengan filter pencarian.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/60 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/20">
                  <th className="py-3.5 px-6">Waktu</th>
                  <th className="py-3.5 px-6">Jenis Aktivitas</th>
                  <th className="py-3.5 px-6">Objek Terkait</th>
                  <th className="py-3.5 px-6">Pihak Pelaksana</th>
                  <th className="py-3.5 px-6">Perangkat & Jaringan</th>
                  <th className="py-3.5 px-6">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15 text-body-sm">
                {filteredLogs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3.5 px-6 text-on-surface whitespace-nowrap text-xs">
                        {new Date(log.created_at).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary">
                          {formatAuditAction(log.action)}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-xs text-on-surface font-medium">
                        {formatTargetType(log.target_type)}
                      </td>
                      <td className="py-3.5 px-6 text-xs text-on-surface-variant">
                        {log.actor_id ? "Pengguna Terverifikasi" : "Sistem Layanan"}
                      </td>
                      <td className="py-3.5 px-6 text-xs">
                        <p className="font-semibold text-on-surface">
                          {log.ip_address && log.ip_address !== "127.0.0.1"
                            ? log.ip_address
                            : "Koneksi Aman"}
                        </p>
                        <p className="text-[11px] text-on-surface-variant/70">
                          Aplikasi Web Resmi
                        </p>
                      </td>
                      <td className="py-3.5 px-6 text-xs text-on-surface-variant max-w-xs truncate">
                        {formatMetadataNote(log.metadata)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
