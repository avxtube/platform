import { createAuthClient } from "better-auth/react"
import { twoFactorClient, magicLinkClient, customSessionClient } from "better-auth/client/plugins"
import type { auth } from "./config";

export const authClient = createAuthClient({
    /** ใช้ origin ปัจจุบัน เพื่อให้แต่ละเว็บเรียกผ่าน /api/auth rewrite ของตัวเอง */
    fetchOptions: {
        credentials: "include",
    },
    plugins: [
        twoFactorClient({
            onTwoFactorRedirect() {
                // จะ redirect ไปหน้า verify 2FA
                window.location.href = "/verify-2fa";
            },
        }),
        magicLinkClient(),
        customSessionClient<typeof auth>()
    ],
})
