import { z } from "zod";

const rolesList = ["patient", "doctor"] as const;

// Zod schemas for validation
export const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password tidak boleh kosong"),
});

export const registerSchema = z
  .object({
    full_name: z.string().min(2, "Nama lengkap minimal 2 karakter"),
    email: z.string().email("Format email tidak valid"),
    role: z.enum(rolesList, {
      message: "Role harus diisi (Patient atau Doctor)",
    }),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .regex(/[A-Z]/, "Password harus mengandung minimal 1 huruf besar")
      .regex(/[0-9]/, "Password harus mengandung minimal 1 angka")
      .regex(/[^a-zA-Z0-9]/, "Password harus mengandung minimal 1 karakter spesial"),
    confirm_password: z.string().min(1, "Konfirmasi password harus diisi"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirm_password"],
  });

export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = Omit<z.infer<typeof registerSchema>, "confirm_password">;
export type RegisterFormInput = z.infer<typeof registerSchema>;
export type UserRole = "patient" | "doctor" | "pharmacy_staff" | "admin";
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
}
