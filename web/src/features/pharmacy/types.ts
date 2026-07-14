export type { PaginatedResult, PaginationInfo } from "../../lib/api-client";

export interface Medicine {
  id: string;
  name: string;
  unit_price: number;
  stock_quantity: number;
  requires_prescription: boolean;
  created_at?: string;
  updated_at?: string;
}

export type MutationType = "in" | "out";
export type ReferenceType = "initial_stock" | "manual_adjustment" | "order_fulfillment" | "order_cancel_refund";

export interface StockMutation {
  id: string;
  medicine_id: string;
  medicine_name: string;
  mutation_type: MutationType;
  quantity: number;
  stock_before: number;
  stock_after: number;
  reference_type: ReferenceType;
  reference_id?: string;
  notes: string;
  created_by: string;
  created_at: string;
}

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

export interface OrderItem {
  id: string;
  medicine_id: string;
  quantity: number;
  unit_price: number;
}

export interface Order {
  id: string;
  patient_id: string;
  prescription_id?: string;
  status: OrderStatus;
  total_amount: number;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

