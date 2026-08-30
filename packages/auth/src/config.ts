import { APIError, betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { twoFactor, magicLink, customSession, captcha, username } from "better-auth/plugins";
import clientPromise from "./mongodb";
import { socialProviders } from "./social-provider";
import type { User } from "better-auth/types";
import { v4 as uuidv4 } from "uuid";
import { authEvents } from "./handlers";
import { COOKIE_PREFIX } from "./constants";
import { normalizeUsername, usernameFromEmail } from "@workspace/core/utils";
import { DEFAULT_AUTH_SETTING } from "@workspace/core/config";

export { COOKIE_PREFIX } from "./constants";

const client = await clientPromise;
const db = client.db();
type AuthUserDocument = {
    _id: string;
    email: string;
    name?: string;
    isDelete?: boolean;
    updatedAt?: Date;
    username?: string;
};
const users = db.collection<AuthUserDocument>("user");
const settings = db.collection<{
    name: string;
    value?: { captcha?: { enabled?: boolean } };
}>("settings");
const isProduction = process.env.NODE_ENV === "production";
const authUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const cookieDomain = process.env.AUTH_COOKIE_DOMAIN ?? process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
const trustedOrigins = (
    process.env.AUTH_TRUSTED_ORIGINS ??
    "http://localhost:3000,http://localhost:3001"
)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
const turnstileHostnames = (process.env.TURNSTILE_HOSTNAMES ?? "")
    .split(",")
    .map((hostname) => hostname.trim())
    .filter(Boolean);

if (turnstileHostnames.length === 0) {
    throw new Error("TURNSTILE_HOSTNAMES must contain at least one hostname");
}

const captchaEndpoints = [
    "/sign-in/email",
    "/sign-in/username",
    "/sign-up/email",
    "/request-password-reset",
    "/two-factor/verify-totp",
    "/two-factor/verify-backup-code",
];
const turnstileCaptcha = captcha({
    provider: "cloudflare-turnstile",
    secretKey: process.env.TURNSTILE_SECRET_KEY!,
    expectedAction: "auth",
    allowedHostnames: turnstileHostnames,
    endpoints: captchaEndpoints,
});
const conditionalTurnstileCaptcha = {
    ...turnstileCaptcha,
    onRequest: async (
        request: Parameters<typeof turnstileCaptcha.onRequest>[0],
        ctx: Parameters<typeof turnstileCaptcha.onRequest>[1],
    ) => {
        const pathname = new URL(request.url).pathname;
        if (!captchaEndpoints.some((endpoint) => pathname.endsWith(endpoint))) {
            return;
        }

        const authSetting = await settings.findOne(
            { name: "auth_setting" },
            { projection: { "value.captcha.enabled": 1 } },
        );
        const captchaEnabled = authSetting?.value?.captcha?.enabled
            ?? DEFAULT_AUTH_SETTING.captcha.enabled;
        if (!captchaEnabled) {
            return;
        }

        return turnstileCaptcha.onRequest(request, ctx);
    },
};

export const auth = betterAuth({
    baseURL: authUrl,
    basePath: "/api/auth",
    rateLimit: {
        enabled: isProduction,
        window: 60,
        max: 100,
        customRules: {
            "/sign-in/email": { window: 10, max: 3 },
            "/sign-in/username": { window: 10, max: 3 },
            "/sign-up/email": { window: 60, max: 3 },
            "/request-password-reset": { window: 60, max: 3 },
        },
    },
    database: mongodbAdapter(db, { client }),
    socialProviders,
    appName: process.env.AUTH_APP_NAME ?? "VDOHide",
    trustedOrigins,
    plugins: [
        username({
            displayUsername: false,
            minUsernameLength: 3,
            maxUsernameLength: 30,
            usernameValidator: (value) => /^[a-zA-Z0-9]+$/.test(value),
            usernameNormalization: normalizeUsername,
        }),
        twoFactor({
            issuer: process.env.AUTH_APP_NAME ?? "VDOHide",
            otpOptions: {
                async sendOTP({ user, otp }) {
                    await authEvents.onSendOTP({ user, otp });
                },
            },
        }),
        magicLink({
            async sendMagicLink({ email, url }) {
                await authEvents.onSendMagicLink({ email, url });
            },
            expiresIn: 300, // 5 นาที
            disableSignUp: true,
        }),
        conditionalTurnstileCaptcha,
        customSession(async ({ user, session }) => {
            const userWithRole = user as User;

            // ซ่อนข้อมูล user ที่ไม่ต้องการ
            const hiddenUserFields = ['createdAt', 'updatedAt', 'emailVerified', 'country'];
            const safeUser = Object.fromEntries(
                Object.entries(userWithRole).filter(([key]) => !hiddenUserFields.includes(key))
            );

            // ซ่อนข้อมูล session ที่ไม่ต้องการ
            const hiddenSessionFields = ['token', 'ipAddress', 'userAgent', 'country', 'createdAt', 'updatedAt'];
            const safeSession = Object.fromEntries(
                Object.entries(session).filter(([key]) => !hiddenSessionFields.includes(key))
            );

            return {
                user: safeUser,
                session: safeSession,
            }
        }),
    ],
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        disableSignUp: false,
        autoSignInAfterSignUp: false,
        sendResetPassword: async ({ user, url }: { user: { email: string; name?: string }; url: string }) => {
            await authEvents.onSendResetPasswordEmail({ user, url });
        },
        // เมื่อมีการสมัครซ้ำด้วย email ที่มีอยู่แล้ว (better-auth จะ return 200 OK เพื่อป้องกัน user enumeration)
        onExistingUserSignUp: async ({ user }) => {
            console.log(`Duplicate sign-up attempt for: ${user.email}`);
        },
    },
    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: false,
        callbackURL: "/verify-email?from=verified",
        sendVerificationEmail: async ({ user, url }: { user: { email: string; name?: string }; url: string }) => {
            await authEvents.onSendVerificationEmail({ user, url });
        },
        afterEmailVerification: async (user) => {
            await authEvents.onUserSignUpSuccess({ user });
        },
    },
    advanced: {
        database: {
            generateId: () => uuidv4(),
        },
        ipAddress: {
            ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
            disableIpTracking: false
        },
        cookiePrefix: COOKIE_PREFIX,
        crossSubDomainCookies: {
            enabled: !!cookieDomain,
            domain: cookieDomain,
        },
        defaultCookieAttributes: {
            secure: authUrl.startsWith("https"),
            httpOnly: true,
            sameSite: "lax",
        },
    },
    account: {
        accountLinking: {
            enabled: true,
            allowDifferentEmails: false, // ป้องกันการเชื่อมบัญชีที่มีอีเมลต่างกัน
            updateUserInfoOnLink: false,
            allowUnlinkingAll: false,
            disableImplicitLinking: true,
            trustedProviders: []
        },
    },
    user: {
        additionalFields: {
            role: {
                type: "string",
                defaultValue: "user",
                required: false,
                input: false
            },
            country: {
                type: "string",
                required: false,
                input: false,
            },
            isDelete: {
                type: "boolean",
                required: false,
                input: false,
            },
        },
        deleteUser: {
            enabled: true,
            beforeDelete: async (user) => {
                await users.updateOne(
                    { _id: user.id },
                    { $set: { isDelete: true, updatedAt: new Date() } },
                );
                await authEvents.onUserDeleteSuccess({ user });
                // Throw error เพื่อหยุดการ hard delete
                throw new APIError("OK", {
                    message: "Account marked as deleted"
                });
            }
        }
        // changeEmail: {
        //     enabled: true,
        //     sendChangeEmailVerification: async ({ user, newEmail, url, token }, request) => {
        //         console.log(`Sending email verification to ${user.email}: ${url}`);
        //     }
        // }
    },
    session: {
        additionalFields: {
            country: {
                type: "string",
                required: false,
                input: false,
            },
            provider: {
                type: "string",
                required: false,
                input: false,
            },
        },
        expiresIn: 60 * 60 * 24 * 30,           // 30 วัน (เมื่อกด Remember Me)
        dontRememberMeExpiresIn: 60 * 60 * 24,  // 1 วัน (เมื่อไม่กด Remember Me)
        updateAge: 60 * 60 * 24,                // Refresh ทุก 1 วัน
        cookieCache: {
            enabled: true,
            maxAge: 60,
        },
        freshAge: 0,
    },
    hooks: {},
    databaseHooks: {
        session: {
            create: {
                before: async (session, ctx) => {
                    const country = (ctx!.request?.headers?.get('cf-ipcountry') || ctx!.request?.headers?.get('x-vercel-ip-country') || 'unknown').toLowerCase();
                    // ✅ ดึง provider จาก request path
                    const url = new URL(ctx!.request?.url || '');
                    const pathname = url.pathname;


                    let provider: string = 'unknown';
                    // ตรวจสอบ path เพื่อระบุ provider
                    if (pathname.includes('/sign-in/username')) {
                        provider = 'username';
                    } else if (pathname.includes('/sign-in/email') || pathname.includes('/sign-up/email')) {
                        provider = 'email';
                    } else if (pathname.includes('/callback/')) {
                        // /callback/google, /callback/github, etc.
                        const match = pathname.match(/\/callback\/([^/]+)/);
                        provider = match ? match[1] as string : 'oauth';
                    } else if (pathname.includes('/oauth2/callback/')) {
                        // สำหรับ generic OAuth
                        const match = pathname.match(/\/oauth2\/callback\/([^/]+)/);
                        provider = match ? match[1] as string : 'oauth';
                    } else if (pathname.includes('/magic-link/verify') || pathname.includes('/sign-in/magic-link')) {
                        provider = 'magic-link';
                    }

                    // แจ้งเตือน login ใหม่
                    const ip = ctx!.request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim()
                        || ctx!.request?.headers?.get('x-real-ip')
                        || 'unknown';
                    const userAgent = ctx!.request?.headers?.get('user-agent') || 'unknown';


                    await authEvents.onUserSignInSuccess({
                        ...session,
                        country: country,
                        provider: provider,
                        ip: ip,
                        userAgent: userAgent
                    });
                    return {
                        data: {
                            ...session,
                            country: country,
                            provider: provider
                        },
                    };
                },
            },
        },
        user: {
            create: {
                before: async (user, ctx) => {
                    const country = (ctx!.request?.headers?.get('cf-ipcountry') || ctx!.request?.headers?.get('x-vercel-ip-country') || 'unknown').toLowerCase();
                    const requestedUsername = "username" in user && typeof user.username === "string"
                        ? normalizeUsername(user.username)
                        : "";
                    const username = requestedUsername || await findAvailableUsername(user.email, user.id);

                    return {
                        data: {
                            ...user,
                            role: "user", // กำหนด role เป็น USER เสมอสำหรับผู้ใช้ใหม่
                            country: country,
                            username,
                        },
                    };
                },

                after: async (user, ctx) => {
                    try {
                        const url = new URL(ctx!.request?.url || '');
                        const isSocial = url.pathname.includes('/callback/');

                        if (isSocial) {
                            // สร้าง workspace สำหรับผู้ใช้ใหม่ที่มาจาก social login
                            await authEvents.onUserSignUpSuccess({ user });
                        }
                    } catch (error) {
                        console.error('Error in user.create.after hook:', error);
                        // ไม่ throw error เพื่อไม่ให้การสร้าง user ล้มเหลว
                    }
                },
            },
        },
        account: {
            create: {
                after: async (account) => {
                    try {
                        // ดึงข้อมูล user เพื่อส่ง email
                        const user = await users.findOne({ _id: account.userId });
                        await authEvents.onAccountLinked({
                            userId: account.userId,
                            provider: account.providerId,
                            account,
                            user: user ? { email: user.email, name: user.name ?? user.email } : undefined,
                        });
                    } catch (error) {
                        console.error('Error in account.create.after hook:', error);
                    }
                },
            },
            delete: {
                after: async (account) => {
                    try {
                        // ดึงข้อมูล user เพื่อส่ง email
                        const user = await users.findOne({ _id: account.userId });
                        await authEvents.onAccountUnlinked({
                            userId: account.userId,
                            provider: account.providerId,
                            account,
                            user: user ? { email: user.email, name: user.name ?? user.email } : undefined,
                        });
                    } catch (error) {
                        console.error('Error in account.delete.after hook:', error);
                    }
                },
            },
        },
    },
});

async function findAvailableUsername(email: string, userId?: string): Promise<string> {
    const base = usernameFromEmail(email);
    const seed = normalizeUsername(userId ?? uuidv4()).slice(-8) || "user";

    for (let attempt = 0; attempt < 100; attempt += 1) {
        const suffix = attempt === 0 ? "" : `${seed}${attempt > 1 ? attempt : ""}`;
        const candidate = `${base.slice(0, 30 - suffix.length)}${suffix}`;
        const existing = await users.findOne(
            { username: candidate },
            { projection: { _id: 1 } },
        );

        if (!existing) return candidate;
    }

    throw new Error("Unable to generate an available username");
}
