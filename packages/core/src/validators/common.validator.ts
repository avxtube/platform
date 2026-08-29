import { z } from "zod";

export const emailSchema = z
    .string()
    .min(1, "required.email")
    .email({ message: "invalid.email" })
    .trim()
    .toLowerCase();

export const passwordSchema = z
    .string()
    .trim()
    .min(1, "required.password")
    .min(8, { message: "invalid.passwordMin" })

export const passwordWithRegexSchema = z
    .string()
    .trim()
    .min(8, { message: "invalid.passwordMin" })
    .max(255, { message: "invalid.passwordMax" })
    .regex(/[a-z]/, { message: "invalid.passwordLower" })
    .regex(/[A-Z]/, { message: "invalid.passwordUpper" })
    .regex(/\d/, { message: "invalid.passwordNum" })
    .regex(/[!@#$%^&*(),.?":{}|<>]/, { message: "invalid.passwordSpecial" });