import { createFileRoute, Link } from "@tanstack/react-router";
import { usePrescriptions } from "../../../features/prescription/hooks/use-prescriptions";
import { useOrders, useCreateOrder, useCancelOrder, useMedicines } from "../../../features/pharmacy/hooks/use-pharmacy";
import { useWallet } from "../../../features/wallet/hooks/use-wallet";
import { useDoctors } from "../../../features/doctor/hooks/use-doctors";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Dialog } from "../../../components/ui/Dialog";
import { Badge } from "../../../components/ui/Badge";
import { EmptyState } from "../../../components/shared/EmptyState";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/patient/orders")({
  component: PatientOrdersPage,
});

function PatientOrdersPage() {
  const { data: prescriptions, isLoading: isPrescriptionsLoading } = usePrescriptions();
  const { data: orders, isLoading: isOrdersLoading } = useOrders();
  const { data: wallet } = useWallet();
  const { data: medicines } = useMedicines();
  const { data: doctors } = useDoctors();

  const { mutateAsync: createOrder, isPending: isCheckingOut } = useCreateOrder();
  const { mutateAsync: cancelOrder, isPending: isCancelling } = useCancelOrder();

  const [activeTab, setActiveTab] = useState<"prescriptions" | "orders">("prescriptions");

  // Checkout dialog states
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Cancel confirmation dialog states
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  // View order detail states
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);

  const walletBalance = wallet?.balance ?? 0;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);
  };

  const getDoctorName = (id: string) => {
    return doctors?.find((d) => d.id === id)?.full_name ?? "Dokter Mitra";
  };

  // Helper to map prescription items to check prices
  const checkoutItems = useMemo(() => {
    if (!selectedPrescription || !medicines) return [];
    return selectedPrescription.items.map((item: any) => {
      const med = medicines.find((m) => m.id === item.medicine_id);
      const unitPrice = med?.unit_price ?? 0;
      return {
        ...item,
        unit_price: unitPrice,
        subtotal: unitPrice * item.quantity,
      };
    });
  }, [selectedPrescription, medicines]);

  const checkoutTotal = useMemo(() => {
    return checkoutItems.reduce((acc: number, item: any) => acc + item.subtotal, 0);
  }, [checkoutItems]);

  const handleCheckoutClick = (prescription: any) => {
    setSelectedPrescription(prescription);
    setIsCheckoutOpen(true);
  };

  const handleConfirmCheckout = async () => {
    if (!selectedPrescription) return;
    try {
      const idempotencyKey = crypto.randomUUID();
      await createOrder({
        data: { prescription_id: selectedPrescription.id },
        idempotencyKey,
      });
      setIsCheckoutOpen(false);
      setSelectedPrescription(null);
      setActiveTab("orders");
    } catch {
      // Toast handles error notifications
    }
  };

  const handleCancelClick = (orderId: string) => {
    setOrderToCancel(orderId);
    setIsCancelOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    try {
      await cancelOrder(orderToCancel);
      setIsCancelOpen(false);
      setOrderToCancel(null);
    } catch {
      // Handled by toast
    }
  };

  const handleViewOrder = (order: any) => {
    setSelectedOrder(order);
    setIsOrderDetailOpen(true);
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="neutral">MENUNGGU</Badge>;
      case "processing":
        return <Badge variant="primary">DIPROSES</Badge>;
      case "shipped":
        return <Badge variant="info">DIKIRIM</Badge>;
      case "delivered":
        return <Badge variant="success">SELESAI</Badge>;
      case "cancelled":
        return <Badge variant="error">DIBATALKAN</Badge>;
      default:
        return <Badge variant="neutral">{status.toUpperCase()}</Badge>;
    }
  };

  const getPrescriptionStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="success">BELUM DITEBUS</Badge>;
      case "fulfilled":
        return <Badge variant="neutral">TELAH DITEBUS</Badge>;
      case "expired":
        return <Badge variant="error">EXPIRED</Badge>;
      default:
        return <Badge variant="neutral">{status.toUpperCase()}</Badge>;
    }
  };

  // Filter active vs historical prescriptions
  const activePrescriptions = useMemo(() => {
    return prescriptions?.filter((p) => p.status === "active") ?? [];
  }, [prescriptions]);

  const historyPrescriptions = useMemo(() => {
    return prescriptions?.filter((p) => p.status !== "active") ?? [];
  }, [prescriptions]);

  return (
    <div className="flex flex-col gap-8">
      {/* Page Header */}
      <section className="flex flex-col md:flex-row justify-between items-end gap-6 select-none">
        <div className="max-w-2xl">
          <h1 className="font-display text-headline-lg text-primary mb-2 font-bold">Layanan Farmasi</h1>
          <p className="font-body text-body-lg text-on-surface-variant leading-relaxed">
            Tebus resep digital dari dokter Anda menggunakan saldo dompet digital dan lacak pengiriman obat Anda secara langsung.
          </p>
        </div>
      </section>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-surface-container-low border border-outline-variant/30 flex justify-between items-center select-none">
          <div>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Resep Aktif</p>
            <h3 className="text-3xl font-bold text-on-surface mt-2">{activePrescriptions.length}</h3>
          </div>
          {/* <span className="material-symbols-outlined text-[40px] text-primary bg-primary/10 p-3 rounded-2xl">
            prescription
          </span> */}
        </Card>

        <Card className="p-6 bg-surface-container-low border border-outline-variant/30 flex justify-between items-center select-none">
          <div>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Total Pesanan</p>
            <h3 className="text-3xl font-bold text-on-surface mt-2">
              {orders?.filter((o) => o.status !== "cancelled" && o.status !== "delivered").length ?? 0}
            </h3>
          </div>
          <span className="material-symbols-outlined text-[40px] text-secondary bg-secondary/10 p-3 rounded-2xl">
            local_shipping
          </span>
        </Card>

        <Card className="p-6 bg-surface-container-low border border-outline-variant/30 flex justify-between items-center select-none">
          <div>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Saldo Dompet Digital</p>
            <h3 className="text-2xl font-bold text-on-surface mt-2">{formatCurrency(walletBalance)}</h3>
          </div>
          <Link to="/patient/wallet" className="flex items-center text-xs font-bold text-primary hover:underline gap-1 bg-primary/5 px-3 py-2 rounded-xl">
            Top Up
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
          </Link>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/30 select-none">
        <button
          onClick={() => setActiveTab("prescriptions")}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors ${activeTab === "prescriptions"
            ? "border-primary text-primary"
            : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
        >
          Resep Dokter Aktif
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors ${activeTab === "orders"
            ? "border-primary text-primary"
            : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
        >
          Riwayat & Pelacakan Pesanan
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex flex-col gap-6">
        {activeTab === "prescriptions" && (
          <div className="flex flex-col gap-6">
            {isPrescriptionsLoading ? (
              <div className="flex flex-col gap-4 animate-pulse">
                <div className="h-28 bg-surface-container rounded-xl"></div>
                <div className="h-28 bg-surface-container rounded-xl"></div>
              </div>
            ) : activePrescriptions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activePrescriptions.map((prescription) => (
                  <Card key={prescription.id} className="p-6 bg-white border border-outline-variant/20 hover:shadow-level-1 transition-all duration-300 flex flex-col justify-between gap-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-start select-none">
                        <div>
                          <h4 className="font-bold text-on-surface text-base">{getDoctorName(prescription.doctor_id)}</h4>
                          <span className="text-xs text-on-surface-variant/80 font-medium">
                            Dikeluarkan pada: {new Date(prescription.issued_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        {getPrescriptionStatusBadge(prescription.status)}
                      </div>
                      <div className="h-px bg-outline-variant/10 my-1"></div>
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/80 select-none">Obat yang Diresepkan:</span>
                        <ul className="text-xs font-semibold text-on-surface-variant space-y-1.5 list-disc list-inside">
                          {(prescription.items || []).map((item: any) => (
                            <li key={item.id} className="list-item">
                              {item.medicine_name} — <span className="font-bold text-on-surface">{item.quantity} pcs</span> ({item.dosage} / {item.instructions})
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleCheckoutClick(prescription)}
                      leftIcon="shopping_cart"
                      className="w-full py-2.5 rounded-xl font-bold mt-2"
                    >
                      Tebus & Bayar Resep
                    </Button>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="prescription"
                title="Tidak Ada Resep Aktif"
                description="Semua resep digital Anda telah ditebus atau kedaluwarsa. Konsultasikan dengan dokter untuk resep baru."
              />
            )}

            {/* History of prescriptions section if any */}
            {historyPrescriptions.length > 0 && (
              <div className="mt-8 flex flex-col gap-4">
                <h3 className="font-bold text-on-surface text-md select-none">Resep Sebelumnya</h3>
                <div className="border border-outline-variant/20 rounded-xl overflow-hidden bg-white select-none">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-container-low text-on-surface-variant font-bold border-b border-outline-variant/25">
                      <tr>
                        <th className="px-6 py-3">Dokter</th>
                        <th className="px-6 py-3">Tanggal Terbit</th>
                        <th className="px-6 py-3">Obat-obatan</th>
                        <th className="px-6 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10 text-on-surface-variant font-semibold">
                      {historyPrescriptions.map((p) => (
                        <tr key={p.id}>
                          <td className="px-6 py-4 font-bold text-on-surface">{getDoctorName(p.doctor_id)}</td>
                          <td className="px-6 py-4">{new Date(p.issued_at).toLocaleDateString("id-ID")}</td>
                          <td className="px-6 py-4">
                            {(p.items || []).map((i: any) => i.medicine_name).join(", ")}
                          </td>
                          <td className="px-6 py-4 text-right">{getPrescriptionStatusBadge(p.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "orders" && (
          <div className="flex flex-col gap-6">
            {isOrdersLoading ? (
              <div className="flex flex-col gap-4 animate-pulse">
                <div className="h-16 bg-surface-container rounded-xl"></div>
                <div className="h-16 bg-surface-container rounded-xl"></div>
              </div>
            ) : orders && orders.length > 0 ? (
              <div className="border border-outline-variant/20 rounded-xl overflow-hidden bg-white select-none">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low text-on-surface-variant font-bold border-b border-outline-variant/25">
                    <tr>
                      <th className="px-6 py-3">ID Pesanan</th>
                      <th className="px-6 py-3">Tanggal Pemesanan</th>
                      <th className="px-6 py-3">Total Biaya</th>
                      <th className="px-6 py-3">Status Fulfillment</th>
                      <th className="px-6 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10 text-on-surface-variant font-semibold">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-on-surface">#{order.id.slice(0, 8)}</td>
                        <td className="px-6 py-4">{new Date(order.created_at).toLocaleString("id-ID")}</td>
                        <td className="px-6 py-4 text-on-surface font-bold">{formatCurrency(order.total_amount)}</td>
                        <td className="px-6 py-4">{getOrderStatusBadge(order.status)}</td>
                        <td className="px-6 py-4 text-right flex justify-end gap-3 items-center">
                          <button
                            onClick={() => handleViewOrder(order)}
                            className="text-primary hover:underline font-bold text-xs"
                          >
                            Detail
                          </button>
                          {order.status === "pending" && (
                            <button
                              onClick={() => handleCancelClick(order.id)}
                              className="text-error hover:underline font-bold text-xs"
                            >
                              Batalkan
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon="local_shipping"
                title="Tidak Ada Pesanan Obat"
                description="Anda belum pernah memesan obat dari platform ini. Tebus resep aktif di tab sebelah untuk melakukan pesanan."
              />
            )}
          </div>
        )}
      </div>

      {/* Checkout Summary Confirmation Dialog */}
      <Dialog
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        title="Konfirmasi Penebusan Resep Digital"
      >
        <div className="flex flex-col gap-4 select-none">
          <p className="text-xs text-on-surface-variant font-medium">
            Silakan tinjau daftar obat yang akan ditebus. Pembayaran akan dipotong secara otomatis dari dompet digital Anda.
          </p>

          <div className="border border-outline-variant/20 rounded-xl overflow-hidden bg-surface-container-low text-xs">
            <div className="bg-surface-container font-bold text-on-surface-variant px-4 py-2 border-b border-outline-variant/15 flex justify-between">
              <span>Item Obat</span>
              <span>Subtotal</span>
            </div>
            <div className="divide-y divide-outline-variant/10 px-4">
              {checkoutItems.map((item: any) => (
                <div key={item.id} className="py-2.5 flex justify-between font-semibold text-on-surface-variant">
                  <div>
                    <span className="font-bold text-on-surface">{item.medicine_name}</span> x {item.quantity}
                    <span className="block text-[10px] text-on-surface-variant/80 font-normal mt-0.5">
                      Harga satuan: {formatCurrency(item.unit_price)}
                    </span>
                  </div>
                  <span className="font-bold text-on-surface">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="bg-surface-container font-bold text-on-surface px-4 py-3 border-t border-outline-variant/20 flex justify-between text-sm">
              <span>Total Tagihan</span>
              <span className="text-primary">{formatCurrency(checkoutTotal)}</span>
            </div>
          </div>

          <div className="h-px bg-outline-variant/25 my-1"></div>

          {/* Wallet balance comparison */}
          <div className="p-4 rounded-xl border border-outline-variant/20 flex flex-col gap-2 bg-surface-container-low text-xs font-semibold">
            <div className="flex justify-between text-on-surface-variant">
              <span>Saldo Dompet Digital Anda:</span>
              <span className="text-on-surface">{formatCurrency(walletBalance)}</span>
            </div>
            <div className="flex justify-between text-on-surface-variant">
              <span>Biaya Penebusan Obat:</span>
              <span className="text-error font-bold">- {formatCurrency(checkoutTotal)}</span>
            </div>
            <div className="h-px bg-outline-variant/10 w-full my-1"></div>
            {walletBalance >= checkoutTotal ? (
              <div className="flex justify-between text-on-surface-variant">
                <span>Estimasi Saldo Akhir:</span>
                <span className="text-green-600 font-bold">{formatCurrency(walletBalance - checkoutTotal)}</span>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-error/10 text-error border border-error/15 flex flex-col gap-1.5 mt-1 font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                  <span>Saldo Tidak Mencukupi</span>
                </div>
                <p className="font-normal text-[10px] leading-relaxed">
                  Silakan lakukan pengisian saldo (Top Up) terlebih dahulu sebelum menebus resep ini.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsCheckoutOpen(false)}
              className="px-5 py-2 rounded-xl"
            >
              Kembali
            </Button>
            <Button
              onClick={handleConfirmCheckout}
              isLoading={isCheckingOut}
              disabled={walletBalance < checkoutTotal || checkoutTotal === 0}
              className="px-5 py-2 rounded-xl"
            >
              Bayar & Konfirmasi
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Cancel Order Dialog */}
      <Dialog
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        title="Batalkan Pesanan Obat"
      >
        <div className="flex flex-col gap-4 select-none">
          <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
            Apakah Anda yakin ingin membatalkan pesanan obat ini? Pembatalan hanya dapat dilakukan sebelum status pesanan diproses oleh apoteker.
          </p>
          <div className="p-3 rounded-lg bg-amber-600/10 border border-amber-600/15 text-amber-600 text-[11px] font-semibold leading-relaxed flex gap-2">
            <span className="material-symbols-outlined text-[18px]">info</span>
            <span>Dana pembayaran pesanan akan dikembalikan (refund) secara penuh ke dompet digital Anda setelah pesanan dibatalkan.</span>
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <Button
              variant="outline"
              onClick={() => setIsCancelOpen(false)}
              className="px-5 py-2 rounded-xl"
            >
              Batal
            </Button>
            <Button
              onClick={handleConfirmCancel}
              isLoading={isCancelling}
              className="px-5 py-2 rounded-xl bg-error hover:bg-error/90 text-white border-none"
            >
              Ya, Batalkan Pesanan
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Order Detail Viewer Dialog */}
      <Dialog
        isOpen={isOrderDetailOpen}
        onClose={() => setIsOrderDetailOpen(false)}
        title={`Rincian Pesanan #${selectedOrder?.id.slice(0, 8)}`}
      >
        {selectedOrder && (
          <div className="flex flex-col gap-4 select-none">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-on-surface-variant">Status Pesanan:</span>
              {getOrderStatusBadge(selectedOrder.status)}
            </div>

            <div className="h-px bg-outline-variant/20"></div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant select-none">Daftar Obat:</span>
              <div className="border border-outline-variant/10 rounded-xl overflow-hidden bg-surface-container-low text-xs">
                <table className="w-full text-left">
                  <thead className="bg-surface-container text-on-surface-variant font-bold border-b border-outline-variant/15">
                    <tr>
                      <th className="px-4 py-2">Nama Obat</th>
                      <th className="px-4 py-2">Jumlah</th>
                      <th className="px-4 py-2 text-right">Harga</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10 text-on-surface-variant font-semibold">
                    {selectedOrder.items.map((item: any) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2.5 font-bold text-on-surface">
                          {medicines?.find((m) => m.id === item.medicine_id)?.name ?? "Obat"}
                        </td>
                        <td className="px-4 py-2.5 text-on-surface">{item.quantity} pcs</td>
                        <td className="px-4 py-2.5 text-right text-on-surface font-bold">
                          {formatCurrency(item.unit_price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-surface-container text-on-surface font-bold border-t border-outline-variant/20">
                      <td colSpan={2} className="px-4 py-2.5 text-right uppercase tracking-wider text-[10px] text-on-surface-variant">Total Pembayaran</td>
                      <td className="px-4 py-2.5 text-right text-primary text-sm">{formatCurrency(selectedOrder.total_amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button
                onClick={() => setIsOrderDetailOpen(false)}
                className="px-6 py-2 rounded-xl"
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
