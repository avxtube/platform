import { registerAuthEvents } from "@workspace/auth";

function logAuthEvent(
    event: string,
    data: unknown,
    productionData: unknown = undefined,
) {
    if (process.env.NODE_ENV === "production") {
        console.info(`[Auth] ${event}`, productionData);
        return;
    }

    console.log(`[Auth] ${event}`, data);
}

function createEmailVerificationPageUrl(authVerificationUrl: string): string {
    const sourceUrl = new URL(authVerificationUrl);
    const token = sourceUrl.searchParams.get("token");
    const callbackURL = sourceUrl.searchParams.get("callbackURL");
    const callbackPath = callbackURL
        ? new URL(callbackURL, sourceUrl.origin).pathname
        : "/verify-email";
    const verificationPath = callbackPath.endsWith("/verify-email")
        ? callbackPath
        : "/verify-email";
    const pageUrl = new URL(verificationPath, sourceUrl.origin);

    if (token) pageUrl.searchParams.set("token", token);

    return pageUrl.toString();
}

export function registerApiAuthEvents() {
    registerAuthEvents({
        onSendOTP: async (data) => {
            logAuthEvent("onSendOTP", data, {
                userId: data.user.id,
                email: data.user.email,
            });
        },

        onSendMagicLink: async (data) => {
            logAuthEvent("onSendMagicLink", data, { email: data.email });
        },

        onSendWelcomeEmail: async (data) => {
            logAuthEvent("onSendWelcomeEmail", data, {
                userId: data.user.id,
                email: data.user.email,
            });
        },

        onSendResetPasswordEmail: async (data) => {
            logAuthEvent("onSendResetPasswordEmail", data, {
                userId: data.user.id,
                email: data.user.email,
            });
        },

        onSendVerificationEmail: async (data) => {
            const verificationData = {
                ...data,
                url: createEmailVerificationPageUrl(data.url),
            };

            logAuthEvent("onSendVerificationEmail", verificationData, {
                userId: data.user.id,
                email: data.user.email,
            });
        },

        onUserSignUpSuccess: async (data) => {
            logAuthEvent("onUserSignUpSuccess", data, {
                userId: data.user.id,
                email: data.user.email,
            });
        },

        onUserSignInSuccess: async (data) => {
            logAuthEvent("onUserSignInSuccess", data, {
                userId: data.userId,
                country: data.country,
                provider: data.provider,
            });
        },

        onUserSignOutSuccess: async (data) => {
            logAuthEvent("onUserSignOutSuccess", data, {
                userId: data.user.id,
                email: data.user.email,
            });
        },

        onUserDeleteSuccess: async (data) => {
            logAuthEvent("onUserDeleteSuccess", data, {
                userId: data.user.id,
                email: data.user.email,
            });
        },

        onAccountLinked: async (data) => {
            logAuthEvent("onAccountLinked", data, {
                userId: data.userId,
                provider: data.provider,
            });
        },

        onAccountUnlinked: async (data) => {
            logAuthEvent("onAccountUnlinked", data, {
                userId: data.userId,
                provider: data.provider,
            });
        },
    });
}
