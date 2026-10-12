import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAdminAuditLogs } from "../../../features/admin/hooks/use-admin";
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
    const matchAction = log.action.toLowerCase().includes(q);
    const matchTarget = log.target_type?.toLowerCase().includes(q) || log.target_id?.toLowerCase().includes(q);
    const matchIp = log.ip_address?.toLowerCase().includes(q);
    const matchActor = log.actor_id?.toLowerCase().includes(q);
    return matchAction || matchTarget || matchIp || matchActor;
  });

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-surface border border-outline-variant/30 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-2">
            <span className="material-symbols-outlined text-[16px]">security</span>
            Log Audit & Keamanan Medis
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Rekam Jejak Keamanan & Kepatuhan Medis
          </h1>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Pencatatan real-time immutable setiap akses data medis, otorisasi pengguna, dan penanganan insiden privasi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-center">
            <p className="text-[11px] font-bold text-primary">Total Entri Tercatat</p>
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
              placeholder="Cari aktivitas, ID target, atau alamat IP..."
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
              <option value="doctor.verified">doctor.verified</option>
              <option value="user.suspended">user.suspended</option>
              <option value="user.role_assigned">user.role_assigned</option>
              <option value="medical_record.read">medical_record.read</option>
              <option value="medical_record.created">medical_record.created</option>
            </select>

            <select
              value={targetFilter}
              onChange={(e) => setTargetFilter(e.target.value)}
              className="bg-surface-container-low border border-outline-variant/40 rounded-xl py-2 px-3 text-xs font-medium text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Semua Entitas Target</option>
              <option value="doctor">Doctor</option>
              <option value="user">User</option>
              <option value="medical_record">Medical Record</option>
              <option value="appointment">Appointment</option>
            </select>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-on-surface-variant text-sm">
              Memuat data audit log...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant text-sm">
              Tidak ada entri log audit yang sesuai dengan kriteria filter.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/60 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/20">
                  <th className="py-3.5 px-6">Waktu Kejadian</th>
                  <th className="py-3.5 px-6">Aktivitas (Action)</th>
                  <th className="py-3.5 px-6">Target Entitas</th>
                  <th className="py-3.5 px-6">Pelaku (Actor ID)</th>
                  <th className="py-3.5 px-6">Alamat IP & Klien</th>
                  <th className="py-3.5 px-6">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15 text-body-sm">
                {filteredLogs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3.5 px-6 text-on-surface whitespace-nowrap text-xs">
                        {new Date(log.created_at).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "medium",
                        })}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-primary/10 text-primary">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-xs text-on-surface">
                        <span className="font-semibold text-on-surface">{log.target_type}</span>:{" "}
                        <span className="font-mono text-[11px] text-on-surface-variant">
                          {log.target_id.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-xs font-mono text-on-surface-variant">
                        {log.actor_id ? `${log.actor_id.slice(0, 8)}...` : "system"}
                      </td>
                      <td className="py-3.5 px-6 text-xs">
                        <p className="font-mono font-semibold text-on-surface">{log.ip_address || "127.0.0.1"}</p>
                        <p className="text-[11px] text-on-surface-variant truncate max-w-xs" title={log.user_agent}>
                          {log.user_agent || "-"}
                        </p>
                      </td>
                      <td className="py-3.5 px-6 font-mono text-[11px] text-on-surface-variant max-w-xs truncate" title={log.metadata ? JSON.stringify(log.metadata) : ""}>
                        {log.metadata ? (
                          <span className="bg-surface-container-low px-2 py-1 rounded text-[11px]">
                            {JSON.stringify(log.metadata)}
                          </span>
                        ) : (
                          "-"
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
    </div>
  );
}
