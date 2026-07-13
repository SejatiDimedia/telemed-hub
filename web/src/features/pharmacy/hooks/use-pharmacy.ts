import { useQuery } from "@tanstack/react-query";
import { pharmacyApi } from "../api/pharmacy-api";

export const pharmacyKeys = {
  all: ["pharmacy"] as const,
  medicines: (name?: string) => [...pharmacyKeys.all, "medicines", { name }] as const,
};

export function useMedicines(name?: string) {
  return useQuery({
    queryKey: pharmacyKeys.medicines(name),
    queryFn: () => pharmacyApi.listMedicines({ name }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
