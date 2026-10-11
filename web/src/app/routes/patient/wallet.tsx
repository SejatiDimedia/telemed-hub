import { createFileRoute } from "@tanstack/react-router";
import { useWallet, useWalletTransactions, useTopUpWallet, walletKeys } from "../../../features/wallet/hooks/use-wallet";
import { usePatientProfile } from "../../../features/patient/hooks/use-patient-profile";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Dialog } from "../../../components/ui/Dialog";
import { Badge } from "../../../components/ui/Badge";
import { EmptyState } from "../../../components/shared/EmptyState";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/patient/wallet")({
  component: PatientWalletPage,
});

const topUpSchema = zod.object({
  amount: zod
    .number({ error: "Nominal harus berupa angka" })
    .min(10000, "Minimal pengisian saldo adalah Rp 10.000")
    .max(10000000, "Maksimal pengisian saldo adalah Rp 10.000.000"),
});

type TopUpSchemaType = zod.infer<typeof topUpSchema>;

const quickAmounts = [20000, 50000, 100000, 200000, 500000, 1000000];

function PatientWalletPage() {
  const queryClient = useQueryClient();
  const [txPage, setTxPage] = useState(1);
  const pageSize = 10;

  // Real data queries
  const { data: wallet, isLoading: isWalletLoading } = useWallet();
  const { data: txResult, isLoading: isTransactionsLoading, isFetching: isTxFetching } = useWalletTransactions(txPage, pageSize);
  const { data: profile } = usePatientProfile();
  const { mutateAsync: topUp, isPending: isTopUpPending } = useTopUpWallet();

  const transactions = txResult?.data ?? [];
  const txPagination = txResult?.pagination;

  // Confirmation dialog states
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);

  // Auto-refresh queries if redirected from Midtrans payment gateway
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get("order_id");
    const status = urlParams.get("transaction_status");

    if (orderId || status) {
      void queryClient.invalidateQueries({ queryKey: walletKeys.all });
      const timer = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: walletKeys.all });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [queryClient]);

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TopUpSchemaType>({
    resolver: zodResolver(topUpSchema),
    defaultValues: {
      amount: 100000,
    },
  });

  const onSubmit = (data: TopUpSchemaType) => {
    setPendingAmount(data.amount);
    setIsConfirmOpen(true);
  };

  const handleConfirmTopUp = async () => {
    if (pendingAmount === null) return;
    setIsConfirmOpen(false);
    try {
      const idempotencyKey = crypto.randomUUID();
      await topUp({ amount: pendingAmount, idempotencyKey });
      reset();
    } catch {
      // Toast notification handled in hook
    } finally {
      setPendingAmount(null);
    }
  };

  const patientName = profile?.full_name ?? "Pasien";
  const currentBalance = wallet?.balance ?? 0;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case "top_up":
        return <Badge variant="success">Isi Saldo</Badge>;
      case "consultation_payment":
        return <Badge variant="primary">Bayar Konsultasi</Badge>;
      case "order_payment":
        return <Badge variant="secondary">Bayar Obat</Badge>;
      case "refund":
        return <Badge variant="info">Pengembalian</Badge>;
      default: {
        const formatted = type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
        return <Badge variant="neutral">{formatted}</Badge>;
      }
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-6xl">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-on-surface tracking-tight mb-2">
            Dompet Digital Pasien
          </h1>
          <p className="text-body-md text-on-surface-variant max-w-2xl leading-relaxed">
            Kelola saldo pembayaran konsultasi online dan penebusan resep obat TeleMedHub secara aman.
          </p>
        </div>
      </section>

      {/* Main Grid: Left Balance & Top-Up / Right Transaction History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Balance Card & Top-Up Form (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Clean Wallet Card */}
          {isWalletLoading ? (
            <div className="h-44 w-full bg-surface-container rounded-2xl animate-pulse"></div>
          ) : (
            <Card variant="elevation" className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between h-48">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-on-surface-variant font-medium block">
                    Saldo Aktif
                  </span>
                  <h2 className="text-3xl font-bold text-on-surface tracking-tight mt-1">
                    {formatCurrency(currentBalance)}
                  </h2>
                </div>
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-outline-variant/20 text-xs text-on-surface-variant">
                <div>
                  <span className="block text-[11px] text-on-surface-variant/70">Pemilik Akun</span>
                  <span className="font-semibold text-on-surface">{patientName}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[11px] text-on-surface-variant/70">Mata Uang</span>
                  <span className="font-semibold text-on-surface font-mono">IDR (Rupiah)</span>
                </div>
              </div>
            </Card>
          )}

          {/* Top Up Form */}
          <Card variant="elevation" className="p-6 rounded-2xl border border-outline-variant/30">
            <h3 className="font-display text-lg font-bold text-on-surface mb-4">
              Isi Saldo (Top-Up)
            </h3>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-2">
                  Pilih Nominal Cepat
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {quickAmounts.map((amt) => {
                    const isSelected = watch("amount") === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setValue("amount", amt, { shouldValidate: true })}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                          isSelected
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-surface border-outline-variant/40 text-on-surface hover:bg-surface-container"
                        }`}
                      >
                        {formatCurrency(amt).replace(",00", "")}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="amount" className="block text-xs font-semibold text-on-surface-variant mb-2">
                  Atau Masukkan Nominal Kustom
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-xs font-bold text-on-surface-variant select-none">
                    Rp
                  </span>
                  <input
                    id="amount"
                    type="text"
                    value={watch("amount") ? watch("amount").toLocaleString("id-ID") : ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setValue("amount", val ? parseInt(val, 10) : 0, { shouldValidate: true });
                    }}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl py-3 pl-12 pr-4 text-sm font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                    placeholder="100.000"
                  />
                </div>
                {errors.amount && (
                  <p className="text-xs text-error mt-2 font-medium">{errors.amount.message}</p>
                )}
              </div>

              <Button
                type="submit"
                isLoading={isTopUpPending}
                leftIcon="payment"
                className="w-full py-3 rounded-xl font-bold text-sm shadow-sm mt-1"
              >
                Lanjutkan ke Pembayaran
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: Transaction History Table (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <Card variant="elevation" className="border border-outline-variant/30 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-outline-variant/20 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-on-surface">
                  Riwayat Transaksi
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Catatan mutasi saldo dan pembayaran Anda.
                </p>
              </div>
            </div>

            {isTransactionsLoading ? (
              <div className="p-8 flex flex-col gap-4 animate-pulse">
                <div className="h-10 bg-surface-container rounded-xl"></div>
                <div className="h-10 bg-surface-container rounded-xl"></div>
                <div className="h-10 bg-surface-container rounded-xl"></div>
              </div>
            ) : transactions && transactions.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-surface-container-low text-on-surface-variant text-xs font-semibold border-b border-outline-variant/20">
                      <tr>
                        <th className="px-6 py-3.5">Waktu</th>
                        <th className="px-6 py-3.5">Tipe</th>
                        <th className="px-6 py-3.5">Nominal</th>
                        <th className="px-6 py-3.5">Saldo Akhir</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y divide-outline-variant/10 text-xs ${isTxFetching ? "opacity-50" : ""}`}>
                      {transactions.map((tx) => {
                        const isCredit = tx.type === "top_up" || tx.type === "refund";
                        const amountStr = isCredit
                          ? `+${formatCurrency(tx.amount)}`
                          : `-${formatCurrency(tx.amount)}`;

                        return (
                          <tr key={tx.id} className="hover:bg-surface-container/20 transition-colors">
                            <td className="px-6 py-4 text-on-surface-variant">
                              {new Date(tx.created_at).toLocaleString("id-ID", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </td>
                            <td className="px-6 py-4">
                              {getTransactionBadge(tx.type)}
                            </td>
                            <td
                              className={`px-6 py-4 font-semibold ${isCredit ? "text-green-600" : "text-on-surface"}`}
                            >
                              {amountStr}
                            </td>
                            <td className="px-6 py-4 text-on-surface-variant font-mono">
                              {formatCurrency(tx.balance_after)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {txPagination && txPagination.total_pages > 1 && (
                  <div className="px-6 py-4 border-t border-outline-variant/20 flex items-center justify-between">
                    <p className="text-xs text-on-surface-variant">
                      Halaman <span className="font-bold text-on-surface">{txPagination.page}</span> dari{" "}
                      <span className="font-bold text-on-surface">{txPagination.total_pages}</span> ({txPagination.total_items} data)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon="chevron_left"
                        onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                        disabled={txPage <= 1 || isTxFetching}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                      >
                        Sebelumnya
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        rightIcon="chevron_right"
                        onClick={() => setTxPage((p) => Math.min(txPagination.total_pages, p + 1))}
                        disabled={txPage >= txPagination.total_pages || isTxFetching}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                      >
                        Selanjutnya
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                icon="receipt_long"
                title="Belum Ada Transaksi"
                description="Riwayat pengisian saldo dan transaksi pembayaran konsultasi atau obat akan muncul di sini."
                className="py-12 border-none"
              />
            )}
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Konfirmasi Pengisian Saldo"
        size="sm"
        footer={
          <div className="flex gap-3 justify-end w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmOpen(false)}
              className="px-4 rounded-xl font-semibold"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmTopUp}
              className="px-5 rounded-xl font-semibold"
            >
              Lanjutkan
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-2 py-2">
          <p className="text-xs text-on-surface-variant">
            Anda akan diarahkan ke gerbang pembayaran Midtrans untuk mengisi saldo sebesar:
          </p>
          <p className="text-2xl font-bold text-primary mt-1">
            {pendingAmount !== null ? formatCurrency(pendingAmount) : ""}
          </p>
          <p className="text-[11px] text-on-surface-variant/80 mt-2">
            Saldo akan otomatis bertambah setelah pembayaran berhasil dikonfirmasi.
          </p>
        </div>
      </Dialog>
    </div>
  );
}
