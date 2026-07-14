import { apiClient } from "../../../lib/api-client";
import type { PaginatedResult } from "../../../lib/api-client";
import type { Medicine, Order, StockMutation } from "../types";

export const pharmacyApi = {
  listMedicines: (params?: { name?: string; page?: number; page_size?: number }): Promise<PaginatedResult<Medicine[]>> => {
    const searchParams = new URLSearchParams();
    if (params?.name) {
      searchParams.append("name", params.name);
    }
    const pageSize = params?.page_size ?? 20;
    searchParams.append("page_size", pageSize.toString());
    searchParams.append("page", (params?.page ?? 1).toString());
    const query = `?${searchParams.toString()}`;
    return apiClient.getWithPagination<Medicine[]>(`/medicines${query}`);
  },

  listStockMutations: (medicineId: string, params?: { page?: number; page_size?: number }): Promise<PaginatedResult<StockMutation[]>> => {
    const searchParams = new URLSearchParams();
    searchParams.append("page", (params?.page ?? 1).toString());
    searchParams.append("page_size", (params?.page_size ?? 10).toString());
    return apiClient.getWithPagination<StockMutation[]>(`/medicines/${medicineId}/mutations?${searchParams.toString()}`);
  },


  createOrder: (data: { prescription_id: string }, idempotencyKey?: string): Promise<Order> => {
    const options = idempotencyKey
      ? { headers: { "Idempotency-Key": idempotencyKey } }
      : undefined;
    return apiClient.post<Order>("/orders", data, options);
  },

  listOrders: (params?: { status?: string }): Promise<Order[]> => {
    const searchParams = new URLSearchParams();
    if (params?.status) {
      searchParams.append("status", params.status);
    }
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return apiClient.get<Order[]>(`/orders${query}`);
  },

  getOrder: (id: string): Promise<Order> => {
    return apiClient.get<Order>(`/orders/${id}`);
  },

  updateOrderStatus: (id: string, status: string): Promise<Order> => {
    return apiClient.put<Order>(`/orders/${id}/status`, { status });
  },

  cancelOrder: (id: string): Promise<void> => {
    return apiClient.post<void>(`/orders/${id}/cancel`);
  },

  createMedicine: (data: {
    name: string;
    unit_price: number;
    stock_quantity: number;
    requires_prescription: boolean;
  }): Promise<Medicine> => {
    return apiClient.post<Medicine>("/medicines", data);
  },

  updateMedicine: (id: string, data: {
    name: string;
    unit_price: number;
    stock_quantity: number;
    requires_prescription: boolean;
  }): Promise<Medicine> => {
    return apiClient.put<Medicine>(`/medicines/${id}`, data);
  },

  deleteMedicine: (id: string): Promise<void> => {
    return apiClient.delete<void>(`/medicines/${id}`);
  },
};
