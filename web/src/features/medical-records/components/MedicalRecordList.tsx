import { useState, useMemo } from "react";
import type { MedicalRecord, MedicalRecordType } from "../types";

export interface MedicalRecordListProps {
  records?: MedicalRecord[];
  isLoading?: boolean;
  maxHeight?: string;
  className?: string;
  emptyMessage?: string;
}

export function MedicalRecordList({
  records,
  isLoading,
  maxHeight = "max-h-[380px]",
  className = "",
  emptyMessage = "Tidak ada rekam medis di kategori ini.",
}: MedicalRecordListProps) {
  const [activeTab, setActiveTab] = useState<"all" | MedicalRecordType>("all");

  const counts = useMemo<Record<"all" | MedicalRecordType, number>>(() => {
    const c: Record<"all" | MedicalRecordType, number> = {
      all: 0,
      diagnosis: 0,
      allergy: 0,
      lab_result: 0,
      note: 0,
    };
    if (!records) return c;
    c.all = records.length;
    for (const r of records) {
      if (r.record_type in c) {
        c[r.record_type] = (c[r.record_type] ?? 0) + 1;
      }
    }
    return c;
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (!records) return [];
    const sorted = [...records].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    if (activeTab === "all") return sorted;
    return sorted.filter((r) => r.record_type === activeTab);
  }, [records, activeTab]);

  const tabs: Array<{ id: "all" | MedicalRecordType; label: string; count: number }> = [
    { id: "all", label: "Semua", count: counts.all },
    { id: "diagnosis", label: "Diagnosis", count: counts.diagnosis },
    { id: "allergy", label: "Alergi", count: counts.allergy },
    { id: "lab_result", label: "Hasil Lab", count: counts.lab_result },
    { id: "note", label: "Catatan", count: counts.note },
  ];

  const getRecordTypeBadgeStyle = (type: MedicalRecordType) => {
    switch (type) {
      case "diagnosis":
        return "bg-error/10 text-error border-error/20";
      case "allergy":
        return "bg-amber-600/10 text-amber-600 border-amber-600/20";
      case "lab_result":
        return "bg-green-600/10 text-green-600 border-green-600/20";
      case "note":
      default:
        return "bg-primary/10 text-primary border-primary/20";
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
      default:
        return "description";
    }
  };

  const formatRecordDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={`flex flex-col gap-3 select-none ${className}`}>
      {/* Category Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                isActive
                  ? "bg-primary text-white shadow-xs"
                  : "bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline-variant/20"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[9px] px-1 py-0.2 rounded-full font-semibold ${
                  isActive ? "bg-white/20 text-white" : "bg-outline-variant/30 text-on-surface-variant"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Record Cards List */}
      {isLoading ? (
        <div className="flex flex-col gap-2 animate-pulse">
          <div className="h-16 bg-surface-container rounded-xl"></div>
          <div className="h-16 bg-surface-container rounded-xl"></div>
        </div>
      ) : filteredRecords.length > 0 ? (
        <div className={`flex flex-col gap-2.5 overflow-y-auto pr-1 ${maxHeight}`}>
          {filteredRecords.map((record) => (
            <div
              key={record.id}
              className="p-3 rounded-xl bg-white border border-outline-variant/20 shadow-xs flex flex-col gap-2 text-xs transition-all hover:border-primary/30"
            >
              {/* Header: Type Badge & Date */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider border ${getRecordTypeBadgeStyle(
                    record.record_type
                  )}`}
                >
                  <span className="material-symbols-outlined text-[11px]">
                    {getRecordTypeIcon(record.record_type)}
                  </span>
                  {record.record_type.replace("_", " ")}
                </span>
                <span className="text-[10px] text-on-surface-variant/80 font-semibold">
                  {formatRecordDate(record.created_at)}
                </span>
              </div>

              {/* Content Body */}
              <p className="text-on-surface font-medium leading-relaxed whitespace-pre-wrap break-words">
                {record.content}
              </p>

              {/* Doctor Attribution Footer */}
              <div className="pt-2 border-t border-outline-variant/15 flex items-center justify-between text-[10px]">
                {record.doctor_name ? (
                  <div className="flex items-center gap-1.5 text-primary min-w-0">
                    <span className="material-symbols-outlined text-[14px] shrink-0">
                      stethoscope
                    </span>
                    <span className="font-bold truncate">{record.doctor_name}</span>
                    {record.doctor_specialty && (
                      <span className="text-on-surface-variant/80 font-medium truncate hidden sm:inline">
                        • {record.doctor_specialty}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-on-surface-variant/60 italic">
                    <span className="material-symbols-outlined text-[13px]">history_edu</span>
                    <span>Riwayat Pasien / Sistem</span>
                  </div>
                )}
                {record.file_id && (
                  <span className="inline-flex items-center gap-0.5 text-primary font-semibold text-[10px] shrink-0">
                    <span className="material-symbols-outlined text-[12px]">attachment</span>
                    Berkas
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 rounded-xl bg-surface-container-lowest border border-dashed border-outline-variant/30 text-center flex flex-col items-center justify-center gap-1.5">
          <span className="material-symbols-outlined text-on-surface-variant/50 text-[24px]">
            folder_off
          </span>
          <p className="text-xs text-on-surface-variant/80 italic">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}
