import { createFileRoute } from "@tanstack/react-router";
import { useOrders, useUpdateOrderStatus, useMedicines, useMedicinesPaginated, useStockMutations, useCreateMedicine, useUpdateMedicine, useDeleteMedicine } from "../../../features/pharmacy/hooks/use-pharmacy";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { EmptyState } from "../../../components/shared/EmptyState";
import { Dialog } from "../../../components/ui/Dialog";
import { useState, useMemo, useEffect } from "react";

export const Route = createFileRoute("/pharmacy/")({
  component: PharmacyDashboardPage,
});

function PharmacyDashboardPage() {
  const { data: orders, isLoading: isOrdersLoading } = useOrders();
  const { data: medicines } = useMedicines();

  // Search & Pagination States
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [medPage, setMedPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(searchInput);
      setMedPage(1); // Reset to first page on search query change
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Stock Mutation History States
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyMedId, setHistoryMedId] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);

  const { data: medicinesPaginated, isLoading: isInventoryLoading } = useMedicinesPaginated(searchTerm, medPage, pageSize);
  const { data: stockMutations, isLoading: isHistoryLoading } = useStockMutations(historyMedId || "", historyPage, 8);
  const { mutateAsync: updateStatus, isPending: isUpdating } = useUpdateOrderStatus();

  const { mutateAsync: createMedicine } = useCreateMedicine();
  const { mutateAsync: updateMedicine } = useUpdateMedicine();
  const { mutateAsync: deleteMedicine } = useDeleteMedicine();

  // Medicine CRUD States
  const [isAddMedOpen, setIsAddMedOpen] = useState(false);
  const [isEditMedOpen, setIsEditMedOpen] = useState(false);
  const [isDeleteMedOpen, setIsDeleteMedOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState<any | null>(null);

  // Medicine Form States
  const [medName, setMedName] = useState("");
  const [medPrice, setMedPrice] = useState("");
  const [medStock, setMedStock] = useState("");
  const [medRequiresPrescription, setMedRequiresPrescription] = useState(false);

  const handleOpenAddMed = () => {
    setMedName("");
    setMedPrice("");
    setMedStock("");
    setMedRequiresPrescription(false);
    setIsAddMedOpen(true);
  };

  const handleConfirmAddMed = async () => {
    if (!medName.trim()) return;
    const price = parseFloat(medPrice) || 0;
    const stock = parseInt(medStock, 10) || 0;
    try {
      await createMedicine({
        name: medName,
        unit_price: price,
        stock_quantity: stock,
        requires_prescription: medRequiresPrescription,
      });
      setIsAddMedOpen(false);
    } catch {
      // Handled
    }
  };

  const handleOpenEditMed = (med: any) => {
    setSelectedMed(med);
    setMedName(med.name);
    setMedPrice(med.unit_price.toString());
    setMedStock(med.stock_quantity.toString());
    setMedRequiresPrescription(med.requires_prescription);
    setIsEditMedOpen(true);
  };

  const handleConfirmEditMed = async () => {
    if (!selectedMed || !medName.trim()) return;
    const price = parseFloat(medPrice) || 0;
    const stock = parseInt(medStock, 10) || 0;
    try {
      await updateMedicine({
        id: selectedMed.id,
        data: {
          name: medName,
          unit_price: price,
          stock_quantity: stock,
          requires_prescription: medRequiresPrescription,
        },
      });
      setIsEditMedOpen(false);
      setSelectedMed(null);
    } catch {
      // Handled
    }
  };

  const handleOpenHistory = (medId: string) => {
    setHistoryMedId(medId);
    setHistoryPage(1);
    setIsHistoryOpen(true);
  };

  const handleOpenDeleteMed = (med: any) => {
    setSelectedMed(med);
    setIsDeleteMedOpen(true);
  };


  const handleConfirmDeleteMed = async () => {
    if (!selectedMed) return;
    try {
      await deleteMedicine(selectedMed.id);
      setIsDeleteMedOpen(false);
      setSelectedMed(null);
    } catch {
      // Handled
    }
  };

  const [activeTab, setActiveTab] = useState<"orders" | "inventory">("orders");
  const [orderFilter, setOrderFilter] = useState<"active" | "history">("active");

  // Detail Modal state
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Status transition state
  const [statusToChange, setStatusToChange] = useState<{ id: string; status: string } | null>(null);
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);
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

  // Filter orders
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (orderFilter === "active") {
      return orders.filter((o) => o.status === "pending" || o.status === "processing" || o.status === "shipped");
    } else {
      return orders.filter((o) => o.status === "delivered" || o.status === "cancelled");
    }
  }, [orders, orderFilter]);

  // Statistics
  const stats = useMemo(() => {
    if (!orders || !medicines) return { pending: 0, processing: 0, lowStock: 0 };
    return {
      pending: orders.filter((o) => o.status === "pending").length,
      processing: orders.filter((o) => o.status === "processing").length,
      lowStock: medicines.filter((m) => m.stock_quantity < 10).length,
    };
  }, [orders, medicines]);

  const handleUpdateStatusClick = (id: string, newStatus: string) => {
    setStatusToChange({ id, status: newStatus });
    setIsStatusConfirmOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!statusToChange) return;
    try {
      await updateStatus({ id: statusToChange.id, status: statusToChange.status });
      setIsStatusConfirmOpen(false);
      setStatusToChange(null);
      // Update local state details if open
      if (selectedOrder && selectedOrder.id === statusToChange.id) {
        setSelectedOrder({ ...selectedOrder, status: statusToChange.status });
      }
    } catch {
      // Handled
    }
  };

  const handleViewDetails = (order: any) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Page Header */}
      <section className="flex flex-col md:flex-row justify-between items-end gap-6 select-none">
        <div className="max-w-2xl">
          <h1 className="font-display text-headline-lg text-primary mb-2 font-bold">Fulfillment Workspace</h1>
          <p className="font-body text-body-lg text-on-surface-variant leading-relaxed">
            Kelola pesanan obat digital pasien secara aman, verifikasi resep, dan pantau tingkat persediaan stok obat apotek.
          </p>
        </div>
      </section>

      {/* Bento Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-surface-container-low border border-outline-variant/30 flex justify-between items-center select-none">
          <div>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Antrean Pesanan Baru</p>
            <h3 className="text-3xl font-bold text-on-surface mt-2">{stats.pending}</h3>
          </div>
          <span className="material-symbols-outlined text-[40px] text-amber-600 bg-amber-600/10 p-3 rounded-2xl">
            pending_actions
          </span>
        </Card>

        <Card className="p-6 bg-surface-container-low border border-outline-variant/30 flex justify-between items-center select-none">
          <div>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Sedang Diproses</p>
            <h3 className="text-3xl font-bold text-on-surface mt-2">{stats.processing}</h3>
          </div>
          <span className="material-symbols-outlined text-[40px] text-primary bg-primary/10 p-3 rounded-2xl">
            hourglass_empty
          </span>
        </Card>

        <Card className="p-6 bg-surface-container-low border border-outline-variant/30 flex justify-between items-center select-none">
          <div>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Stok Obat Menipis (&lt;10)</p>
            <h3 className="text-3xl font-bold text-error mt-2">{stats.lowStock}</h3>
          </div>
          <span className="material-symbols-outlined text-[40px] text-error bg-error/10 p-3 rounded-2xl">
            warning
          </span>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/30 select-none">
        <button
          onClick={() => setActiveTab("orders")}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors ${activeTab === "orders"
            ? "border-primary text-primary"
            : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
        >
          Antrean Pesanan Obat
        </button>
        <button
          onClick={() => setActiveTab("inventory")}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors ${activeTab === "inventory"
            ? "border-primary text-primary"
            : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
        >
          Katalog Stok Obat Apotek
        </button>
      </div>

      {/* Content area */}
      <div className="flex flex-col gap-6">
        {activeTab === "orders" && (
          <div className="flex flex-col gap-6">
            {/* Filter buttons */}
            <div className="flex gap-2 select-none">
              <Button
                variant={orderFilter === "active" ? "primary" : "outline"}
                onClick={() => setOrderFilter("active")}
                className="py-1.5 px-4 rounded-full text-xs font-bold"
              >
                Pesanan Aktif ({orders?.filter((o) => o.status === "pending" || o.status === "processing" || o.status === "shipped").length ?? 0})
              </Button>
              <Button
                variant={orderFilter === "history" ? "primary" : "outline"}
                onClick={() => setOrderFilter("history")}
                className="py-1.5 px-4 rounded-full text-xs font-bold"
              >
                Riwayat Selesai/Batal ({orders?.filter((o) => o.status === "delivered" || o.status === "cancelled").length ?? 0})
              </Button>
            </div>

            {isOrdersLoading ? (
              <div className="flex flex-col gap-4 animate-pulse">
                <div className="h-16 bg-surface-container rounded-xl"></div>
                <div className="h-16 bg-surface-container rounded-xl"></div>
              </div>
            ) : filteredOrders.length > 0 ? (
              <div className="border border-outline-variant/20 rounded-xl overflow-hidden bg-white select-none">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low text-on-surface-variant font-bold border-b border-outline-variant/25">
                    <tr>
                      <th className="px-6 py-3">ID Pesanan</th>
                      <th className="px-6 py-3">Tanggal Pesanan</th>
                      <th className="px-6 py-3">Pasien (UUID)</th>
                      <th className="px-6 py-3">Total Biaya</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10 text-on-surface-variant font-semibold">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-on-surface">#{order.id.slice(0, 8)}</td>
                        <td className="px-6 py-4">{new Date(order.created_at).toLocaleString("id-ID")}</td>
                        <td className="px-6 py-4 font-mono text-[10px] text-on-surface-variant/80">{order.patient_id}</td>
                        <td className="px-6 py-4 font-bold text-on-surface">{formatCurrency(order.total_amount)}</td>
                        <td className="px-6 py-4">{getOrderStatusBadge(order.status)}</td>
                        <td className="px-6 py-4 text-right flex justify-end gap-3 items-center">
                          <button
                            onClick={() => handleViewDetails(order)}
                            className="text-primary hover:underline font-bold"
                          >
                            Proses / Detail
                          </button>
                          {order.status === "pending" && (
                            <button
                              onClick={() => handleUpdateStatusClick(order.id, "processing")}
                              className="text-green-600 hover:underline font-bold"
                            >
                              Mulai Proses
                            </button>
                          )}
                          {order.status === "processing" && (
                            <button
                              onClick={() => handleUpdateStatusClick(order.id, "shipped")}
                              className="text-blue-600 hover:underline font-bold"
                            >
                              Kirim
                            </button>
                          )}
                          {order.status === "shipped" && (
                            <button
                              onClick={() => handleUpdateStatusClick(order.id, "delivered")}
                              className="text-green-600 hover:underline font-bold"
                            >
                              Selesaikan
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
                icon="receipt_long"
                title="Antrean Pesanan Kosong"
                description="Tidak ada pesanan obat aktif yang sesuai dengan kriteria filter saat ini."
              />
            )}
          </div>
        )}

        {activeTab === "inventory" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center select-none bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20 shadow-sm">
              <div className="relative flex-1 max-w-md">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/70 text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Cari nama obat (contoh: Paracetamol)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full bg-white border border-outline-variant/40 rounded-xl py-2.5 pl-11 pr-10 text-xs font-medium text-on-surface placeholder-on-surface-variant/50 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 hover:border-outline-variant/80 shadow-inner"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface transition-colors p-0.5 rounded-full hover:bg-surface-container-lowest"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </div>
              <div className="flex gap-3 items-center justify-end">
                <Badge variant="primary" className="py-2 px-4 rounded-xl text-[10px] font-bold tracking-wide shadow-sm">
                  Total: {medicinesPaginated?.pagination?.total_items ?? 0} Obat Terdaftar
                </Badge>
                <Button
                  onClick={handleOpenAddMed}
                  leftIcon="add_circle"
                  className="py-2 px-5 rounded-xl text-xs font-bold shadow-sm transition-all hover:shadow-md"
                >
                  Tambah Obat Baru
                </Button>
              </div>
            </div>

            {isInventoryLoading ? (
              <div className="flex flex-col gap-4 animate-pulse">
                <div className="h-16 bg-surface-container rounded-xl"></div>
                <div className="h-16 bg-surface-container rounded-xl"></div>
              </div>
            ) : medicinesPaginated?.data && medicinesPaginated.data.length > 0 ? (
              <div className="border border-outline-variant/20 rounded-xl overflow-hidden bg-white select-none">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low text-on-surface-variant font-bold border-b border-outline-variant/25">
                    <tr>
                      <th className="px-6 py-3">Nama Obat</th>
                      <th className="px-6 py-3">Harga Satuan</th>
                      <th className="px-6 py-3">Sisa Stok</th>
                      <th className="px-6 py-3">Resep Dokter</th>
                      <th className="px-6 py-3">Status Stok</th>
                      <th className="px-6 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10 text-on-surface-variant font-semibold">
                    {medicinesPaginated.data.map((med) => (
                      <tr key={med.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-on-surface">{med.name}</td>
                        <td className="px-6 py-4 text-on-surface font-semibold">{formatCurrency(med.unit_price)}</td>
                        <td className={`px-6 py-4 font-bold ${med.stock_quantity < 10 ? "text-error" : "text-on-surface"}`}>
                          {med.stock_quantity} pcs
                        </td>
                        <td className="px-6 py-4">
                          {med.requires_prescription ? (
                            <Badge variant="error">WAJIB RESEP</Badge>
                          ) : (
                            <Badge variant="success">BEBAS</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {med.stock_quantity === 0 ? (
                            <span className="text-error font-bold uppercase tracking-wider text-[9px] bg-error/10 border border-error/25 px-2 py-0.5 rounded-full">HABIS</span>
                          ) : med.stock_quantity < 10 ? (
                            <span className="text-amber-600 font-bold uppercase tracking-wider text-[9px] bg-amber-600/10 border border-amber-600/25 px-2 py-0.5 rounded-full">MENIPIS</span>
                          ) : (
                            <span className="text-green-600 font-bold uppercase tracking-wider text-[9px] bg-green-600/10 border border-green-600/25 px-2 py-0.5 rounded-full">AMAN</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-3 items-center">
                          <button
                            onClick={() => handleOpenHistory(med.id)}
                            className="text-amber-600 hover:underline font-bold"
                          >
                            Riwayat
                          </button>
                          <button
                            onClick={() => handleOpenEditMed(med)}
                            className="text-primary hover:underline font-bold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleOpenDeleteMed(med)}
                            className="text-error hover:underline font-bold"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {medicinesPaginated.pagination && medicinesPaginated.pagination.total_pages > 1 && (
                  <div className="flex justify-between items-center p-4 border-t border-outline-variant/15 select-none text-xs font-semibold text-on-surface-variant bg-surface-container-lowest">
                    <span>
                      Halaman {medicinesPaginated.pagination.page} dari {medicinesPaginated.pagination.total_pages} (Total {medicinesPaginated.pagination.total_items} obat)
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        disabled={medPage <= 1}
                        onClick={() => setMedPage(medPage - 1)}
                        className="py-1 px-3 text-xs"
                      >
                        Sebelumnya
                      </Button>
                      <Button
                        variant="outline"
                        disabled={medPage >= medicinesPaginated.pagination.total_pages}
                        onClick={() => setMedPage(medPage + 1)}
                        className="py-1 px-3 text-xs"
                      >
                        Berikutnya
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                icon="inventory_2"
                title="Katalog Obat Tidak Ditemukan"
                description={searchTerm ? `Tidak ditemukan obat dengan nama "${searchTerm}".` : "Apotek tidak memiliki produk obat medis terdaftar di katalog saat ini."}
              />
            )}
          </div>
        )}

      </div>

      {/* Order Detail & Actions Modal */}
      <Dialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Workspace Pesanan #${selectedOrder?.id.slice(0, 8)}`}
      >
        {selectedOrder && (
          <div className="flex flex-col gap-4 select-none">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-on-surface-variant">Status Saat Ini:</span>
              {getOrderStatusBadge(selectedOrder.status)}
            </div>

            <div className="p-4 rounded-xl border border-outline-variant/20 bg-surface-container-low text-xs font-semibold text-on-surface-variant flex flex-col gap-2">
              <div className="flex justify-between">
                <span>Pasien UUID:</span>
                <span className="font-mono text-on-surface">{selectedOrder.patient_id}</span>
              </div>
              {selectedOrder.prescription_id && (
                <div className="flex justify-between">
                  <span>Resep Digital Ref:</span>
                  <span className="font-mono text-on-surface">#{selectedOrder.prescription_id.slice(0, 8)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tanggal Terbuat:</span>
                <span className="text-on-surface">{new Date(selectedOrder.created_at).toLocaleString("id-ID")}</span>
              </div>
            </div>

            <div className="h-px bg-outline-variant/20"></div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Daftar Obat Yang Dibeli:</span>
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

            <div className="h-px bg-outline-variant/20"></div>

            {/* Transition Controls */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Ubah Status Logistik:</span>
              <div className="flex flex-wrap gap-2.5">
                {selectedOrder.status === "pending" && (
                  <>
                    <Button
                      onClick={() => handleUpdateStatusClick(selectedOrder.id, "processing")}
                      className="py-2.5 px-4 rounded-xl text-xs font-bold flex-1"
                    >
                      Proses Pesanan (Potong Stok)
                    </Button>
                    <Button
                      onClick={() => handleUpdateStatusClick(selectedOrder.id, "cancelled")}
                      className="py-2.5 px-4 rounded-xl text-xs font-bold bg-error hover:bg-error/90 text-white border-none"
                    >
                      Batalkan Pesanan
                    </Button>
                  </>
                )}
                {selectedOrder.status === "processing" && (
                  <>
                    <Button
                      onClick={() => handleUpdateStatusClick(selectedOrder.id, "shipped")}
                      className="py-2.5 px-4 rounded-xl text-xs font-bold flex-1"
                    >
                      Kirim Pesanan (Kurir Logistik)
                    </Button>
                    <Button
                      onClick={() => handleUpdateStatusClick(selectedOrder.id, "cancelled")}
                      className="py-2.5 px-4 rounded-xl text-xs font-bold bg-error hover:bg-error/90 text-white border-none"
                    >
                      Batalkan Pesanan
                    </Button>
                  </>
                )}
                {selectedOrder.status === "shipped" && (
                  <Button
                    onClick={() => handleUpdateStatusClick(selectedOrder.id, "delivered")}
                    className="py-2.5 px-4 rounded-xl text-xs font-bold flex-1"
                  >
                    Tandai Selesai (Tiba di Lokasi)
                  </Button>
                )}
                {selectedOrder.status === "delivered" && (
                  <p className="text-[10px] italic text-on-surface-variant/80 font-bold select-none text-center w-full">
                    Pesanan ini telah selesai dikirim dan ditutup.
                  </p>
                )}
                {selectedOrder.status === "cancelled" && (
                  <p className="text-[10px] italic text-error/80 font-bold select-none text-center w-full">
                    Pesanan ini telah dibatalkan dan pembayaran dikembalikan.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => setIsDetailOpen(false)}
                className="px-6 py-2 rounded-xl"
              >
                Tutup Workspace
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Confirmation of status transitions */}
      <Dialog
        isOpen={isStatusConfirmOpen}
        onClose={() => setIsStatusConfirmOpen(false)}
        title="Konfirmasi Perubahan Status"
      >
        <div className="flex flex-col gap-4 select-none">
          <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
            Apakah Anda yakin ingin mengubah status pesanan ini menjadi <span className="font-bold text-on-surface uppercase font-mono">{statusToChange?.status}</span>?
          </p>
          {statusToChange?.status === "processing" && (
            <div className="p-3 rounded-lg bg-amber-600/10 border border-amber-600/15 text-amber-600 text-[11px] font-semibold leading-relaxed flex gap-2">
              <span className="material-symbols-outlined text-[18px]">info</span>
              <span>Memproses pesanan akan mengunci persediaan stok obat dari inventoris apotek secara fisik.</span>
            </div>
          )}
          {statusToChange?.status === "cancelled" && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/15 text-error text-[11px] font-semibold leading-relaxed flex gap-2">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              <span>Membatalkan pesanan akan mengembalikan saldo pembayaran pasien sepenuhnya dan mengembalikan/melepaskan alokasi stok.</span>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-2">
            <Button
              variant="outline"
              onClick={() => setIsStatusConfirmOpen(false)}
              className="px-5 py-2 rounded-xl"
            >
              Batal
            </Button>
            <Button
              onClick={handleConfirmStatusChange}
              isLoading={isUpdating}
              className="px-5 py-2 rounded-xl"
            >
              Ya, Ubah Status
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Add Medicine Dialog */}
      <Dialog
        isOpen={isAddMedOpen}
        onClose={() => setIsAddMedOpen(false)}
        title="Daftarkan Produk Obat Baru"
      >
        <div className="flex flex-col gap-4 select-none">
          <div className="flex flex-col gap-1.5 text-xs">
            <label className="font-bold text-on-surface-variant">Nama Produk Obat</label>
            <input
              type="text"
              placeholder="Contoh: Paracetamol 500mg"
              value={medName}
              onChange={(e) => setMedName(e.target.value)}
              className="w-full bg-white border border-outline-variant/50 rounded-lg py-2 px-3 text-xs outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-on-surface-variant">Harga Satuan (IDR)</label>
              <input
                type="number"
                min={0}
                placeholder="10000"
                value={medPrice}
                onChange={(e) => setMedPrice(e.target.value)}
                className="w-full bg-white border border-outline-variant/50 rounded-lg py-2 px-3 text-xs outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-on-surface-variant">Jumlah Stok Awal</label>
              <input
                type="number"
                min={0}
                placeholder="100"
                value={medStock}
                onChange={(e) => setMedStock(e.target.value)}
                className="w-full bg-white border border-outline-variant/50 rounded-lg py-2 px-3 text-xs outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-surface-container-low border border-outline-variant/10 text-xs">
            <input
              id="add_req_prescription"
              type="checkbox"
              checked={medRequiresPrescription}
              onChange={(e) => setMedRequiresPrescription(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary"
            />
            <label htmlFor="add_req_prescription" className="font-bold text-on-surface cursor-pointer">
              Obat ini wajib menggunakan resep dokter digital
            </label>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsAddMedOpen(false)}
              className="px-5 py-2 rounded-xl"
            >
              Batal
            </Button>
            <Button
              onClick={handleConfirmAddMed}
              disabled={!medName.trim() || medPrice === "" || medStock === "" || parseFloat(medPrice) < 0 || parseInt(medStock, 10) < 0}
              className="px-5 py-2 rounded-xl"
            >
              Simpan Obat
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Medicine Dialog */}
      <Dialog
        isOpen={isEditMedOpen}
        onClose={() => setIsEditMedOpen(false)}
        title="Edit Data Produk Obat"
      >
        <div className="flex flex-col gap-4 select-none">
          <div className="flex flex-col gap-1.5 text-xs">
            <label className="font-bold text-on-surface-variant">Nama Produk Obat</label>
            <input
              type="text"
              value={medName}
              onChange={(e) => setMedName(e.target.value)}
              className="w-full bg-white border border-outline-variant/50 rounded-lg py-2 px-3 text-xs outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-on-surface-variant">Harga Satuan (IDR)</label>
              <input
                type="number"
                min={0}
                value={medPrice}
                onChange={(e) => setMedPrice(e.target.value)}
                className="w-full bg-white border border-outline-variant/50 rounded-lg py-2 px-3 text-xs outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-on-surface-variant">Jumlah Stok</label>
              <input
                type="number"
                min={0}
                value={medStock}
                onChange={(e) => setMedStock(e.target.value)}
                className="w-full bg-white border border-outline-variant/50 rounded-lg py-2 px-3 text-xs outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-surface-container-low border border-outline-variant/10 text-xs">
            <input
              id="edit_req_prescription"
              type="checkbox"
              checked={medRequiresPrescription}
              onChange={(e) => setMedRequiresPrescription(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary"
            />
            <label htmlFor="edit_req_prescription" className="font-bold text-on-surface cursor-pointer">
              Obat ini wajib menggunakan resep dokter digital
            </label>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsEditMedOpen(false)}
              className="px-5 py-2 rounded-xl"
            >
              Batal
            </Button>
            <Button
              onClick={handleConfirmEditMed}
              disabled={!medName.trim() || medPrice === "" || medStock === "" || parseFloat(medPrice) < 0 || parseInt(medStock, 10) < 0}
              className="px-5 py-2 rounded-xl"
            >
              Simpan Perubahan
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Medicine Confirmation Dialog */}
      <Dialog
        isOpen={isDeleteMedOpen}
        onClose={() => setIsDeleteMedOpen(false)}
        title="Hapus Obat dari Katalog"
      >
        <div className="flex flex-col gap-4 select-none">
          <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
            Apakah Anda yakin ingin menghapus produk obat <span className="font-bold text-on-surface">{selectedMed?.name}</span> dari katalog apotek?
          </p>
          <div className="p-3 rounded-lg bg-error/10 border border-error/15 text-error text-[11px] font-semibold leading-relaxed flex gap-2">
            <span className="material-symbols-outlined text-[18px]">warning</span>
            <span>Tindakan ini permanen. Produk obat yang dihapus tidak akan dapat lagi dipilih oleh dokter untuk resep digital baru.</span>
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteMedOpen(false)}
              className="px-5 py-2 rounded-xl"
            >
              Batal
            </Button>
            <Button
              onClick={handleConfirmDeleteMed}
              className="px-5 py-2 rounded-xl bg-error hover:bg-error/90 text-white border-none"
            >
              Ya, Hapus Obat
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Stock Mutation History Dialog */}
      <Dialog
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title={`Riwayat Mutasi Stok — ${medicines?.find((m) => m.id === historyMedId)?.name ?? "Obat"}`}
        size="lg"
      >
        <div className="flex flex-col gap-4 select-none w-full">
          {isHistoryLoading ? (
            <div className="flex flex-col gap-3 py-8 items-center justify-center animate-pulse">
              <div className="h-6 w-3/4 bg-surface-container rounded"></div>
              <div className="h-6 w-1/2 bg-surface-container rounded"></div>
            </div>
          ) : stockMutations?.data && stockMutations.data.length > 0 ? (
            <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1">
              <div className="relative border-l-2 border-outline-variant/30 ml-4 pl-6 flex flex-col gap-5 py-2">
                {stockMutations.data.map((m) => {
                  const isEntry = m.mutation_type === "in";
                  let icon = "tune";
                  let colorClass = "text-amber-600 bg-amber-500/10 border-amber-500/20";
                  let title = "Penyesuaian Manual";

                  if (m.reference_type === "initial_stock") {
                    icon = "fiber_new";
                    colorClass = "text-primary bg-primary/10 border-primary/20";
                    title = "Pendaftaran Obat Baru";
                  } else if (m.reference_type === "order_fulfillment") {
                    icon = "shopping_cart_checkout";
                    colorClass = "text-error bg-error/10 border-error/20";
                    title = "Fulfillment Pesanan";
                  } else if (m.reference_type === "order_cancel_refund") {
                    icon = "undo";
                    colorClass = "text-green-600 bg-green-500/10 border-green-500/20";
                    title = "Pembatalan Pesanan (Refund)";
                  }

                  return (
                    <div key={m.id} className="relative">
                      {/* Timeline dot icon */}
                      <span className={`material-symbols-outlined absolute -left-[35px] top-1.5 p-1 rounded-full border text-[13px] font-bold z-10 bg-white shadow-sm ${isEntry ? "text-green-600 border-green-200" : "text-error border-error-200"}`}>
                        {isEntry ? "trending_up" : "trending_down"}
                      </span>

                      {/* Card layout */}
                      <div className="bg-surface-container-low hover:bg-surface-container-lowest transition-all duration-200 p-4 rounded-xl border border-outline-variant/20 shadow-sm flex flex-col gap-2.5 ml-2">
                        <div className="flex justify-between items-center text-[10px] font-semibold text-on-surface-variant">
                          <span className="flex items-center gap-1.5 font-bold">
                            <span className={`material-symbols-outlined text-[13px] p-0.5 border rounded-md ${colorClass}`}>{icon}</span>
                            {title}
                          </span>
                          <span>{new Date(m.created_at).toLocaleString("id-ID")}</span>
                        </div>

                        <div className="flex justify-between items-end">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-on-surface-variant font-medium">Perubahan Stok</span>
                            <div className="flex items-center gap-2 font-bold text-xs text-on-surface">
                              <span className="font-mono text-xs bg-surface-container-high px-2 py-0.5 rounded">{m.stock_before}</span>
                              <span className="material-symbols-outlined text-[12px] text-on-surface-variant">arrow_forward</span>
                              <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{m.stock_after}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[9px] text-on-surface-variant font-medium block">Kuantitas</span>
                            <span className={`text-sm font-extrabold ${isEntry ? "text-green-600" : "text-error"}`}>
                              {isEntry ? `+${m.quantity}` : `-${m.quantity}`} Pcs
                            </span>
                          </div>
                        </div>

                        {m.notes && (
                          <div className="bg-surface-container/50 p-2 rounded-lg text-[10px] text-on-surface-variant/80 font-medium italic border border-outline-variant/10 leading-relaxed">
                            <strong>Catatan:</strong> {m.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {stockMutations.pagination && stockMutations.pagination.total_pages > 1 && (
                <div className="flex justify-between items-center text-[10px] font-semibold text-on-surface-variant bg-surface-container-low p-2 rounded-xl border border-outline-variant/10 mt-1 select-none">
                  <span>
                    Halaman {stockMutations.pagination.page} dari {stockMutations.pagination.total_pages} ({stockMutations.pagination.total_items} riwayat)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={historyPage <= 1}
                      onClick={() => setHistoryPage(historyPage - 1)}
                      className="py-1 px-2.5 text-[9px] rounded-lg"
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      disabled={historyPage >= stockMutations.pagination.total_pages}
                      onClick={() => setHistoryPage(historyPage + 1)}
                      className="py-1 px-2.5 text-[9px] rounded-lg"
                    >
                      Berikutnya
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-on-surface-variant text-xs font-semibold">
              <span className="material-symbols-outlined text-[36px] text-on-surface-variant/40 mb-2 block">history_toggle_off</span>
              Tidak ada catatan mutasi stok untuk obat ini.
            </div>
          )}

          <div className="flex justify-end border-t border-outline-variant/10 pt-3">
            <Button
              variant="outline"
              onClick={() => setIsHistoryOpen(false)}
              className="px-5 py-2 rounded-xl text-xs"
            >
              Tutup
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
