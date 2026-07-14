import { createFileRoute } from "@tanstack/react-router";
import { useDoctorProfileMe, useDoctorAvailability, useCreateAvailability, useCreateAvailabilityBulk, useDeleteAvailability } from "../../../features/doctor/hooks/use-doctors";
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
  const { mutateAsync: createAvailabilityBulk, isPending: isCreatingBulk } = useCreateAvailabilityBulk();
  const { mutateAsync: deleteAvailability, isPending: isDeleting } = useDeleteAvailability();

  // Active form Tab: 'single' | 'range' | 'copy'
  const [activeTab, setActiveTab] = useState<"single" | "range" | "copy">("single");

  // Single slot form state
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");

  // Range slot form state
  const [rangeDate, setRangeDate] = useState("");
  const [rangeStart, setRangeStart] = useState("08:00");
  const [rangeEnd, setRangeEnd] = useState("12:00");
  const [slotDuration, setSlotDuration] = useState("60");

  // Copy day form state
  const [sourceDate, setSourceDate] = useState("");
  const [targetDate, setTargetDate] = useState("");

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

  // Handle single slot submission
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

  // Handle range generator submission
  const handleGenerateRange = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!rangeDate) {
      setFormError("Tanggal wajib ditentukan.");
      return;
    }

    const [startH, startM] = rangeStart.split(":").map(Number);
    const [endH, endM] = rangeEnd.split(":").map(Number);
    if (startH === undefined || startM === undefined || endH === undefined || endM === undefined) {
      setFormError("Format waktu mulai atau selesai tidak valid.");
      return;
    }

    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    const duration = parseInt(slotDuration, 10);

    if (endMin <= startMin) {
      setFormError("Waktu selesai harus setelah waktu mulai.");
      return;
    }

    const slotsToCreate: { start_time: string; end_time: string }[] = [];
    let currentMin = startMin;

    while (currentMin + duration <= endMin) {
      const formatTimePart = (min: number) => {
        const h = Math.floor(min / 60).toString().padStart(2, "0");
        const m = (min % 60).toString().padStart(2, "0");
        return `${h}:${m}`;
      };

      const startStr = formatTimePart(currentMin);
      const endStr = formatTimePart(currentMin + duration);

      const startDateTime = new Date(`${rangeDate}T${startStr}:00`);
      const endDateTime = new Date(`${rangeDate}T${endStr}:00`);

      if (startDateTime.getTime() > Date.now()) {
        slotsToCreate.push({
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
        });
      }

      currentMin += duration;
    }

    if (slotsToCreate.length === 0) {
      setFormError("Tidak ada slot masa depan yang dapat dihasilkan dari rentang waktu ini.");
      return;
    }

    try {
      await createAvailabilityBulk({ slots: slotsToCreate });
      // Reset range states
      setRangeDate("");
      setRangeStart("08:00");
      setRangeEnd("12:00");
    } catch (err: any) {
      setFormError(err.message || "Gagal menghasilkan rentang slot.");
    }
  };

  // Handle copy schedule submission
  const handleCopySchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!sourceDate) {
      setFormError("Pilih hari sumber yang ingin disalin.");
      return;
    }
    if (!targetDate) {
      setFormError("Pilih tanggal tujuan untuk disalin.");
      return;
    }
    if (sourceDate === targetDate) {
      setFormError("Tanggal sumber dan tujuan tidak boleh sama.");
      return;
    }

    const sourceSlots = groupedAvailability[sourceDate];
    if (!sourceSlots || sourceSlots.length === 0) {
      setFormError("Tidak ada slot jadwal pada tanggal sumber.");
      return;
    }

    const slotsToCreate: { start_time: string; end_time: string }[] = [];

    for (const slot of sourceSlots) {
      const startTimePart = slot.start_time.split("T")[1];
      const endTimePart = slot.end_time.split("T")[1];

      if (!startTimePart || !endTimePart) continue;

      const newStartStr = `${targetDate}T${startTimePart}`;
      const newEndStr = `${targetDate}T${endTimePart}`;

      const startDateTime = new Date(newStartStr);
      if (startDateTime.getTime() > Date.now()) {
        slotsToCreate.push({
          start_time: newStartStr,
          end_time: newEndStr,
        });
      }
    }

    if (slotsToCreate.length === 0) {
      setFormError("Tidak ada slot masa depan yang dapat disalin ke tanggal tujuan.");
      return;
    }

    try {
      await createAvailabilityBulk({ slots: slotsToCreate });
      // Reset copy states
      setSourceDate("");
      setTargetDate("");
    } catch (err: any) {
      setFormError(err.message || "Gagal menyalin jadwal.");
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
            
            {/* Segmented Control / Tabs */}
            <div className="flex bg-surface-container-low p-1 rounded-xl mb-6 border border-outline-variant/10">
              <button
                type="button"
                onClick={() => { setActiveTab("single"); setFormError(""); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "single"
                    ? "bg-primary text-white shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Tunggal
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("range"); setFormError(""); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "range"
                    ? "bg-primary text-white shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Rentang Jam
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("copy"); setFormError(""); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === "copy"
                    ? "bg-primary text-white shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Salin Hari
              </button>
            </div>

            {/* TAB: SINGLE SLOT */}
            {activeTab === "single" && (
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
            )}

            {/* TAB: GENERATE RANGE */}
            {activeTab === "range" && (
              <form onSubmit={handleGenerateRange} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="range_date" className="block text-xs font-bold text-on-surface-variant mb-1 select-none">
                    Tanggal Praktek
                  </label>
                  <input
                    id="range_date"
                    type="date"
                    value={rangeDate}
                    onChange={(e) => setRangeDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full bg-white border border-outline-variant/50 rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="range_start" className="block text-xs font-bold text-on-surface-variant mb-1 select-none">
                      Mulai Dari
                    </label>
                    <input
                      id="range_start"
                      type="time"
                      value={rangeStart}
                      onChange={(e) => setRangeStart(e.target.value)}
                      className="w-full bg-white border border-outline-variant/50 rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-1 focus:ring-primary transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="range_end" className="block text-xs font-bold text-on-surface-variant mb-1 select-none">
                      Sampai Jam
                    </label>
                    <input
                      id="range_end"
                      type="time"
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(e.target.value)}
                      className="w-full bg-white border border-outline-variant/50 rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-1 focus:ring-primary transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="slot_duration" className="block text-xs font-bold text-on-surface-variant mb-1 select-none">
                    Durasi per Slot
                  </label>
                  <select
                    id="slot_duration"
                    value={slotDuration}
                    onChange={(e) => setSlotDuration(e.target.value)}
                    className="w-full bg-white border border-outline-variant/50 rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-1 focus:ring-primary transition-all font-semibold"
                  >
                    <option value="30">30 Menit</option>
                    <option value="45">45 Menit</option>
                    <option value="60">1 Jam (Paling Direkomendasikan)</option>
                    <option value="90">1.5 Jam</option>
                    <option value="120">2 Jam</option>
                  </select>
                </div>

                {formError && (
                  <p className="text-xs text-error font-semibold select-none">{formError}</p>
                )}

                <Button
                  type="submit"
                  isLoading={isCreatingBulk}
                  leftIcon="date_range"
                  className="w-full py-3 rounded-xl font-bold mt-2"
                >
                  Hasilkan Jadwal Otomatis
                </Button>
              </form>
            )}

            {/* TAB: COPY SCHEDULE */}
            {activeTab === "copy" && (
              <form onSubmit={handleCopySchedule} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="source_date" className="block text-xs font-bold text-on-surface-variant mb-1 select-none">
                    Pilih Jadwal yang Mau Disalin
                  </label>
                  <select
                    id="source_date"
                    value={sourceDate}
                    onChange={(e) => setSourceDate(e.target.value)}
                    className="w-full bg-white border border-outline-variant/50 rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-1 focus:ring-primary transition-all font-semibold"
                  >
                    <option value="">-- Pilih Hari Sumber --</option>
                    {Object.keys(groupedAvailability).map((dateKey) => (
                      <option key={dateKey} value={dateKey}>
                        {formatDateHeader(dateKey)} ({groupedAvailability[dateKey]?.length ?? 0} Slot)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="target_date" className="block text-xs font-bold text-on-surface-variant mb-1 select-none">
                    Salin ke Tanggal Tujuan
                  </label>
                  <input
                    id="target_date"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full bg-white border border-outline-variant/50 rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                {formError && (
                  <p className="text-xs text-error font-semibold select-none">{formError}</p>
                )}

                <Button
                  type="submit"
                  isLoading={isCreatingBulk}
                  leftIcon="content_copy"
                  className="w-full py-3 rounded-xl font-bold mt-2"
                >
                  Duplikasi Jadwal Hari
                </Button>
              </form>
            )}
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
                                  <span className="text-primary font-bold">Terbooking</span>
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
