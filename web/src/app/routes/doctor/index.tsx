import { createFileRoute } from "@tanstack/react-router";
import { useAppointments } from "../../../features/appointment/hooks/use-appointments";
import { useDoctorProfileMe } from "../../../features/doctor/hooks/use-doctors";
import { usePatientProfileById } from "../../../features/patient/hooks/use-patient-profile";
import { useMedicines } from "../../../features/pharmacy/hooks/use-pharmacy";
import { useStartConsultation, useUpdateConsultationNotes, useCompleteConsultation } from "../../../features/consultation/hooks/use-consultations";
import { useCreatePrescription } from "../../../features/prescription/hooks/use-prescriptions";
import { useMedicalRecords, useCreateMedicalRecord } from "../../../features/medical-records/hooks/use-medical-records";
import { useToastStore } from "../../../stores/toast-store";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Drawer } from "../../../components/ui/Drawer";
import { Avatar } from "../../../components/ui/Avatar";
import { Badge } from "../../../components/ui/Badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../components/ui/Tabs";
import { EmptyState } from "../../../components/shared/EmptyState";
import { useState, useMemo } from "react";
import type { PrescriptionItem } from "../../../features/prescription/types";

export const Route = createFileRoute("/doctor/")({
  component: DoctorDashboard,
});

// Component to dynamically fetch and display patient name in list
function PatientNameCell({ patientId }: { patientId: string }) {
  const { data: patientProfile, isLoading } = usePatientProfileById(patientId);
  if (isLoading) return <span className="text-on-surface-variant animate-pulse font-medium">Memuat nama...</span>;
  return <span className="font-bold text-on-surface text-sm">{patientProfile?.full_name ?? "Patient"}</span>;
}

// Component to dynamically fetch and display patient details in list
function PatientDetailsCell({ patientId }: { patientId: string }) {
  const { data: patientProfile, isLoading } = usePatientProfileById(patientId);
  if (isLoading) return <span className="text-on-surface-variant text-xs animate-pulse">Memuat gender...</span>;
  const genderLabel = patientProfile?.gender === "male" ? "Laki-laki" : "Perempuan";
  return (
    <span className="text-xs text-on-surface-variant/80 font-semibold mt-0.5 block">
      {genderLabel} • Gol. Darah {patientProfile?.blood_type ?? "O+"}
    </span>
  );
}

