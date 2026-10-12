import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminDoctors, useVerifyDoctorMutation, adminKeys } from "../../../features/admin/hooks/use-admin";
import { authApi } from "../../../features/auth/api/auth-api";
import { useToastStore } from "../../../stores/toast-store";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Avatar } from "../../../components/ui/Avatar";
import { Input } from "../../../components/ui/Input";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";

export const Route = createFileRoute("/admin/doctors")({
  component: AdminDoctorsPage,
});

function AdminDoctorsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const { data: doctors = [], isLoading } = useAdminDoctors();
  const verifyDoctorMutation = useVerifyDoctorMutation();

  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "verified">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // State Modal Tambah Dokter Baru
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("Rahasia123!");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // State Konfirmasi Pengesahan Dokter
  const [confirmVerifyDoctor, setConfirmVerifyDoctor] = useState<any | null>(null);

  const handleConfirmVerify = () => {
    if (!confirmVerifyDoctor) return;
    verifyDoctorMutation.mutate(confirmVerifyDoctor.id, {
      onSettled: () => setConfirmVerifyDoctor(null),
    });
  };

  const filteredDoctors = doctors.filter((doc) => {
    if (filterStatus === "pending" && doc.is_credential_verified) return false;
    if (filterStatus === "verified" && !doc.is_credential_verified) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = doc.full_name.toLowerCase().includes(q);
      const matchLicense = doc.license_number?.toLowerCase().includes(q);
      const matchSpecialty = doc.specialty?.name?.toLowerCase().includes(q);
      return matchName || matchLicense || matchSpecialty;
    }
    return true;
  });

  const pendingCount = doctors.filter((d) => !d.is_credential_verified).length;
  const verifiedCount = doctors.filter((d) => d.is_credential_verified).length;

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!newFullName.trim()) {
      setFormError("Nama lengkap dokter wajib diisi.");
      return;
    }
    if (!newEmail.trim()) {
      setFormError("Alamat email dokter wajib diisi.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setFormError("Kata sandi minimal 8 karakter.");
      return;
    }

    try {
      setIsSubmitting(true);
      await authApi.register({
        full_name: newFullName.trim(),
        email: newEmail.trim().toLowerCase(),
        password: newPassword,
        role: "doctor",
      });

      // Invalidate queries so the doctor appears immediately in the table
      await queryClient.invalidateQueries({ queryKey: adminKeys.doctors() });
      await queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
      await queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      await queryClient.invalidateQueries({ queryKey: ["doctors"] });

      addToast({
        title: "Dokter Berhasil Ditambahkan",
        message: `Akun dokter ${newFullName} berhasil didaftarkan ke sistem dan masuk ke antrean verifikasi.`,
        type: "success",
      });

      // Reset form & close modal
      setNewFullName("");
      setNewEmail("");
      setNewPassword("Rahasia123!");
      setIsAddModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || "Gagal mendaftarkan dokter baru. Pastikan email belum digunakan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-surface border border-outline-variant/30 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-2">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            Izin Praktik Dokter
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
            Verifikasi & Pengesahan Dokter
          </h1>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Validasi legalitas dokter sebelum dapat membuka jadwal konsultasi untuk pasien.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
            <p className="text-[11px] font-bold text-amber-800">Menunggu Verifikasi</p>
            <p className="font-display text-2xl font-black text-amber-700">{pendingCount}</p>
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <p className="text-[11px] font-bold text-emerald-800">Terverifikasi</p>
            <p className="font-display text-2xl font-black text-emerald-700">{verifiedCount}</p>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
            className="rounded-2xl font-bold py-3 px-4 shadow-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            + Tambah Dokter Baru
          </Button>
        </div>
      </div>

      {/* Info Callout: How Doctors Are Onboarded */}
      <div className="p-4 sm:p-5 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-on-surface-variant">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-[22px] shrink-0 mt-0.5">info</span>
          <div>
            <span className="font-bold text-on-surface">Pendaftaran Praktisi Medis:</span>
            <span className="ml-1">
              Pendaftaran akun dokter dilakukan secara resmi oleh Administrator melalui tombol <strong>+ Tambah Dokter Baru</strong> di atas. Setiap dokter baru akan memiliki status <em>Menunggu Verifikasi</em> hingga izin praktiknya disahkan.
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="rounded-3xl border border-outline-variant/30 bg-surface shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-outline-variant/20 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          <div className="flex-1 max-w-md relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Cari nama dokter, nomor izin praktik, atau spesialisasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filterStatus === "all"
                  ? "bg-primary text-white"
                  : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Semua ({doctors.length})
            </button>
            <button
              onClick={() => setFilterStatus("pending")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filterStatus === "pending"
                  ? "bg-amber-600 text-white"
                  : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Menunggu ({pendingCount})
            </button>
            <button
              onClick={() => setFilterStatus("verified")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filterStatus === "verified"
                  ? "bg-emerald-600 text-white"
                  : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Terverifikasi ({verifiedCount})
            </button>
          </div>
        </div>

        {/* Doctor Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-on-surface-variant text-sm">
              Memuat data dokter...
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant text-sm">
              Tidak ada dokter yang memenuhi filter pencarian.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/60 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/20">
                  <th className="py-3.5 px-6">Nama & Spesialisasi</th>
                  <th className="py-3.5 px-6">No. Izin Praktik</th>
                  <th className="py-3.5 px-6">Tarif Konsultasi</th>
                  <th className="py-3.5 px-6">Rating & Ulasan</th>
                  <th className="py-3.5 px-6">Status Izin Praktik</th>
                  <th className="py-3.5 px-6 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15 text-body-sm">
                {filteredDoctors.map((doc) => {
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
                        {doc.license_number || "Belum dilampirkan"}
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
                            Aktif Berpraktik
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
                          <span className="text-xs text-emerald-700 font-semibold inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-[15px]">check</span>
                            Sudah Disahkan
                          </span>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setConfirmVerifyDoctor(doc)}
                            className="rounded-xl font-bold"
                          >
                            Sahkan Izin Praktik
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

      {/* Modal Tambah Dokter Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-surface p-6 sm:p-8 shadow-2xl border border-outline-variant/40 space-y-6">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">stethoscope</span>
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-on-surface">
                    Tambah Praktisi Medis Baru
                  </h3>
                  <p className="text-body-xs text-on-surface-variant">
                    Daftarkan akun dokter baru langsung ke dalam sistem TeleMedHub
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateDoctor} className="space-y-4">
              <Input
                label="Nama Lengkap & Gelar Medis"
                placeholder="Contoh: dr. Sarah Nurhaliza, Sp.KJ"
                leftIcon="person"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                disabled={isSubmitting}
                className="rounded-xl"
                required
              />

              <Input
                label="Alamat Email Dokter"
                type="email"
                placeholder="sarah.nurhaliza@telemedhub.com"
                leftIcon="mail"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={isSubmitting}
                className="rounded-xl"
                required
              />

              <Input
                label="Kata Sandi Awal"
                type="password"
                placeholder="Minimal 8 karakter"
                leftIcon="lock"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isSubmitting}
                className="rounded-xl"
                required
              />

              <p className="text-[11px] text-on-surface-variant/80">
                Catatan: Dokter yang didaftarkan dapat langsung masuk ke portal dokter menggunakan email dan kata sandi ini setelah izin praktiknya disahkan.
              </p>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-xl"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  className="rounded-xl font-bold px-5"
                >
                  Daftarkan Dokter
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Pengesahan Izin Praktik Dokter */}
      <ConfirmDialog
        isOpen={!!confirmVerifyDoctor}
        onClose={() => setConfirmVerifyDoctor(null)}
        onConfirm={handleConfirmVerify}
        isLoading={verifyDoctorMutation.isPending}
        variant="primary"
        icon="verified"
        title="Konfirmasi Pengesahan Izin Praktik"
        description={
          <span>
            Apakah Anda yakin ingin mengesahkan izin praktik{" "}
            <strong>{confirmVerifyDoctor?.full_name}</strong> (
            {confirmVerifyDoctor?.specialty?.name || "Dokter Umum"})?
            Dokter akan langsung berstatus <strong>Aktif Berpraktik</strong> dan dapat ditemukan oleh pasien untuk sesi konsultasi medis.
          </span>
        }
        confirmText="Ya, Sahkan Izin Praktik"
        cancelText="Batal"
      />
    </div>
  );
}
