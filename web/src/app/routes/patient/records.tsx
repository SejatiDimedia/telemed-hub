import { createFileRoute } from "@tanstack/react-router";
import { useMedicalRecords, useMedicalRecordDetails } from "../../../features/medical-records/hooks/use-medical-records";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Dialog } from "../../../components/ui/Dialog";
import { Badge } from "../../../components/ui/Badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../components/ui/Tabs";
import { EmptyState } from "../../../components/shared/EmptyState";
import { useState, useMemo } from "react";
import type { MedicalRecordType } from "../../../features/medical-records/types";

export const Route = createFileRoute("/patient/records")({
  component: PatientRecordsPage,
});

function PatientRecordsPage() {
  const { data: records, isLoading: isListLoading } = useMedicalRecords();

  // Active detail modal state
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch record details when a record is clicked (this transparently triggers the backend audit log!)
  const { data: activeRecord, isLoading: isDetailLoading } = useMedicalRecordDetails(selectedRecordId ?? "");

  const handleRecordClick = (id: string) => {
    setSelectedRecordId(id);
    setIsDetailOpen(true);
  };

  const getRecordTypeBadge = (type: MedicalRecordType) => {
    switch (type) {
      case "diagnosis":
        return <Badge variant="error">DIAGNOSIS</Badge>;
      case "allergy":
        return <Badge variant="warning">ALERGI</Badge>;
      case "lab_result":
        return <Badge variant="success">HASIL LAB</Badge>;
      case "note":
        return <Badge variant="primary">CATATAN</Badge>;
      default:
        return <Badge variant="neutral">{(type as string).toUpperCase()}</Badge>;
    }
  };

  const getRecordTypeIcon = (type: MedicalRecordType) => {
    switch (type) {
      case "diagnosis":
        return "stethoscope";
      case "allergy":
        return "warning";
      case "lab_result":
        return "biotech";
      case "note":
        return "description";
      default:
        return "folder_open";
    }
  };

  const getRecordTypeColor = (type: MedicalRecordType) => {
    switch (type) {
      case "diagnosis":
        return "text-error bg-error/10 border-error/20";
      case "allergy":
        return "text-amber-600 bg-amber-600/10 border-amber-600/20";
      case "lab_result":
        return "text-green-600 bg-green-600/10 border-green-600/20";
      case "note":
        return "text-primary bg-primary/10 border-primary/20";
      default:
        return "text-on-surface-variant bg-surface-container border-outline-variant/30";
    }
  };

  const formatRecordDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  // Group / Filter records by category
  const filteredRecords = useMemo(() => {
    if (!records) return { all: [], diagnosis: [], allergy: [], lab_result: [], note: [] };
    
    // Sort chronologically descending
    const sorted = [...records].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return {
      all: sorted,
      diagnosis: sorted.filter((r) => r.record_type === "diagnosis"),
      allergy: sorted.filter((r) => r.record_type === "allergy"),
      lab_result: sorted.filter((r) => r.record_type === "lab_result"),
      note: sorted.filter((r) => r.record_type === "note"),
    };
  }, [records]);

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <section className="flex flex-col gap-2 select-none">
        <h1 className="font-display text-headline-lg text-primary font-bold">Rekam Medis Pasien</h1>
        <p className="font-body text-body-lg text-on-surface-variant leading-relaxed">
          Semua catatan rekam medis, diagnosis, alergi, dan hasil laboratorium Anda tersimpan di sini secara aman. Akses data medis diaudit ketat demi privasi Anda.
        </p>
      </section>

      {/* Tabs Filter */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="select-none">
          <TabsTrigger value="all">Semua Rekam Medis ({filteredRecords.all.length})</TabsTrigger>
          <TabsTrigger value="diagnosis">Diagnosis ({filteredRecords.diagnosis.length})</TabsTrigger>
          <TabsTrigger value="allergy">Alergi ({filteredRecords.allergy.length})</TabsTrigger>
          <TabsTrigger value="lab_result">Hasil Lab ({filteredRecords.lab_result.length})</TabsTrigger>
          <TabsTrigger value="note">Catatan ({filteredRecords.note.length})</TabsTrigger>
        </TabsList>

        {Object.entries(filteredRecords).map(([tabKey, list]) => (
          <TabsContent key={tabKey} value={tabKey} className="mt-4">
            <Card variant="elevation" className="border border-outline-variant/10 overflow-hidden">
              {isListLoading ? (
                <div className="p-8 flex flex-col gap-4 animate-pulse">
                  <div className="h-12 bg-surface-container rounded"></div>
                  <div className="h-12 bg-surface-container rounded"></div>
                </div>
              ) : list.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-surface-container-low text-on-surface-variant text-label-sm uppercase tracking-wider select-none">
                      <tr>
                        <th className="px-6 py-4 font-bold">Kategori</th>
                        <th className="px-6 py-4 font-bold">Tanggal Pembuatan</th>
                        <th className="px-6 py-4 font-bold">Ringkasan Diagnosis / Catatan</th>
                        <th className="px-6 py-4 font-bold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {list.map((record) => (
                        <tr key={record.id} className="hover:bg-surface-container-lowest/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${getRecordTypeColor(record.record_type)}`}>
                                <span className="material-symbols-outlined text-[18px]">
                                  {getRecordTypeIcon(record.record_type)}
                                </span>
                              </div>
                              <span className="font-semibold text-on-surface text-sm capitalize">
                                {record.record_type.replace("_", " ")}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-body-sm text-on-surface font-semibold select-none">
                            {formatRecordDate(record.created_at)}
                          </td>
                          <td className="px-6 py-4 text-body-sm text-on-surface-variant max-w-xs truncate font-medium">
                            {record.content}
                          </td>
                          <td className="px-6 py-4 text-right select-none">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRecordClick(record.id)}
                              className="rounded-full px-4 text-xs font-bold border-primary/20 text-primary"
                            >
                              Lihat Detail
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  icon="folder_open"
                  title="Rekam Medis Kosong"
                  description="Tidak ada rekam medis yang terdaftar di kategori ini."
                />
              )}
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Record Details Audited Dialog */}
      <Dialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Detail Rekam Medis Terproteksi"
        size="md"
        footer={
          <div className="flex justify-end w-full select-none">
            <Button variant="primary" onClick={() => setIsDetailOpen(false)} className="px-6 py-2.5 rounded-full">
              Tutup
            </Button>
          </div>
        }
      >
        {isDetailLoading ? (
          <div className="flex flex-col gap-4 p-4 animate-pulse">
            <div className="h-6 bg-surface-container rounded w-1/3"></div>
            <div className="h-20 bg-surface-container rounded"></div>
          </div>
        ) : activeRecord ? (
          <div className="flex flex-col gap-6">
            {/* Audit Log Security Badge */}
            <div className="p-4 rounded-xl border border-blue-600/30 bg-blue-600/5 flex items-start gap-3 select-none">
              <span className="material-symbols-outlined text-blue-600 text-[24px]">verified_user</span>
              <div>
                <h5 className="font-bold text-blue-950 text-xs">Akses Rekam Medis Diaudit</h5>
                <p className="text-[11px] text-blue-900 mt-1 leading-relaxed">
                  Sesuai kebijakan privasi medis, pembukaan detail rekam medis ini telah dicatat secara permanen di log audit keamanan.
                </p>
              </div>
            </div>

            {/* Content Details */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4 select-none">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${getRecordTypeColor(activeRecord.record_type)}`}>
                    <span className="material-symbols-outlined text-[18px]">
                      {getRecordTypeIcon(activeRecord.record_type)}
                    </span>
                  </div>
                  <span className="font-bold text-on-surface text-sm capitalize">
                    {activeRecord.record_type.replace("_", " ")}
                  </span>
                </div>
                <div>{getRecordTypeBadge(activeRecord.record_type)}</div>
              </div>

              <div className="flex flex-col gap-1 select-none">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Tanggal & Waktu Pembuatan</span>
                <span className="text-sm font-bold text-on-surface">{formatRecordDate(activeRecord.created_at)}</span>
              </div>

              <div className="flex flex-col gap-1 select-none">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Terakhir Diperbarui</span>
                <span className="text-xs font-semibold text-on-surface-variant">{formatRecordDate(activeRecord.updated_at)}</span>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider select-none">Catatan / Isi Medis</span>
                <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm text-on-surface leading-relaxed whitespace-pre-wrap font-medium">
                  {activeRecord.content}
                </div>
              </div>

              {activeRecord.file_id && (
                <div className="flex items-center gap-3 p-4 bg-surface-container-low border border-outline-variant/20 rounded-xl mt-2 select-none">
                  <span className="material-symbols-outlined text-primary text-[24px]">attachment</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-on-surface truncate">Lampiran Dokumen Tambahan</p>
                    <p className="text-[10px] text-on-surface-variant mt-0.5">Format file dokumen eksternal</p>
                  </div>
                  <Button
                    onClick={() => alert(`Mengunduh berkas attachment dengan ID: ${activeRecord.file_id}`)}
                    className="text-xs font-bold py-1.5 px-4 rounded-lg bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                  >
                    Unduh File
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-error font-semibold">Gagal memuat detail rekam medis.</p>
        )}
      </Dialog>
    </div>
  );
}
