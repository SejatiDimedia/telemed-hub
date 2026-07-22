import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth-api";
import { useAuth } from "../../../context/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { useToastStore } from "../../../stores/toast-store";

export function useLoginMutation() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async (data) => {
      // 1. Save tokens & decode user
      await login(data.access_token, data.refresh_token);

      // 2. Decode user profile from token to determine redirect path
      const parts = data.access_token.split(".");
      const payload = parts[1];
      if (payload) {
        try {
          const decoded = JSON.parse(atob(payload)) as {
            email?: string;
            roles?: string[];
          };
          const mainRole = decoded.roles?.[0]?.toLowerCase() ?? "patient";
          const username = decoded.email?.split("@")[0] ?? "User";

          addToast({
            type: "success",
            title: "Sign In Successful",
            message: `Selamat datang kembali, ${username}!`,
          });

          // Redirect
          if (mainRole === "admin") {
            void navigate({ to: "/admin" });
          } else if (mainRole === "doctor") {
            void navigate({ to: "/doctor" });
          } else if (mainRole === "pharmacy_staff") {
            void navigate({ to: "/pharmacy" });
          } else {
            void navigate({ to: "/patient" });
          }
          return;
        } catch {
          // ignore error and fallback
        }
      }

      // Default redirect
      void navigate({ to: "/patient" });
    },
  });
}

export function useRegisterMutation() {
  const navigate = useNavigate();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      addToast({
        type: "success",
        title: "Pendaftaran Berhasil",
        message: `Akun dengan email ${data.email} berhasil didaftarkan. Silakan login.`,
      });
      void navigate({ to: "/login" });
    },
  });
}
