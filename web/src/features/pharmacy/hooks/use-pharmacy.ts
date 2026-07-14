import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pharmacyApi } from "../api/pharmacy-api";
import { useToastStore } from "../../../stores/toast-store";

export const pharmacyKeys = {
  all: ["pharmacy"] as const,
  medicines: (params?: { name?: string; page?: number; pageSize?: number }) =>
    [...pharmacyKeys.all, "medicines", params] as const,
  orders: (status?: string) => [...pharmacyKeys.all, "orders", { status }] as const,
  order: (id: string) => [...pharmacyKeys.all, "order", id] as const,
  stockMutations: (medicineId: string, page?: number) =>
    [...pharmacyKeys.all, "stockMutations", medicineId, { page }] as const,
};

export function useMedicines(name?: string) {
  const query = useQuery({
    queryKey: pharmacyKeys.medicines({ name, page: 1, pageSize: 100 }),
    queryFn: () => pharmacyApi.listMedicines({ name, page: 1, page_size: 100 }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    ...query,
    data: query.data?.data, // Extract only the Medicine[] array
  };
}

export function useMedicinesPaginated(name?: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: pharmacyKeys.medicines({ name, page, pageSize }),
    queryFn: () => pharmacyApi.listMedicines({ name, page, page_size: pageSize }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (prev) => prev, // keep previous data while fetching next page
  });
}

export function useStockMutations(medicineId: string, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: pharmacyKeys.stockMutations(medicineId, page),
    queryFn: () => pharmacyApi.listStockMutations(medicineId, { page, page_size: pageSize }),
    enabled: !!medicineId,
  });
}


export function useOrders(status?: string) {
  return useQuery({
    queryKey: pharmacyKeys.orders(status),
    queryFn: () => pharmacyApi.listOrders({ status }),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: pharmacyKeys.order(id),
    queryFn: () => pharmacyApi.getOrder(id),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: ({ data, idempotencyKey }: { data: { prescription_id: string }; idempotencyKey?: string }) =>
      pharmacyApi.createOrder(data, idempotencyKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pharmacyKeys.all });
      // Also invalidate wallet balance since it gets deducted
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
      // Invalidate prescriptions since status changes
      void queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      addToast({
        type: "success",
        title: "Pesanan Berhasil",
        message: "Pesanan obat berhasil dibuat dan pembayaran diproses.",
      });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      pharmacyApi.updateOrderStatus(id, status),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: pharmacyKeys.all });
      // Invalidate specific order detail
      void queryClient.invalidateQueries({ queryKey: pharmacyKeys.order(data.id) });
      addToast({
        type: "success",
        title: "Status Pesanan Diperbarui",
        message: `Status pesanan berhasil diubah menjadi ${status}.`,
      });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: (id: string) => pharmacyApi.cancelOrder(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: pharmacyKeys.all });
      void queryClient.invalidateQueries({ queryKey: pharmacyKeys.order(id) });
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
      addToast({
        type: "success",
        title: "Pesanan Dibatalkan",
        message: "Pesanan obat berhasil dibatalkan dan dana telah dikembalikan.",
      });
    },
  });
}

export function useCreateMedicine() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: (data: {
      name: string;
      unit_price: number;
      stock_quantity: number;
      requires_prescription: boolean;
    }) => pharmacyApi.createMedicine(data),
    onSuccess: (med) => {
      void queryClient.invalidateQueries({ queryKey: pharmacyKeys.all });
      addToast({
        type: "success",
        title: "Obat Ditambahkan",
        message: `Produk obat ${med.name} berhasil didaftarkan ke katalog.`,
      });
    },
    onError: (err: any) => {
      addToast({
        type: "error",
        title: "Gagal Menambahkan Obat",
        message: err instanceof Error ? err.message : "Terjadi kesalahan server.",
      });
    },
  });
}

export function useUpdateMedicine() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: ({ id, data }: {
      id: string;
      data: {
        name: string;
        unit_price: number;
        stock_quantity: number;
        requires_prescription: boolean;
      };
    }) => pharmacyApi.updateMedicine(id, data),
    onSuccess: (med) => {
      void queryClient.invalidateQueries({ queryKey: pharmacyKeys.all });
      addToast({
        type: "success",
        title: "Katalog Diperbarui",
        message: `Data obat ${med.name} berhasil diperbarui.`,
      });
    },
    onError: (err: any) => {
      addToast({
        type: "error",
        title: "Gagal Memperbarui Obat",
        message: err instanceof Error ? err.message : "Terjadi kesalahan server.",
      });
    },
  });
}

export function useDeleteMedicine() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: (id: string) => pharmacyApi.deleteMedicine(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pharmacyKeys.all });
      addToast({
        type: "success",
        title: "Obat Dihapus",
        message: "Data obat berhasil dihapus dari katalog.",
      });
    },
    onError: (err: any) => {
      addToast({
        type: "error",
        title: "Gagal Menghapus Obat",
        message: err instanceof Error ? err.message : "Terjadi kesalahan server.",
      });
    },
  });
}
