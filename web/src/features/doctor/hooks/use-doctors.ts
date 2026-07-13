import { useQuery } from "@tanstack/react-query";
import { doctorApi } from "../api/doctor-api";

export const doctorKeys = {
  all: ["doctors"] as const,
  lists: () => [...doctorKeys.all, "list"] as const,
  details: () => [...doctorKeys.all, "detail"] as const,
  detail: (id: string) => [...doctorKeys.details(), id] as const,
  me: () => [...doctorKeys.all, "me"] as const,
  availabilities: (id: string) => [...doctorKeys.detail(id), "availability"] as const,
};

export function useDoctors() {
  return useQuery({
    queryKey: doctorKeys.lists(),
    queryFn: doctorApi.list,
    staleTime: 10 * 60 * 1000, // 10 minutes cache
  });
}

export function useDoctorProfile(id: string) {
  return useQuery({
    queryKey: doctorKeys.detail(id),
    queryFn: () => doctorApi.get(id),
    enabled: !!id,
  });
}

export function useDoctorAvailability(id: string) {
  return useQuery({
    queryKey: doctorKeys.availabilities(id),
    queryFn: () => doctorApi.getAvailability(id),
    enabled: !!id,
  });
}

export function useDoctorProfileMe() {
  return useQuery({
    queryKey: doctorKeys.me(),
    queryFn: doctorApi.getMe,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
