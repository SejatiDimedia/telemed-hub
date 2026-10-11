import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { usePatientProfile } from "../../../features/patient/hooks/use-patient-profile";
import { useAppointments } from "../../../features/appointment/hooks/use-appointments";
import { useDoctors } from "../../../features/doctor/hooks/use-doctors";
import { useWallet } from "../../../features/wallet/hooks/use-wallet";
import { usePrescriptions } from "../../../features/prescription/hooks/use-prescriptions";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/shared/EmptyState";
import { Button } from "../../../components/ui/Button";
import { Avatar } from "../../../components/ui/Avatar";
import { Badge } from "../../../components/ui/Badge";

export const Route = createFileRoute("/patient/")({
  component: PatientDashboard,
});

function PatientDashboard() {
  const navigate = useNavigate();

  // Real data queries
  const { data: profile, isLoading: isProfileLoading } = usePatientProfile();
  const { data: appointments, isLoading: isAppointmentsLoading } = useAppointments();
  const { data: doctors } = useDoctors();
  const { data: wallet } = useWallet();
  const { data: prescriptions } = usePrescriptions();

  const patientName = profile?.full_name ?? "Pasien";
  const patientBlood = profile?.blood_type ?? "Belum diisi";
  const patientCode = profile?.id ? `#TMH-${profile.id.slice(0, 6).toUpperCase()}` : "#TMH-PATIENT";
  const walletBalance = wallet?.balance ?? 0;

  // Filter in_progress, scheduled, pending, or confirmed appointments
  const activeAppointments = appointments?.filter(
    (apt) => apt.status === "in_progress" || apt.status === "scheduled" || apt.status === "pending" || apt.status === "confirmed"
  ) ?? [];

  // Active in-progress consultation
  const inProgressAppointment = appointments?.find((apt) => apt.status === "in_progress");
  const inProgressDoctor = inProgressAppointment && doctors
    ? doctors.find((d) => d.id === inProgressAppointment.doctor_id)
    : null;

  // Sort by date ascending to get next upcoming
  const nextAppointment = [...activeAppointments].sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  )[0];

  // Resolve Doctor details
  const nextDoctor = nextAppointment && doctors
    ? doctors.find((d) => d.id === nextAppointment.doctor_id)
    : null;

  const nextDoctorName = nextDoctor?.full_name ?? "Dokter Mitra";
  const nextDoctorSpecialty = nextDoctor?.specialty?.name ?? "Dokter Spesialis";

  const formatAppointmentDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const day = d.getDate();
      const month = d.toLocaleString("id-ID", { month: "short" }).toUpperCase();
      const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      const fullDate = d.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      return { day, month, time, fullDate };
    } catch {
      return { day: "-", month: "-", time: "-", fullDate: "-" };
    }
  };

  const nextDate = nextAppointment ? formatAppointmentDate(nextAppointment.scheduled_at) : null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);
  };

  const activePrescriptionsCount = prescriptions?.filter((p) => p.status === "active").length ?? 0;

  return (
    <div className="flex flex-col gap-8 max-w-6xl">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-on-surface tracking-tight mb-2">
            Selamat Datang, <span className="text-primary">{patientName}</span>
          </h1>
          <p className="text-body-md text-on-surface-variant leading-relaxed max-w-2xl">
            Kelola jadwal konsultasi, status resep obat, dan dokumen rekam medis Anda dalam satu portal terpadu.
          </p>
        </div>
        <div>
          <Button
            variant="primary"
            leftIcon="add_circle"
            onClick={() => navigate({ to: "/patient/appointments" })}
            className="rounded-xl px-5 py-2.5 font-semibold text-sm shadow-sm"
          >
            Konsultasi Baru
          </Button>
        </div>
      </section>

      {/* Live In-Progress Consultation Banner */}
      {inProgressAppointment && (
        <div className="p-4 sm:p-5 bg-emerald-500/10 border-2 border-emerald-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-pulse">
          <div className="flex items-center gap-3.5">
            <span className="relative flex h-4 w-4 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
            </span>
            <div>
              <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                Sesi Konsultasi Medis Sedang Berlangsung!
                <Badge variant="success" className="text-[10px] py-0.5">LIVE</Badge>
              </h4>
              <p className="text-xs text-emerald-800 font-medium mt-0.5">
                {inProgressDoctor ? inProgressDoctor.full_name : "Dokter Anda"} sudah menunggu di Ruang Konsultasi Interaktif.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              void navigate({
                to: "/patient/consultation/$consultationId",
                params: { consultationId: inProgressAppointment.id },
              })
            }
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">videocam</span>
            Masuk Ruang Konsultasi
          </Button>
        </div>
      )}

      {/* Real Patient Status Overview (4 Truthful Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Upcoming Appointments */}
        <Card variant="elevation" className="p-5 border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-on-surface-variant">Janji Temu Aktif</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">event</span>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-on-surface">
              {isAppointmentsLoading ? "..." : activeAppointments.length}
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              {activeAppointments.length > 0 ? "Jadwal konsultasi terdaftar" : "Tidak ada antrean hari ini"}
            </p>
          </div>
        </Card>

        {/* Metric 2: Digital Wallet Balance */}
        <Card variant="elevation" className="p-5 border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-on-surface-variant">Saldo Dompet</span>
            <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-on-surface">
              {formatCurrency(walletBalance)}
            </h3>
            <Link to="/patient/wallet" className="text-xs text-primary font-semibold hover:underline mt-1 inline-block">
              + Isi Saldo Dompet
            </Link>
          </div>
        </Card>

        {/* Metric 3: Active Prescriptions */}
        <Card variant="elevation" className="p-5 border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-on-surface-variant">Resep Perlu Ditebus</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">medication</span>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-on-surface">
              {activePrescriptionsCount}
            </h3>
            <Link to="/patient/orders" className="text-xs text-primary font-semibold hover:underline mt-1 inline-block">
              Lihat di Daftar Resep →
            </Link>
          </div>
        </Card>

        {/* Metric 4: Patient Info */}
        <Card variant="elevation" className="p-5 border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-on-surface-variant">Golongan Darah</span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">bloodtype</span>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-on-surface">
              {patientBlood}
            </h3>
            <p className="text-xs text-on-surface-variant mt-1 font-mono">
              {patientCode}
            </p>
          </div>
        </Card>
      </div>

      {/* Main Grid: Left Next Appointment & Activity / Right AI Triage & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Upcoming Appointment Section */}
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-on-surface">
              Jadwal Konsultasi Terdekat
            </h2>
            <Link to="/patient/appointments" className="text-xs font-bold text-primary hover:underline">
              Lihat Semua Jadwal →
            </Link>
          </div>

          {isAppointmentsLoading || isProfileLoading ? (
            <div className="h-44 w-full bg-surface-container rounded-2xl animate-pulse"></div>
          ) : nextAppointment ? (
            <Card variant="elevation" className="p-6 rounded-2xl border border-outline-variant/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <Avatar
                    src={nextDoctor?.profile_picture_url ?? undefined}
                    name={nextDoctorName}
                    size="lg"
                    className="w-16 h-16 rounded-2xl"
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-base text-on-surface">
                        {nextDoctorName}
                      </h3>
                      <Badge variant="primary" className="text-[10px] py-0.5 uppercase">
                        {nextAppointment.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-on-surface-variant font-medium">
                      {nextDoctorSpecialty}
                    </p>
                    <p className="text-xs text-on-surface-variant/80 mt-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-primary">schedule</span>
                      {nextDate?.fullDate} • Pukul {nextDate?.time} WIB
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 pt-4 sm:pt-0 border-t sm:border-t-0 border-outline-variant/20">
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-on-surface-variant block">Biaya Konsultasi</span>
                    <span className="text-sm font-bold text-primary">
                      {formatCurrency(Number(nextDoctor?.consultation_fee ?? 0))}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() =>
                        void navigate({
                          to: "/patient/consultation/$consultationId",
                          params: { consultationId: nextAppointment.id },
                        })
                      }
                      className="rounded-xl px-4 font-bold text-xs flex items-center gap-1.5 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">videocam</span>
                      Masuk Ruangan
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate({ to: "/patient/appointments" })}
                      className="rounded-xl px-3 font-semibold text-xs"
                    >
                      Detail
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <EmptyState
              icon="calendar_today"
              title="Belum Ada Jadwal Konsultasi"
              description="Anda belum memiliki antrean konsultasi terdekat. Cari dokter spesialis kami dan pilih waktu konsultasi yang sesuai."
              actionLabel="Jadwalkan Konsultasi"
              onActionClick={() => navigate({ to: "/patient/appointments" })}
              actionIcon="add_circle"
            />
          )}

          {/* Quick Action Cards (Real Functional Hub) */}
          <div className="mt-2">
            <h2 className="font-display text-lg font-bold text-on-surface mb-4">
              Layanan Utama
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                to="/patient/appointments"
                className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 hover:border-primary/50 hover:bg-surface-container transition-all flex flex-col items-center text-center gap-2 group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[22px]">calendar_month</span>
                </div>
                <span className="text-xs font-bold text-on-surface">Konsultasi</span>
                <span className="text-[10px] text-on-surface-variant">Pilih Dokter</span>
              </Link>

              <Link
                to="/patient/ai-triage"
                className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 hover:border-primary/50 hover:bg-surface-container transition-all flex flex-col items-center text-center gap-2 group"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center group-hover:bg-secondary group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[22px]">smart_toy</span>
                </div>
                <span className="text-xs font-bold text-on-surface">AI Triage</span>
                <span className="text-[10px] text-on-surface-variant">Deteksi Dini</span>
              </Link>

              <Link
                to="/patient/orders"
                className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 hover:border-primary/50 hover:bg-surface-container transition-all flex flex-col items-center text-center gap-2 group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[22px]">medication</span>
                </div>
                <span className="text-xs font-bold text-on-surface">Resep Obat</span>
                <span className="text-[10px] text-on-surface-variant">Tebus Resep</span>
              </Link>

              <Link
                to="/patient/records"
                className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 hover:border-primary/50 hover:bg-surface-container transition-all flex flex-col items-center text-center gap-2 group"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center group-hover:bg-secondary group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[22px]">folder_shared</span>
                </div>
                <span className="text-xs font-bold text-on-surface">Rekam Medis</span>
                <span className="text-[10px] text-on-surface-variant">Riwayat Medis</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* AI Triage Banner Card (Direct Functional Hook) */}
          <Card variant="default" className="p-6 rounded-2xl bg-surface-container-low border border-primary/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-on-surface">Asisten AI Triage</h3>
                  <span className="text-[11px] text-primary font-semibold">Skrining Gejala Mandiri</span>
                </div>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-5">
                Konsultasikan keluhan awal Anda secara interaktif untuk mendapatkan saran spesialisasi dokter dan tingkat urgensi medis yang sesuai sebelum membuat janji.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon="chat"
              onClick={() => navigate({ to: "/patient/ai-triage" })}
              className="w-full rounded-xl font-semibold text-xs border-primary text-primary hover:bg-primary/5"
            >
              Mulai Sesi Skrining
            </Button>
          </Card>

          {/* Patient Account Quick Summary */}
          <Card variant="elevation" className="p-6 rounded-2xl border border-outline-variant/30 text-center">
            <div className="w-20 h-20 mx-auto mb-3">
              <Avatar
                src={profile?.profile_picture_url ?? undefined}
                name={patientName}
                size="lg"
                className="w-20 h-20 rounded-full mx-auto"
              />
            </div>
            <h4 className="font-bold text-base text-on-surface">{patientName}</h4>
            <p className="text-xs font-mono text-on-surface-variant mt-0.5 mb-4">{patientCode}</p>

            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-surface-container-low text-xs border border-outline-variant/20 mb-4">
              <div>
                <span className="text-[10px] text-on-surface-variant block">Gol. Darah</span>
                <span className="font-bold text-on-surface">{patientBlood}</span>
              </div>
              <div>
                <span className="text-[10px] text-on-surface-variant block">Jenis Kelamin</span>
                <span className="font-bold text-on-surface">
                  {profile?.gender === "male" ? "Laki-laki" : profile?.gender === "female" ? "Perempuan" : "-"}
                </span>
              </div>
            </div>

            <Link to="/patient/settings">
              <Button variant="text" size="sm" className="w-full text-xs font-semibold text-primary">
                Edit Profil Lengkap →
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
