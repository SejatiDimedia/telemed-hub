import { useState } from "react";
import { Avatar } from "../../../components/ui/Avatar";
import { Button } from "../../../components/ui/Button";
import { useMedicines } from "../../pharmacy/hooks/use-pharmacy";
import { useUpdateConsultationNotes } from "../hooks/use-consultations";
import { useCreatePrescription } from "../../prescription/hooks/use-prescriptions";
import { useToastStore } from "../../../stores/toast-store";
import type { ConsultationParticipant } from "../types";
import type { PrescriptionItem } from "../../prescription/types";

export interface PatientClinicalSummaryProps {
  consultationId: string;
  patient: ConsultationParticipant;
  initialNotes?: string | null;
}

export function PatientClinicalSummary({
  consultationId,
  patient,
  initialNotes,
}: PatientClinicalSummaryProps) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [isPrescribing, setIsPrescribing] = useState(false);
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);

  // Drug selector state
  const [selectedMedicineId, setSelectedMedicineId] = useState("");
  const [medQty, setMedQty] = useState(1);
  const [medDosage, setMedDosage] = useState("3x sehari 1 tablet");
  const [medInstructions, setMedInstructions] = useState("Sesudah makan");
  const [prescriptionError, setPrescriptionError] = useState("");

  const { data: medicines } = useMedicines();
  const { mutateAsync: updateNotes, isPending: isUpdatingNotes } = useUpdateConsultationNotes();
  const { mutateAsync: createPrescription, isPending: isCreatingPrescription } = useCreatePrescription();
  const addToast = useToastStore((state) => state.addToast);

  const handleSaveNotes = async () => {
    try {
      await updateNotes({ id: consultationId, notes });
      addToast({
        type: "success",
        title: "Catatan Disimpan",
        message: "Catatan diagnosis klinis berhasil disimpan ke rekam medis.",
      });
    } catch {
      // Toast handled by error interceptor
    }
  };

  const handleAddMedicine = () => {
    setPrescriptionError("");
    if (!selectedMedicineId) {
      setPrescriptionError("Pilih obat terlebih dahulu.");
      return;
    }
    if (medQty <= 0) {
      setPrescriptionError("Jumlah obat harus lebih dari 0.");
      return;
    }

    const selectedMed = medicines?.find((m) => m.id === selectedMedicineId);
    if (!selectedMed) return;

    if (prescriptionItems.some((item) => item.medicine_id === selectedMedicineId)) {
      setPrescriptionError("Obat ini sudah ada dalam daftar resep.");
      return;
    }

    setPrescriptionItems([
      ...prescriptionItems,
      {
        medicine_id: selectedMedicineId,
        medicine_name: selectedMed.name,
        quantity: medQty,
        dosage: medDosage,
        instructions: medInstructions,
      },
    ]);

    setSelectedMedicineId("");
    setMedQty(1);
  };

  const handleRemoveMedicine = (index: number) => {
    setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
  };

  const handleSubmitPrescription = async () => {
    if (prescriptionItems.length === 0) {
      setPrescriptionError("Tambahkan minimal 1 jenis obat untuk menerbitkan resep.");
      return;
    }

    try {
      await createPrescription({
        consultation_id: consultationId,
        items: prescriptionItems,
      });
      setPrescriptionItems([]);
      setIsPrescribing(false);
    } catch {
      // Handled
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-outline-variant/30 shadow-sm overflow-y-auto p-5 select-none space-y-6">
      {/* Patient Info Header */}
      <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center gap-3">
        <Avatar
          src={patient.profile_picture_url ?? undefined}
          name={patient.name}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-on-surface text-sm truncate">{patient.name}</h4>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-on-surface-variant font-semibold">
            {patient.gender && (
              <span className="capitalize">{patient.gender === "male" ? "Pria" : "Wanita"}</span>
            )}
            {patient.blood_type && (
              <>
                <span>•</span>
                <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-bold">
                  Gol: {patient.blood_type}
                </span>
              </>
            )}
            {patient.date_of_birth && (
              <>
                <span>•</span>
                <span>Lahir: {patient.date_of_birth}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Clinical Notes & Diagnosis */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="room_notes"
            className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">
              clinical_notes
            </span>
            Catatan Diagnosis Medis
          </label>
          <Button
            size="sm"
            variant="outline"
            disabled={isUpdatingNotes}
            onClick={handleSaveNotes}
            className="text-xs py-1 px-3 rounded-lg"
          >
            {isUpdatingNotes ? "Menyimpan..." : "Simpan Draf"}
          </Button>
        </div>
        <textarea
          id="room_notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Tuliskan keluhan pasien, anamnesis, diagnosis klinis, serta rencana tindakan medis..."
          className="w-full min-h-[120px] bg-surface-container-low/50 border border-outline-variant/40 rounded-xl p-3 text-xs text-on-surface outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-y"
        />
      </div>

      {/* Digital Prescription Accordion / Toggle */}
      <div className="space-y-3 pt-2 border-t border-outline-variant/20">
        <div className="flex items-center justify-between bg-surface-container-low/60 p-3 rounded-xl border border-outline-variant/30">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">
              prescriptions
            </span>
            <span className="text-xs font-bold text-on-surface">Resep Digital Pasien</span>
          </div>
          <button
            type="button"
            onClick={() => setIsPrescribing(!isPrescribing)}
            className="text-xs text-primary font-bold hover:underline"
          >
            {isPrescribing ? "Tutup Form Resep" : "+ Buat Resep"}
          </button>
        </div>

        {isPrescribing && (
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-4">
            {prescriptionError && (
              <p className="text-xs text-red-600 font-semibold">{prescriptionError}</p>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                  Pilih Obat dari Apotek
                </label>
                <select
                  value={selectedMedicineId}
                  onChange={(e) => setSelectedMedicineId(e.target.value)}
                  className="w-full bg-white border border-outline-variant/50 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Pilih Obat...</option>
                  {medicines?.map((med) => (
                    <option key={med.id} value={med.id}>
                      {med.name} (Stok: {med.stock_quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                    Jumlah
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={medQty}
                    onChange={(e) => setMedQty(Number(e.target.value))}
                    className="w-full bg-white border border-outline-variant/50 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                    Dosis
                  </label>
                  <input
                    type="text"
                    value={medDosage}
                    onChange={(e) => setMedDosage(e.target.value)}
                    className="w-full bg-white border border-outline-variant/50 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                  Aturan Pakai
                </label>
                <input
                  type="text"
                  value={medInstructions}
                  onChange={(e) => setMedInstructions(e.target.value)}
                  className="w-full bg-white border border-outline-variant/50 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleAddMedicine}
                className="w-full text-xs font-bold py-2 rounded-lg"
              >
                + Tambah ke Daftar Resep
              </Button>
            </div>

            {/* Added drugs preview */}
            {prescriptionItems.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-primary/20">
                <h5 className="text-[11px] font-bold text-on-surface uppercase tracking-wider">
                  Daftar Obat ({prescriptionItems.length})
                </h5>
                <div className="space-y-1.5">
                  {prescriptionItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-white rounded-lg border border-outline-variant/30 text-xs"
                    >
                      <div>
                        <p className="font-bold text-on-surface">{item.medicine_name}</p>
                        <p className="text-[10px] text-on-surface-variant">
                          {item.quantity} unit • {item.dosage} • {item.instructions}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMedicine(idx)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  ))}
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  disabled={isCreatingPrescription}
                  onClick={handleSubmitPrescription}
                  className="w-full text-xs font-bold py-2.5 rounded-lg shadow-sm"
                >
                  {isCreatingPrescription ? "Menerbitkan..." : "Terbitkan Resep Digital"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
