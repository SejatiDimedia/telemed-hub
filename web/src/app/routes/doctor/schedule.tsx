import { createFileRoute } from "@tanstack/react-router";
import { useDoctorProfileMe, useDoctorAvailability, useCreateAvailability, useDeleteAvailability } from "../../../features/doctor/hooks/use-doctors";
import type { Availability } from "../../../features/doctor/types";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { EmptyState } from "../../../components/shared/EmptyState";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/doctor/schedule")({
  component: DoctorSchedulePage,
});

function DoctorSchedulePage() {
  const { data: profile, isLoading: isProfileLoading } = useDoctorProfileMe();
  const { data: availability, isLoading: isAvailabilityLoading } = useDoctorAvailability(profile?.id ?? "");

  const { mutateAsync: createAvailability, isPending: isCreating } = useCreateAvailability();
  const { mutateAsync: deleteAvailability, isPending: isDeleting } = useDeleteAvailability();

  // Create slot form state
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [formError, setFormError] = useState("");

  // Group availability by date
  const groupedAvailability = useMemo(() => {
    if (!availability) return {};
    const groups: Record<string, Availability[]> = {};
    
    // Sort slots by start_time ascending
    const sortedSlots = [...availability].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    for (const slot of sortedSlots) {
      const dateKey = slot.start_time.split("T")[0] ?? "";
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(slot);
    }
    return groups;
  }, [availability]);

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!date) {
      setFormError("Tanggal wajib ditentukan.");
      return;
    }

    const startDateTime = new Date(`${date}T${startTime}:00`);
    const endDateTime = new Date(`${date}T${endTime}:00`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      setFormError("Format tanggal atau waktu tidak valid.");
      return;
    }

    if (startDateTime.getTime() <= Date.now()) {
      setFormError("Jadwal harus di masa depan.");
      return;
    }

    if (endDateTime.getTime() <= startDateTime.getTime()) {
      setFormError("Waktu selesai harus setelah waktu mulai.");
      return;
    }

    try {
      await createAvailability({
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
      });
      // Reset form fields
      setDate("");
      setStartTime("09:00");
      setEndTime("10:00");
    } catch (err: any) {
      setFormError(err.message || "Gagal menambahkan slot ketersediaan.");
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus slot ketersediaan ini?")) return;
    try {
      await deleteAvailability(slotId);
    } catch {
      // Handled
    }
  };

  const formatDateHeader = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      return new Date(timeStr).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timeStr;
    }
  };

  if (isProfileLoading) {
    return <div className="p-8 text-center text-on-surface-variant animate-pulse font-semibold">Memuat profil dokter...</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Page Header */}
      <section className="flex flex-col md:flex-row justify-between items-end gap-6 select-none">
        <div className="max-w-2xl">
          <h1 className="font-display text-headline-lg text-primary mb-2 font-bold">Kelola Jadwal Praktek</h1>
          <p className="font-body text-body-lg text-on-surface-variant leading-relaxed">
            Daftarkan slot ketersediaan waktu konsultasi video-call Anda di sini agar pasien dapat memesan jadwal secara langsung.
          </p>
        </div>
      </section>

      {/* Main Grid: Add Slot vs Calendar List */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* Left Column: Form to Add Slot */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <Card variant="elevation" className="p-6 border border-outline-variant/10">
            <h3 className="font-display text-headline-sm font-bold text-on-surface mb-6 select-none">Tambah Slot Baru</h3>
            
            <form onSubmit={handleCreateSlot} className="flex flex-col gap-4">
              <div>
                <label htmlFor="slot_date" className="block text-xs font-bold text-on-surface-variant mb-1 select-none">
                  Tanggal Praktek
                </label>
                <input
                  id="slot_date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full bg-white border border-outline-variant/50 rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-1 focus:ring-primary transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="slot_start" className="block text-xs font-bold text-on-surface-variant mb-1 select-none">
                    Jam Mulai
                  </label>
                  <input
                    id="slot_start"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-white border border-outline-variant/50 rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="slot_end" className="block text-xs font-bold text-on-surface-variant mb-1 select-none">
                    Jam Selesai
                  </label>
                  <input
                    id="slot_end"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-white border border-outline-variant/50 rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              {formError && (
                <p className="text-xs text-error font-semibold select-none">{formError}</p>
              )}

              <Button
                type="submit"
                isLoading={isCreating}
                leftIcon="add"
                className="w-full py-3 rounded-xl font-bold mt-2"
              >
                Tambahkan Slot
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: Existing Slots */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <Card variant="elevation" className="p-6 border border-outline-variant/10">
            <h3 className="font-display text-headline-sm font-bold text-on-surface mb-6 select-none">Jadwal Aktif Anda</h3>

            {isAvailabilityLoading ? (
              <div className="flex flex-col gap-4 animate-pulse">
                <div className="h-6 bg-surface-container rounded w-1/4"></div>
                <div className="h-14 bg-surface-container rounded"></div>
              </div>
            ) : Object.keys(groupedAvailability).length > 0 ? (
              <div className="flex flex-col gap-6 max-h-[600px] overflow-y-auto pr-1">
                {Object.entries(groupedAvailability).map(([dateKey, slots]) => (
                  <div key={dateKey} className="flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider select-none">
                      {formatDateHeader(dateKey)}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {slots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`p-4 rounded-xl border flex justify-between items-center transition-all ${
                            slot.is_booked
                              ? "bg-primary/5 border-primary/20"
                              : "bg-surface-container-lowest border-outline-variant/20 hover:border-outline-variant"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`material-symbols-outlined text-[20px] select-none ${slot.is_booked ? "text-primary" : "text-on-surface-variant"}`}>
                              schedule
                            </span>
                            <div>
                              <p className="text-sm font-bold text-on-surface">
                                {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                              </p>
                              <p className="text-[11px] font-semibold mt-0.5">
                                {slot.is_booked ? (
                                  <span className="text-primary">Terbooking</span>
                                ) : (
                                  <span className="text-on-surface-variant/70">Tersedia</span>
                                )}
                              </p>
                            </div>
                          </div>

                          {!slot.is_booked && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSlot(slot.id)}
                              disabled={isDeleting}
                              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-error/5 text-error border border-transparent hover:border-error/10 transition-all focus:outline-none"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="calendar_today"
                title="Belum Ada Slot Jadwal"
                description="Anda belum menambahkan slot ketersediaan waktu untuk praktek medis Anda."
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
