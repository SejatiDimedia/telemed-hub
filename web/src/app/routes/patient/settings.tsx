import { createFileRoute } from "@tanstack/react-router";
import { usePatientProfile, useUpdatePatientProfile } from "../../../features/patient/hooks/use-patient-profile";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { useEffect } from "react";
import { ApiError } from "../../../lib/api-client";

export const Route = createFileRoute("/patient/settings")({
  component: PatientSettingsPage,
});

const settingsSchema = zod.object({
  phone_number: zod.string()
    .min(1, "Nomor telepon wajib diisi")
    .regex(/^\+?[1-9]\d{1,14}$/, "Format nomor telepon tidak valid (E.164, misal: +6281234567890)"),
  date_of_birth: zod.string()
    .min(1, "Tanggal lahir wajib diisi")
    .refine((date) => new Date(date).getTime() < Date.now(), "Tanggal lahir tidak boleh di masa depan"),
  gender: zod.string().min(1, "Pilih jenis kelamin"),
  blood_type: zod.string().min(1, "Pilih golongan darah"),
});

type SettingsFormValues = zod.infer<typeof settingsSchema>;

function PatientSettingsPage() {
  const { data: profile, isLoading } = usePatientProfile();
  const { mutateAsync: updateProfile, isPending: isUpdating } = useUpdatePatientProfile();

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      phone_number: "",
      date_of_birth: "",
      gender: "",
      blood_type: "A+",
    },
  });

  // Pre-fill form values when profile data is loaded
  useEffect(() => {
    if (profile) {
      setValue("phone_number", profile.phone_number ?? "");
      setValue("date_of_birth", profile.date_of_birth ?? "");
      setValue("gender", profile.gender ?? "");
      setValue("blood_type", profile.blood_type ?? "A+");
    }
  }, [profile, setValue]);

  const onSubmit = async (data: SettingsFormValues) => {
    try {
      await updateProfile(data);
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        for (const detail of err.details) {
          setError(detail.field as any, {
            type: "server",
            message: detail.issue,
          });
        }
      }
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-on-surface-variant animate-pulse font-semibold">Memuat pengaturan profil...</div>;
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto">
      {/* Page Header */}
      <section className="flex flex-col gap-2 select-none">
        <h1 className="font-display text-headline-lg text-primary font-bold">Pengaturan Akun & Profil</h1>
        <p className="font-body text-body-lg text-on-surface-variant leading-relaxed">
          Kelola data pribadi Anda, informasi kontak medis, dan preferensi akun pasien TeleMedHub di sini.
        </p>
      </section>

      {/* Main Settings Form */}
      <Card variant="elevation" className="p-6 border border-outline-variant/10">
        <h3 className="font-display text-headline-sm font-bold text-on-surface mb-6 select-none flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">person</span>
          Informasi Demografis & Kontak
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          {/* Read-only Name and Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 select-none">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                disabled
                value={profile?.full_name ?? ""}
                className="w-full bg-surface-container-low border border-outline-variant/30 text-on-surface-variant rounded-lg py-2.5 px-3 text-sm outline-none cursor-not-allowed font-medium"
              />
              <p className="text-[10px] text-on-surface-variant/70 mt-1">Nama lengkap hanya dapat diubah oleh Admin.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1">
                Email Terdaftar
              </label>
              <input
                type="email"
                disabled
                value={profile?.email ?? ""}
                className="w-full bg-surface-container-low border border-outline-variant/30 text-on-surface-variant rounded-lg py-2.5 px-3 text-sm outline-none cursor-not-allowed font-medium"
              />
              <p className="text-[10px] text-on-surface-variant/70 mt-1">Email adalah identitas masuk akun Anda.</p>
            </div>
          </div>

          <div className="h-px bg-outline-variant/20 w-full"></div>

          {/* Editable Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="settings_phone" className="block text-xs font-bold text-on-surface-variant mb-1 select-none">
                Nomor Telepon
              </label>
              <input
                id="settings_phone"
                type="tel"
                placeholder="misal: +6281234567890"
                {...register("phone_number")}
                className="w-full bg-white border border-outline-variant/50 rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-1 focus:ring-primary transition-all"
              />
              {errors.phone_number && (
                <p className="text-xs text-error font-semibold mt-1">{errors.phone_number.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="settings_dob" className="block text-xs font-bold text-on-surface-variant mb-1 select-none">
                Tanggal Lahir
              </label>
              <input
                id="settings_dob"
                type="date"
                {...register("date_of_birth")}
                className="w-full bg-white border border-outline-variant/50 rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-1 focus:ring-primary transition-all"
              />
              {errors.date_of_birth && (
                <p className="text-xs text-error font-semibold mt-1">{errors.date_of_birth.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="settings_gender" className="block text-xs font-bold text-on-surface-variant mb-1 select-none">
                Jenis Kelamin
              </label>
              <select
                id="settings_gender"
                {...register("gender")}
                className="w-full bg-white border border-outline-variant/50 rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-1 focus:ring-primary transition-all"
              >
                <option value="">Pilih...</option>
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
              </select>
              {errors.gender && (
                <p className="text-xs text-error font-semibold mt-1">{errors.gender.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="settings_blood" className="block text-xs font-bold text-on-surface-variant mb-1 select-none">
                Golongan Darah
              </label>
              <select
                id="settings_blood"
                {...register("blood_type")}
                className="w-full bg-white border border-outline-variant/50 rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-1 focus:ring-primary transition-all"
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
              {errors.blood_type && (
                <p className="text-xs text-error font-semibold mt-1">{errors.blood_type.message}</p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            isLoading={isUpdating}
            leftIcon="check"
            className="w-full py-3.5 rounded-xl font-bold mt-4 select-none"
          >
            Simpan Perubahan
          </Button>
        </form>
      </Card>
    </div>
  );
}
