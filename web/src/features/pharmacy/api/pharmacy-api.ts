import { apiClient } from "../../../lib/api-client";
import type { Medicine } from "../types";

export const pharmacyApi = {
  listMedicines: (params?: { name?: string }): Promise<Medicine[]> => {
    const searchParams = new URLSearchParams();
    if (params?.name) {
      searchParams.append("name", params.name);
    }
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return apiClient.get<Medicine[]>(`/medicines${query}`);
  },
};
