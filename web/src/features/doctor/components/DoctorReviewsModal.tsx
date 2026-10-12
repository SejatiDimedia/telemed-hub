import { Dialog } from "../../../components/ui/Dialog";
import { Button } from "../../../components/ui/Button";
import { Avatar } from "../../../components/ui/Avatar";
import { EmptyState } from "../../../components/shared/EmptyState";
import { useDoctorReviews } from "../hooks/use-doctors";

export interface DoctorReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: string;
  doctorName?: string;
}

export function DoctorReviewsModal({
  isOpen,
  onClose,
  doctorId,
  doctorName,
}: DoctorReviewsModalProps) {
  const { data, isLoading } = useDoctorReviews(doctorId);

  const summary = data?.summary;
  const reviews = data?.reviews ?? [];
  const totalReviews = summary?.total_reviews ?? 0;
  const avgRating = summary?.average_rating ?? 0;
  const counts = summary?.rating_counts ?? {};

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Ulasan & Reputasi ${doctorName ? `• ${doctorName}` : "Dokter"}`}
      size="lg"
      footer={
        <div className="flex justify-end w-full">
          <Button variant="outline" onClick={onClose} className="rounded-full px-6">
            Tutup
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-on-surface-variant">
            Memuat daftar ulasan dan penilaian dokter...
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 py-1">
          {/* Summary Stats Card */}
          <div className="p-6 rounded-2xl bg-surface-container-low/50 border border-outline-variant/15 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Big Rating Left */}
            <div className="md:col-span-5 flex flex-col items-center justify-center text-center p-2 border-b md:border-b-0 md:border-r border-outline-variant/15">
              <div className="text-4xl md:text-5xl font-black text-on-surface tracking-tight font-display">
                {totalReviews > 0 ? avgRating.toFixed(1) : "0.0"}
              </div>
              <div className="flex items-center text-amber-500 my-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className="material-symbols-outlined text-2xl select-none"
                    style={{
                      fontVariationSettings:
                        star <= Math.round(avgRating) ? "'FILL' 1" : "'FILL' 0",
                    }}
                  >
                    star
                  </span>
                ))}
              </div>
              <p className="text-xs font-semibold text-on-surface-variant">
                Berdasarkan {totalReviews} ulasan pasien
              </p>
            </div>

            {/* Distribution Breakdown Right */}
            <div className="md:col-span-7 flex flex-col gap-1.5 justify-center">
              {[5, 4, 3, 2, 1].map((starVal) => {
                const count = counts[String(starVal)] ?? 0;
                const percentage =
                  totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;

                return (
                  <div key={starVal} className="flex items-center gap-3 text-xs">
                    <span className="w-7 font-bold text-on-surface flex items-center gap-0.5 justify-end">
                      {starVal}
                      <span
                        className="material-symbols-outlined text-xs text-amber-500"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                    </span>

                    <div className="flex-1 h-2 rounded-full bg-surface-container overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <span className="w-10 text-right text-on-surface-variant font-medium">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reviews List */}
          <div>
            <h4 className="text-sm font-bold text-on-surface mb-3 flex items-center justify-between">
              <span>Ulasan Pasien ({reviews.length})</span>
            </h4>

            {reviews.length === 0 ? (
              <EmptyState
                icon="rate_review"
                title="Belum Ada Ulasan"
                description="Dokter ini belum menerima ulasan atau rating dari pasien yang telah berkonsultasi."
              />
            ) : (
              <div className="flex flex-col gap-3.5 max-h-[360px] overflow-y-auto pr-1">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/15 flex flex-col gap-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={rev.patient_name || "Pasien"} size="sm" />
                        <div>
                          <p className="text-xs font-bold text-on-surface leading-tight">
                            {rev.patient_name || "Pasien TeleMedHub"}
                          </p>
                          <p className="text-[11px] text-on-surface-variant mt-0.5">
                            {new Date(rev.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Stars */}
                      <div className="flex items-center text-amber-500">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span
                            key={s}
                            className="material-symbols-outlined text-base select-none"
                            style={{
                              fontVariationSettings:
                                s <= rev.rating ? "'FILL' 1" : "'FILL' 0",
                            }}
                          >
                            star
                          </span>
                        ))}
                      </div>
                    </div>

                    {rev.comment ? (
                      <p className="text-xs text-on-surface leading-relaxed pl-10">
                        {rev.comment}
                      </p>
                    ) : (
                      <p className="text-xs text-on-surface-variant/70 italic pl-10">
                        Memberikan rating tanpa ulasan tertulis.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
