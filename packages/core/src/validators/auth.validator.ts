import { z } from "zod";
import { emailSchema, passwordSchema } from "./common.validator";
import { UserRole } from "../enums";

export const loginSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    rememberMe: z.boolean().optional(),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const passwordOnlySchema = z.object({
    password: passwordSchema,
});
export type PasswordOnlyFormValues = z.infer<typeof passwordOnlySchema>;

export const registerSchema = z.object({
    name: z.string().min(2, { message: "invalid.nameMin" }).trim(),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: passwordSchema,
    agreeTerms: z.boolean().refine((val) => val === true, "invalid.agreeTerms"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "invalid.passwordMismatch",
    path: ["confirmPassword"],
});
export type RegisterFormValues = z.infer<typeof registerSchema>;


export const changePasswordValid = z.object({
    current_password: passwordSchema,
    new_password: passwordSchema,
    revoke_session: z.boolean().optional(),
}).refine((data) => data.current_password !== data.new_password, {
    message: "invalid.passwordMismatch",
    path: ["new_password"],
})
export type ChangePasswordValidInfer = z.infer<typeof changePasswordValid>;


export const setPasswordSchema = z.object({
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "invalid.passwordMismatch",
    path: ["confirmPassword"],
})

export type SetPasswordValidInfer = z.infer<typeof setPasswordSchema>;

export const EmailValid = z.object({
    email: emailSchema
})
export type EmailValidInfer = z.infer<typeof EmailValid>;


export const twoFactorVerifySchema = z.object({
    code: z.string().min(6, "invalid.twoFactorCode"),
});

export type TwoFactorVerifyValues = z.infer<typeof twoFactorVerifySchema>;

export const createUserSchema = z.object({
    name: z.string().min(2, { message: "auth.error.nameTooShort" }).trim(),
    email: emailSchema,
    password: passwordSchema,
    role: z.nativeEnum(UserRole),
});
export type CreateUserInfer = z.infer<typeof createUserSchema>;