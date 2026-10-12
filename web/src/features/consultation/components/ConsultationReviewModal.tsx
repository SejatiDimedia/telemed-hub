import { useState, useId } from "react";
import { Dialog } from "../../../components/ui/Dialog";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import {
  useConsultationReview,
  useCreateConsultationReview,
} from "../hooks/use-consultations";

export interface ConsultationReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultationId: string;
  doctorName?: string;
}

const RATING_LABELS: Record<number, string> = {
  1: "Sangat Buruk",
  2: "Kurang Memuaskan",
  3: "Cukup Baik",
  4: "Sangat Baik & Ramah",
  5: "Luar Biasa & Sangat Memuaskan",
};

export function ConsultationReviewModal({
  isOpen,
  onClose,
  consultationId,
  doctorName,
}: ConsultationReviewModalProps) {
  const commentInputId = useId();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [formError, setFormError] = useState("");

  const { data: existingReview, isLoading: isCheckingReview } =
    useConsultationReview(consultationId);

  const { mutateAsync: createReview, isPending: isSubmitting } =
    useCreateConsultationReview(consultationId);

  const effectiveRating = hoverRating ?? rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (rating < 1 || rating > 5) {
      setFormError("Silakan pilih rating bintang antara 1 sampai 5.");
      return;
    }

    try {
      await createReview({
        rating,
        comment: comment.trim(),
      });
      onClose();
    } catch (err: any) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Gagal mengirimkan ulasan. Silakan coba kembali."
      );
    }
  };

  const handleModalClose = () => {
    setFormError("");
    setHoverRating(null);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleModalClose}
      title={existingReview ? "Ulasan Konsultasi Medis" : "Beri Ulasan & Rating Dokter"}
      size="md"
    >
      {isCheckingReview ? (
        <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-on-surface-variant">
            Memeriksa status ulasan...
          </p>
        </div>
      ) : existingReview ? (
        <div className="flex flex-col gap-5 py-2">
          <div className="p-4 rounded-xl bg-success/10 border border-success/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className="material-symbols-outlined text-success text-2xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <div>
                <p className="text-sm font-bold text-on-surface">Ulasan Anda Telah Terkirim</p>
                <p className="text-xs text-on-surface-variant">
                  Terima kasih atas kontribusi Anda untuk membantu pasien lain.
                </p>
              </div>
            </div>
            <Badge variant="success">Terkonfirmasi</Badge>
          </div>

          <div className="p-5 rounded-2xl bg-surface-container-low/50 border border-outline-variant/15 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-on-surface-variant">Dokter yang Dinilai</p>
                <p className="text-sm font-bold text-on-surface">
                  {doctorName ?? "Dokter Spesialis"}
                </p>
              </div>
              <p className="text-xs text-on-surface-variant">
                {new Date(existingReview.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center text-amber-500">
                {[1, 2, 3, 4, 5].map((starVal) => (
                  <span
                    key={starVal}
                    className="material-symbols-outlined text-2xl"
                    style={{
                      fontVariationSettings:
                        starVal <= existingReview.rating ? "'FILL' 1" : "'FILL' 0",
                    }}
                  >
                    star
                  </span>
                ))}
              </div>
              <span className="text-sm font-bold text-on-surface">
                {existingReview.rating} dari 5 Bintang
              </span>
            </div>

            {existingReview.comment ? (
              <div className="pt-2 border-t border-outline-variant/10">
                <p className="text-xs font-semibold text-on-surface-variant mb-1">
                  Catatan & Ulasan Anda:
                </p>
                <p className="text-sm text-on-surface italic bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/10 leading-relaxed">
                  "{existingReview.comment}"
                </p>
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant italic">
                Tidak ada komentar tertulis yang disertakan.
              </p>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={handleModalClose} className="rounded-full px-6">
              Tutup
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-2">
          <div>
            <p className="text-xs font-medium text-on-surface-variant">
              Bagaimana pengalaman konsultasi Anda dengan{" "}
              <strong className="text-on-surface">{doctorName ?? "Dokter"}</strong>?
            </p>
            <p className="text-xs text-on-surface-variant/80 mt-0.5">
              Penilaian Anda sangat berharga untuk menjaga kualitas layanan medis dan membantu
              pasien lain memilih dokter yang tepat.
            </p>
          </div>

          {/* Interactive Star Rating */}
          <div className="p-5 rounded-2xl bg-surface-container-low/40 border border-outline-variant/15 flex flex-col items-center justify-center gap-2">
            <div
              className="flex items-center gap-1.5 focus-within:ring-2 focus-within:ring-primary/20 rounded-lg p-1"
              role="radiogroup"
              aria-label="Pilih rating bintang"
            >
              {[1, 2, 3, 4, 5].map((starValue) => {
                const isFilled = starValue <= effectiveRating;
                return (
                  <button
                    key={starValue}
                    type="button"
                    role="radio"
                    aria-checked={rating === starValue}
                    aria-label={`${starValue} bintang - ${RATING_LABELS[starValue]}`}
                    onClick={() => setRating(starValue)}
                    onMouseEnter={() => setHoverRating(starValue)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1.5 rounded-full hover:bg-surface-container transition-transform transform hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span
                      className={`material-symbols-outlined text-3xl select-none transition-colors ${
                        isFilled ? "text-amber-500" : "text-outline-variant/70"
                      }`}
                      style={{
                        fontVariationSettings: isFilled ? "'FILL' 1" : "'FILL' 0",
                      }}
                    >
                      star
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="h-6 flex items-center justify-center">
              <span className="text-xs font-bold text-primary tracking-wide transition-all">
                {RATING_LABELS[effectiveRating] ?? ""}
              </span>
            </div>
          </div>

          {/* Comment Textarea */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor={commentInputId}
                className="text-xs font-bold text-on-surface"
              >
                Ulasan & Masukan Anda (Opsional)
              </label>
              <span className="text-[11px] text-on-surface-variant">
                {comment.length} / 1000 karakter
              </span>
            </div>
            <textarea
              id={commentInputId}
              rows={3}
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ceritakan keramahan dokter, kejelasan diagnosis, atau kepuasan Anda selama konsultasi..."
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-3 text-sm text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all resize-none leading-relaxed"
            />
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-error/10 border border-error/20 flex items-center gap-2 text-xs font-semibold text-error">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{formError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/10">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={handleModalClose}
              className="rounded-full px-5 text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              className="rounded-full px-6 text-xs font-bold shadow-xs"
            >
              Kirim Ulasan
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
