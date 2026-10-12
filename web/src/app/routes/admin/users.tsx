import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useAdminUsers,
  useSuspendUserMutation,
  useAssignRoleMutation,
  useUpdateUserMutation,
} from "../../../features/admin/hooks/use-admin";
import { formatRoleLabel } from "../../../features/admin/types";
import type { AdminUser } from "../../../features/admin/types";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Avatar } from "../../../components/ui/Avatar";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [assignRoleModalUser, setAssignRoleModalUser] = useState<AdminUser | null>(null);
  const [selectedRoleToAssign, setSelectedRoleToAssign] = useState("pharmacy_staff");

  // State Modal Edit Data Pengguna
  const [editUserModal, setEditUserModal] = useState<AdminUser | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editError, setEditError] = useState("");

  // State Konfirmasi Status Pengguna (Suspend / Activate)
  const [confirmSuspendUser, setConfirmSuspendUser] = useState<{
    user: AdminUser;
    newStatus: "suspended" | "active";
  } | null>(null);

  const { data: users = [], isLoading } = useAdminUsers({
    search: searchQuery || undefined,
    role: roleFilter || undefined,
    status: statusFilter || undefined,
    limit: 50,
  });

  const suspendUserMutation = useSuspendUserMutation();
  const assignRoleMutation = useAssignRoleMutation();
  const updateUserMutation = useUpdateUserMutation();

  const handleOpenEdit = (user: AdminUser) => {
    setEditUserModal(user);
    setEditFullName(user.full_name);
    setEditEmail(user.email);
    setEditPhoneNumber(user.phone_number || "");
    setEditError("");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    if (!editFullName.trim()) {
      setEditError("Nama lengkap wajib diisi.");
      return;
    }
    if (!editEmail.trim() || !editEmail.includes("@")) {
      setEditError("Format alamat email tidak valid.");
      return;
    }
    if (!editUserModal) return;

    try {
      await updateUserMutation.mutateAsync({
        userId: editUserModal.id,
        payload: {
          full_name: editFullName.trim(),
          email: editEmail.trim().toLowerCase(),
          phone_number: editPhoneNumber.trim() || undefined,
        },
      });
      setEditUserModal(null);
    } catch (err: any) {
      setEditError(err?.message || "Gagal memperbarui data pengguna. Pastikan email belum digunakan.");
    }
  };

  const handleToggleSuspend = (user: AdminUser) => {
    const isCurrentlySuspended = user.status === "suspended";
    const newStatus = isCurrentlySuspended ? "active" : "suspended";
    setConfirmSuspendUser({ user, newStatus });
  };

  const handleExecuteSuspend = () => {
    if (!confirmSuspendUser) return;
    const { user, newStatus } = confirmSuspendUser;
    const reason =
      newStatus === "suspended"
        ? "Penangguhan administratif oleh Super Admin"
        : "Pengaktifan kembali akun oleh Super Admin";

    suspendUserMutation.mutate(
      { userId: user.id, status: newStatus, reason },
      {
        onSettled: () => setConfirmSuspendUser(null),
      }
    );
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

  const totalActive = users.filter((u) => u.status === "active").length;
  const totalSuspended = users.filter((u) => u.status === "suspended").length;

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-surface border border-outline-variant/30 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-2">
            <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
            Manajemen Pengguna Layanan
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Pengelolaan Akun & Peran Pengguna
          </h1>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Pantau status pengguna aktif, kelola hak akses peran, atau tangguhkan akun yang melanggar ketentuan layanan.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <p className="text-[11px] font-bold text-emerald-800">Akun Aktif</p>
            <p className="font-display text-2xl font-black text-emerald-700">{totalActive}</p>
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
            <p className="text-[11px] font-bold text-rose-800">Ditangguhkan</p>
            <p className="font-display text-2xl font-black text-rose-700">{totalSuspended}</p>
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
              placeholder="Cari nama atau email pengguna..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-surface-container-low border border-outline-variant/40 rounded-xl py-2 px-3 text-xs font-medium text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Semua Peran</option>
              <option value="patient">Pasien</option>
              <option value="doctor">Dokter</option>
              <option value="pharmacy_staff">Farmasi</option>
              <option value="admin">Administrator</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-surface-container-low border border-outline-variant/40 rounded-xl py-2 px-3 text-xs font-medium text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="suspended">Ditangguhkan</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-on-surface-variant text-sm">
              Memuat data pengguna...
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant text-sm">
              Tidak ada pengguna yang memenuhi filter pencarian.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/60 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/20">
                  <th className="py-3.5 px-6">Identitas Pengguna</th>
                  <th className="py-3.5 px-6">Hak Akses / Peran</th>
                  <th className="py-3.5 px-6">Status Akun</th>
                  <th className="py-3.5 px-6">Tanggal Registrasi</th>
                  <th className="py-3.5 px-6 text-right">Aksi Manajemen</th>
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
                                className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold ${roleBadgeColor}`}
                              >
                                {formatRoleLabel(r)}
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
                          onClick={() => handleOpenEdit(u)}
                          className="rounded-xl text-xs py-1"
                        >
                          <span className="material-symbols-outlined text-[14px] mr-1">edit</span>
                          Edit
                        </Button>
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
                          onClick={() => handleToggleSuspend(u)}
                          className={`rounded-xl text-xs py-1 ${
                            isSuspended
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "text-error border-error/40 hover:bg-error/10"
                          }`}
                        >
                          {isSuspended ? "Aktifkan" : "Tangguhkan"}
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

      {/* Modal Penetapan Peran */}
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
                <option value="pharmacy_staff">Staf Farmasi</option>
                <option value="admin">Administrator Sistem</option>
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

      {/* Modal Edit Informasi Pengguna */}
      {editUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl border border-outline-variant/40 space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2 text-primary font-bold">
                <span className="material-symbols-outlined text-[22px]">manage_accounts</span>
                <h3 className="font-display text-lg text-on-surface">
                  Edit Informasi Pengguna
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditUserModal(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="Nama lengkap pengguna"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">
                  Alamat Email Akun
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-[11px] text-on-surface-variant/80 mt-1">
                  Email ini digunakan pengguna untuk masuk ke sistem.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">
                  Nomor Telepon (Opsional)
                </label>
                <input
                  type="tel"
                  value={editPhoneNumber}
                  onChange={(e) => setEditPhoneNumber(e.target.value)}
                  placeholder="+628123456789"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-[11px] text-on-surface-variant flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-[16px] shrink-0 mt-0.5">verified_user</span>
                <span>
                  Perubahan email akan langsung memperbarui kredensial masuk akun dan otomatis dicatat ke dalam <strong>Catatan Keamanan Layanan</strong>.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/20">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditUserModal(null)}
                  className="rounded-xl text-xs py-1.5"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={updateUserMutation.isPending}
                  className="rounded-xl text-xs py-1.5 font-bold px-4"
                >
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Tangguhkan / Aktifkan Akun */}
      <ConfirmDialog
        isOpen={!!confirmSuspendUser}
        onClose={() => setConfirmSuspendUser(null)}
        onConfirm={handleExecuteSuspend}
        isLoading={suspendUserMutation.isPending}
        variant={confirmSuspendUser?.newStatus === "suspended" ? "danger" : "primary"}
        title={
          confirmSuspendUser?.newStatus === "suspended"
            ? "Konfirmasi Penangguhan Akun"
            : "Konfirmasi Pengaktifan Akun"
        }
        description={
          confirmSuspendUser?.newStatus === "suspended" ? (
            <span>
              Apakah Anda yakin ingin menangguhkan akun pengguna{" "}
              <strong>{confirmSuspendUser.user.full_name}</strong> (
              <span className="font-mono text-xs">{confirmSuspendUser.user.email}</span>)?
              Pengguna tidak akan dapat masuk ke sistem sampai akun diaktifkan kembali.
            </span>
          ) : (
            <span>
              Apakah Anda yakin ingin mengaktifkan kembali akun pengguna{" "}
              <strong>{confirmSuspendUser?.user.full_name}</strong> (
              <span className="font-mono text-xs">{confirmSuspendUser?.user.email}</span>)?
              Pengguna akan dapat kembali mengakses layanan TeleMedHub seperti semula.
            </span>
          )
        }
        confirmText={
          confirmSuspendUser?.newStatus === "suspended"
            ? "Ya, Tangguhkan Akun"
            : "Ya, Aktifkan Akun"
        }
        cancelText="Batal"
      />
    </div>
  );
}
