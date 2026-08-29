// packages/auth/src/handlers.ts

/** ผู้ใช้แบบหลวมๆ ที่ event ต่างๆ ส่งมาให้ (อย่างน้อยต้องมี email) */
export type AuthEventUser = {
    id?: string;
    email: string;
    name?: string;
    /** additional field จาก better-auth (user.additionalFields.country) */
    country?: string;
};

/** ข้อมูล account (provider) ที่ผูก/ยกเลิกกับผู้ใช้ */
export type AuthEventAccount = {
    userId: string;
    providerId: string;
};

/** payload ตอน sign-in สำเร็จ = session + ข้อมูลที่ดึงเพิ่มจาก request */
export type AuthSignInPayload = {
    userId: string;
    country: string;
    provider: string;
    ip: string;
    userAgent: string;
};

export const authEvents = {
    onSendOTP: async (data: { user: AuthEventUser, otp: string }) => {
        void data;
        console.warn("[Auth] onSendOTP handler is not registered");
    },
    onSendMagicLink: async (data: { email: string, url: string }) => {
        void data;
        console.warn("[Auth] onSendMagicLink handler is not registered");
    },
    onSendWelcomeEmail: async (data: { user: AuthEventUser, url: string }) => {
        void data;
        console.warn("[Auth] onSendWelcomeEmail handler is not registered");
    },
    onSendResetPasswordEmail: async (data: { user: AuthEventUser, url: string }) => {
        void data;
        console.warn("[Auth] onSendResetPasswordEmail handler is not registered");
    },
    onSendVerificationEmail: async (data: { user: AuthEventUser, url: string }) => {
        void data;
        console.warn("[Auth] onSendVerificationEmail handler is not registered");
    },
    onUserSignUpSuccess: async (data: { user: AuthEventUser }) => {
        console.log(`[Default] User Sign Up Success: ${data.user.email}`);
    },
    onUserSignInSuccess: async (data: AuthSignInPayload) => {
        console.log(`[Default] User Sign In Success: ${data.userId} (${data.provider})`);
    },
    onUserSignOutSuccess: async (data: { user: AuthEventUser }) => {
        console.log(`[Default] User Sign Out Success: ${data.user.email}`);
    },
    onUserDeleteSuccess: async (data: { user: AuthEventUser }) => {
        console.log(`[Default] User Delete Success: ${data.user.email}`);
    },
    onAccountLinked: async (data: { userId: string; provider: string; account: AuthEventAccount; user?: { email: string; name: string } }) => {
        console.log(`[Default] Account Linked: userId=${data.userId}, provider=${data.provider}`);
    },
    onAccountUnlinked: async (data: { userId: string; provider: string; account: AuthEventAccount; user?: { email: string; name: string } }) => {
        console.log(`[Default] Account Unlinked: userId=${data.userId}, provider=${data.provider}`);
    }
};

export function registerAuthEvents(handlers: Partial<typeof authEvents>) {
    Object.assign(authEvents, handlers);
}