function DoctorDashboard() {
  const addToast = useToastStore((state) => state.addToast);
  const { data: doctorProfile, isLoading: isDocLoading } = useDoctorProfileMe();
  const { data: appointments, isLoading: isAptsLoading } = useAppointments();

  // Consultation state
  const [activeConsultationId, setActiveConsultationId] = useState<string | null>(null);
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [isConsultationOpen, setIsConsultationOpen] = useState(false);
  const [notes, setNotes] = useState("");

  // Prescription Form state
  const [isPrescribing, setIsPrescribing] = useState(false);
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);
  const [selectedMedicineId, setSelectedMedicineId] = useState("");
  const [medQty, setMedQty] = useState(1);
  const [medDosage, setMedDosage] = useState("500mg");
  const [medInstructions, setMedInstructions] = useState("3x sehari sesudah makan");
  const [prescriptionError, setPrescriptionError] = useState("");

  // Mutations
  const { mutateAsync: startConsultation, isPending: isStarting } = useStartConsultation();
  const { mutateAsync: updateNotes, isPending: isSavingNotes } = useUpdateConsultationNotes();
  const { mutateAsync: completeConsultation, isPending: isCompleting } = useCompleteConsultation();
  const { mutateAsync: createPrescription } = useCreatePrescription();
  const { mutateAsync: createMedicalRecord } = useCreateMedicalRecord();

  // Medicines catalog list
  const { data: medicines } = useMedicines();

  // Group appointments into Today's Queue vs History
  const { todayQueue, historyQueue } = useMemo(() => {
    if (!appointments) return { todayQueue: [], historyQueue: [] };

    const todayStr = new Date().toISOString().split("T")[0];
    const today: typeof appointments = [];
    const history: typeof appointments = [];

    for (const apt of appointments) {
      const aptDate = apt.scheduled_at.split("T")[0];
      const isToday = aptDate === todayStr;

      if (isToday && (apt.status === "confirmed" || apt.status === "scheduled" || apt.status === "in_progress")) {
        today.push(apt);
      } else {
        history.push(apt);
      }
    }

    // Sort today's queue by scheduled_at ascending
    today.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    // Sort history by scheduled_at descending
    history.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

    return { todayQueue: today, historyQueue: history };
  }, [appointments]);

  // Fetch active patient profile details
  const { data: activePatient } = usePatientProfileById(activePatientId ?? "");

  // Fetch active patient medical records
  const { data: activePatientRecords, isLoading: isRecordsLoading } = useMedicalRecords({
    patientId: activePatientId ?? undefined,
  });

  const handleStartConsultation = async (aptId: string, patientId: string) => {
    try {
      const result = await startConsultation(aptId);
      // Use actual consultation ID from response for subsequent calls
      setActiveConsultationId(result?.id ?? aptId);
      setActivePatientId(patientId);
      setNotes("");
      setIsPrescribing(false);
      setPrescriptionItems([]);
      setPrescriptionError("");
      setIsConsultationOpen(true);
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Gagal Memulai Konsultasi",
        message: err instanceof Error ? err.message : "Terjadi kesalahan koneksi server.",
      });
    }
  };

  const handleSaveNotesDraft = async () => {
    if (!activeConsultationId) return;
    try {
      await updateNotes({ id: activeConsultationId, notes });
      alert("Catatan diagnosis berhasil disimpan sebagai draf.");
    } catch {
      // Handled
    }
  };

  const handleAddPrescriptionItem = () => {
    setPrescriptionError("");
    if (!selectedMedicineId) {
      setPrescriptionError("Pilih obat terlebih dahulu.");
      return;
    }
    if (medQty <= 0) {
      setPrescriptionError("Jumlah obat harus lebih dari 0.");
      return;
    }

    const exists = prescriptionItems.some((item) => item.medicine_id === selectedMedicineId);
    if (exists) {
      setPrescriptionError("Obat ini sudah ditambahkan ke resep.");
      return;
    }

    const selectedMed = medicines?.find((m) => m.id === selectedMedicineId);
    if (selectedMed && selectedMed.stock_quantity < medQty) {
      setPrescriptionError(`Stok tidak mencukupi (Tersedia: ${selectedMed.stock_quantity}).`);
      return;
    }

    const newItem: PrescriptionItem = {
      medicine_id: selectedMedicineId,
      dosage: medDosage,
      quantity: medQty,
      instructions: medInstructions,
    };

    setPrescriptionItems([...prescriptionItems, newItem]);
    setSelectedMedicineId("");
    setMedQty(1);
    setMedDosage("500mg");
    setMedInstructions("3x sehari sesudah makan");
  };

  const handleRemovePrescriptionItem = (index: number) => {
    setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
  };

  const handleCompleteConsultation = async () => {
    if (!activeConsultationId) return;

    try {
      // 1. Update/Save Notes
      await updateNotes({ id: activeConsultationId, notes });

      // 2. Submit Prescription if toggled and has items
      if (isPrescribing) {
        if (prescriptionItems.length === 0) {
          setPrescriptionError("Tambahkan minimal 1 jenis obat sebelum mengirim resep.");
          return;
        }
        await createPrescription({
          consultation_id: activeConsultationId,
          items: prescriptionItems,
        });
      }

      // 3. Create a Diagnosis Medical Record for the patient
      if (notes.trim() && activePatientId) {
        await createMedicalRecord({
          patient_id: activePatientId,
          consultation_id: activeConsultationId,
          record_type: "diagnosis",
          content: notes,
        });
      }

      // 4. Transition status to completed
      await completeConsultation(activeConsultationId);
      setIsConsultationOpen(false);
      setActiveConsultationId(null);
      setActivePatientId(null);
    } catch {
      // Handled
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge variant="success">CONFIRMED</Badge>;
      case "scheduled":
        return <Badge variant="primary">SCHEDULED</Badge>;
      case "in_progress":
        return <Badge variant="warning">IN PROGRESS</Badge>;
      case "completed":
        return <Badge variant="info">COMPLETED</Badge>;
      case "cancelled":
        return <Badge variant="error">CANCELLED</Badge>;
      default:
        return <Badge variant="neutral">{status.toUpperCase()}</Badge>;
    }
  };

  const getMedicineName = (id: string) => {
    const med = medicines?.find((m) => m.id === id);
    return med?.name ?? "Obat Medis";
  };

  if (isDocLoading) {
    return <div className="p-8 text-center text-on-surface-variant animate-pulse font-semibold">Memuat dashboard dokter...</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome Banner */}
      <section className="flex flex-col md:flex-row justify-between items-end gap-6 select-none">
        <div className="max-w-2xl">
          <h2 className="font-display text-headline-lg text-on-background mb-2">
            Selamat Datang, <span className="text-primary italic font-bold">{doctorProfile?.full_name}</span>
          </h2>
          <p className="font-body text-body-lg text-on-surface-variant leading-relaxed">
            Portal Kerja Terpadu. Periksa antrean pasien harian Anda, kelola jadwal praktek, dan luncurkan ruang konsultasi virtual secara instan.
          </p>
        </div>
      </section>

      {/* Tabs Layout */}
      <Tabs defaultValue="queue" className="w-full">
        <TabsList className="select-none">
          <TabsTrigger value="queue">Antrean Hari Ini</TabsTrigger>
          <TabsTrigger value="history">Semua Riwayat Konsultasi</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-4">
          <Card variant="elevation" className="border border-outline-variant/10 overflow-hidden">
            {isAptsLoading ? (
              <div className="p-8 flex flex-col gap-4 animate-pulse">
                <div className="h-10 bg-surface-container rounded"></div>
                <div className="h-10 bg-surface-container rounded"></div>
              </div>
            ) : todayQueue.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface-container-low text-on-surface-variant text-label-sm uppercase tracking-wider select-none">
                    <tr>
                      <th className="px-6 py-4 font-bold">Pasien</th>
                      <th className="px-6 py-4 font-bold">Waktu Konsultasi</th>
                      <th className="px-6 py-4 font-bold">Status</th>
                      <th className="px-6 py-4 font-bold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {todayQueue.map((apt) => (
                      <tr key={apt.id} className="hover:bg-surface-container-lowest/30 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <Avatar name="Patient" size="sm" />
                          <div>
                            <PatientNameCell patientId={apt.patient_id} />
                            <PatientDetailsCell patientId={apt.patient_id} />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-body-sm text-on-surface font-semibold">
                          {new Date(apt.scheduled_at).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })} (WIB)
                        </td>
                        <td className="px-6 py-4 select-none">
                          {getStatusBadge(apt.status)}
                        </td>
                        <td className="px-6 py-4 text-right select-none">
                          <Button
                            variant="primary"
                            size="sm"
                            isLoading={isStarting && activeConsultationId === apt.id}
                            onClick={() => handleStartConsultation(apt.id, apt.patient_id)}
                            className="rounded-full px-5 text-xs font-bold"
                          >
                            Mulai Konsultasi
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon="airline_seat_recline_extra"
                title="Antrean Hari Ini Kosong"
                description="Tidak ada janji temu pasien yang dijadwalkan untuk hari ini."
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card variant="elevation" className="border border-outline-variant/10 overflow-hidden">
            {isAptsLoading ? (
              <div className="p-8 flex flex-col gap-4 animate-pulse">
                <div className="h-10 bg-surface-container rounded"></div>
                <div className="h-10 bg-surface-container rounded"></div>
              </div>
            ) : historyQueue.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-surface-container-low text-on-surface-variant text-label-sm uppercase tracking-wider select-none">
                    <tr>
                      <th className="px-6 py-4 font-bold">Pasien</th>
                      <th className="px-6 py-4 font-bold">Tanggal & Waktu</th>
                      <th className="px-6 py-4 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {historyQueue.map((apt) => (
                      <tr key={apt.id} className="hover:bg-surface-container-lowest/30 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <Avatar name="Patient" size="sm" />
                          <div>
                            <PatientNameCell patientId={apt.patient_id} />
                            <PatientDetailsCell patientId={apt.patient_id} />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-body-sm text-on-surface font-semibold">
                          {new Date(apt.scheduled_at).toLocaleString("id-ID", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-6 py-4 select-none">
                          {getStatusBadge(apt.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon="history"
                title="Riwayat Kosong"
                description="Anda belum menyelesaikan sesi konsultasi medis dengan pasien mana pun."
              />
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Consultation Room Drawer */}
      <Drawer
        isOpen={isConsultationOpen}
        onClose={() => setIsConsultationOpen(false)}
        title="Ruang Konsultasi Medis Virtual"
        size="2xl"
        footer={
          <div className="flex justify-between items-center w-full select-none">
            <Button
              variant="outline"
              onClick={handleSaveNotesDraft}
              isLoading={isSavingNotes}
              leftIcon="save"
              className="px-6 py-2.5 rounded-full"
            >
              Simpan Draft Catatan
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsConsultationOpen(false)}
                className="px-6 py-2.5 rounded-full"
              >
                Tutup Sesi
              </Button>
              <Button
                onClick={handleCompleteConsultation}
                isLoading={isCompleting}
                leftIcon="check_circle"
                className="px-6 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white border-none"
              >
                Selesaikan Konsultasi
              </Button>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-12 gap-6">
          {/* Patient Card Info */}
          <div className="col-span-12 md:col-span-4 flex flex-col gap-4">
            <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col items-center text-center select-none">
              <Avatar name={activePatient?.full_name ?? "Patient"} size="lg" className="mb-3" />
              <h4 className="font-bold text-on-surface text-md leading-tight">
                {activePatient?.full_name ?? "Patient"}
              </h4>
              <span className="text-xs text-on-surface-variant font-semibold mt-1">
                Pasien TeleMedHub
              </span>

              <div className="h-px bg-outline-variant/20 w-full my-4"></div>

              <div className="w-full text-left space-y-2 text-xs font-semibold text-on-surface-variant">
                <div className="flex justify-between">
                  <span>Jenis Kelamin:</span>
                  <span className="text-on-surface">{activePatient?.gender === "male" ? "Laki-laki" : "Perempuan"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal Lahir:</span>
                  <span className="text-on-surface">
                    {activePatient?.date_of_birth
                      ? new Date(activePatient.date_of_birth).toLocaleDateString("id-ID")
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Gol. Darah:</span>
                  <span className="text-on-surface">{activePatient?.blood_type ?? "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span>No. Telepon:</span>
                  <span className="text-on-surface">{activePatient?.phone_number ?? "-"}</span>
                </div>
              </div>
            </div>

            {/* Patient Medical History Panel (Sprint 5) */}
            <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-3">
              <h5 className="font-bold text-on-surface text-sm flex items-center gap-1.5 select-none">
                <span className="material-symbols-outlined text-primary text-[18px]">history</span>
                Riwayat Medis Pasien
              </h5>
              <div className="h-px bg-outline-variant/20 w-full select-none"></div>

              {isRecordsLoading ? (
                <div className="flex flex-col gap-2 animate-pulse">
                  <div className="h-8 bg-surface-container rounded"></div>
                  <div className="h-8 bg-surface-container rounded"></div>
                </div>
              ) : activePatientRecords && activePatientRecords.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
                  {activePatientRecords.map((record) => (
                    <div
                      key={record.id}
                      className="p-2.5 rounded-lg bg-white border border-outline-variant/10 flex flex-col gap-1 text-xs"
                    >
                      <div className="flex items-center justify-between select-none">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                          record.record_type === "diagnosis"
                            ? "bg-error/10 text-error border border-error/20"
                            : record.record_type === "allergy"
                            ? "bg-amber-600/10 text-amber-600 border border-amber-600/20"
                            : record.record_type === "lab_result"
                            ? "bg-green-600/10 text-green-600 border border-green-600/20"
                            : "bg-primary/10 text-primary border border-primary/20"
                        }`}>
                          {record.record_type.replace("_", " ")}
                        </span>
                        <span className="text-[10px] text-on-surface-variant/80 font-semibold">
                          {new Date(record.created_at).toLocaleDateString("id-ID")}
                        </span>
                      </div>
                      <p className="text-on-surface font-medium leading-relaxed mt-1 break-words">
                        {record.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant/80 italic text-center py-4 select-none">
                  Tidak ada riwayat medis sebelumnya.
                </p>
              )}
            </div>
          </div>

          {/* Diagnosis & Prescriptions Inputs */}
          <div className="col-span-12 md:col-span-8 flex flex-col gap-5">
            {/* Notes textarea */}
            <div className="flex flex-col gap-2">
              <label htmlFor="diag_notes" className="text-xs font-bold text-on-surface-variant select-none">
                Catatan Diagnosis & Rekomendasi Medis
              </label>
              <textarea
                id="diag_notes"
                placeholder="Tuliskan keluhan pasien, diagnosis klinis, dan saran saran medis di sini..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full min-h-[140px] bg-white border border-outline-variant/50 rounded-xl p-3 text-sm outline-none focus:ring-1 focus:ring-primary resize-y"
              />
            </div>

            {/* Prescribing checkbox */}
            <div className="flex items-center gap-3 p-4 bg-surface-container-low border border-outline-variant/20 rounded-xl select-none">
              <input
                id="toggle_prescribing"
                type="checkbox"
                checked={isPrescribing}
                onChange={(e) => setIsPrescribing(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              <label htmlFor="toggle_prescribing" className="text-xs font-bold text-on-surface cursor-pointer">
                Berikan Resep Obat Digital untuk Pasien
              </label>
            </div>

            {/* Prescription Form Section */}
            {isPrescribing && (
              <div className="p-5 rounded-xl border border-outline-variant/30 bg-surface-container-low/50 flex flex-col gap-4">
                <h5 className="text-xs font-bold text-on-surface uppercase tracking-wider select-none">
                  Formulir Resep Digital
                </h5>

                {/* Add Drug Fields */}
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-12 sm:col-span-4">
                    <label htmlFor="select_medicine" className="block text-[10px] font-bold text-on-surface-variant mb-1 select-none">
                      Nama Obat
                    </label>
                    <select
                      id="select_medicine"
                      value={selectedMedicineId}
                      onChange={(e) => setSelectedMedicineId(e.target.value)}
                      className="w-full bg-white border border-outline-variant/50 rounded-lg py-2 px-3 text-xs outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Pilih Obat...</option>
                      {medicines?.map((med) => (
                        <option key={med.id} value={med.id}>
                          {med.name} (Stok: {med.stock_quantity})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-12 sm:col-span-2">
                    <label htmlFor="med_qty" className="block text-[10px] font-bold text-on-surface-variant mb-1 select-none">
                      Jumlah
                    </label>
                    <input
                      id="med_qty"
                      type="number"
                      min={1}
                      value={medQty}
                      onChange={(e) => setMedQty(Number(e.target.value))}
                      className="w-full bg-white border border-outline-variant/50 rounded-lg py-2 px-3 text-xs outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-3">
                    <label htmlFor="med_dosage" className="block text-[10px] font-bold text-on-surface-variant mb-1 select-none">
                      Dosis
                    </label>
                    <input
                      id="med_dosage"
                      type="text"
                      value={medDosage}
                      onChange={(e) => setMedDosage(e.target.value)}
                      className="w-full bg-white border border-outline-variant/50 rounded-lg py-2 px-3 text-xs outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddPrescriptionItem}
                      className="w-full py-2.5 rounded-lg text-xs font-bold select-none border-primary/30 text-primary"
                    >
                      Tambah
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="med_instructions" className="block text-[10px] font-bold text-on-surface-variant select-none">
                    Instruksi Pemakaian Obat
                  </label>
                  <input
                    id="med_instructions"
                    type="text"
                    value={medInstructions}
                    onChange={(e) => setMedInstructions(e.target.value)}
                    className="w-full bg-white border border-outline-variant/50 rounded-lg py-2 px-3 text-xs outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {prescriptionError && (
                  <p className="text-[10px] text-error font-semibold select-none">{prescriptionError}</p>
                )}

                {/* Added Prescription Items Table */}
                {prescriptionItems.length > 0 && (
                  <div className="border border-outline-variant/20 rounded-lg overflow-hidden bg-white mt-2 select-none">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-container-low text-on-surface-variant font-bold">
                        <tr>
                          <th className="px-4 py-2">Nama Obat</th>
                          <th className="px-4 py-2">Jumlah</th>
                          <th className="px-4 py-2">Dosis & Instruksi</th>
                          <th className="px-4 py-2 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {prescriptionItems.map((item, index) => (
                          <tr key={item.medicine_id}>
                            <td className="px-4 py-2 font-bold text-on-surface">
                              {getMedicineName(item.medicine_id)}
                            </td>
                            <td className="px-4 py-2 text-on-surface font-semibold">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-2 text-on-surface-variant">
                              {item.dosage} — {item.instructions}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemovePrescriptionItem(index)}
                                className="text-error hover:underline font-bold"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Drawer>
    </div>
  );
}
